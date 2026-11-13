import * as mime from 'mime-types';
import type { NextFunction, Request, Response } from 'express';
import type FileManagerService from './file-manager.service';
import type { HttpError } from '../../../types';

export default class FileManagerController {
  private fileManagerService: FileManagerService;

  constructor(fileManagerService: FileManagerService) {
    this.fileManagerService = fileManagerService;
  }

  /**
   * Загрузка файлов для последующего прикрепления к сообщению.
   * POST /files/attachments
   */
  async uploadAttachments(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const senderIp = req.socket.remoteAddress ?? '';
      const callId =
        typeof req.body?.callId === 'string' ? req.body.callId : '';
      const clientId =
        typeof req.body?.clientId === 'string' ? req.body.clientId : '';
      const files = Array.isArray(req.files) ? req.files : [];

      if (!callId) {
        const err: HttpError = new Error('Не указан callId');
        err.status = 400;
        throw err;
      }
      if (!clientId) {
        const err: HttpError = new Error('Не указан clientId');
        err.status = 400;
        throw err;
      }
      if (files.length === 0) {
        const err: HttpError = new Error('Файлы не загружены');
        err.status = 400;
        throw err;
      }

      const attachments = await this.fileManagerService.uploadAttachments(
        files,
        senderIp,
        callId,
        clientId,
      );

      res.status(201).json({ files: attachments });
    } catch (err) {
      next(err);
    }
  }

  async downloadFile(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const fileId = String(req.params.fileId);
      const userIp = req.socket.remoteAddress;

      const { stream, filename } =
        await this.fileManagerService.downloadFile(fileId);

      // Устанавливаем заголовки для скачивания
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(filename)}"`,
      );
      // Отправляем поток
      stream.pipe(res);

      const onFinish = () => {
        res.off('finish', onFinish);
        res.off('error', onFinish);
      };
      res.on('finish', onFinish);
      res.on('error', onFinish);
      void userIp;
    } catch (err) {
      next(err);
    }
  }

  /**
   * Просмотр файла
   * GET /files/view
   */
  async viewFile(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const fileId = String(req.params.fileId);

      const { stream, meta } =
        await this.fileManagerService.getFileStream(fileId);

      const contentType =
        mime.lookup(meta.originalName) || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);

      // Отправляем поток
      stream.pipe(res);

      // Если нужно обработать ошибки потока
      stream.on('error', (err) => {
        next(err);
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Загрузка файла профиля (аватар / фон карточки)
   * POST /files/profile/avatar
   */
  async uploadProfileFile(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const senderIp = req.socket.remoteAddress ?? '';
      if (!req.file) {
        const err: HttpError = new Error('Файл не загружен');
        err.status = 400;
        throw err;
      }

      const result = await this.fileManagerService.uploadProfileFile(
        req.file,
        senderIp,
      );

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Просмотр файла профиля (без удаления)
   * GET /files/profile/:fileId
   */
  async viewProfileFile(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const fileId = String(req.params.fileId);

      const { stream, meta } =
        await this.fileManagerService.getProfileFile(fileId);

      const contentType =
        mime.lookup(meta.originalName) || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      // Файлы профиля неизменяемы — разрешаем кэширование
      res.setHeader('Cache-Control', 'public, max-age=86400');

      stream.pipe(res);

      stream.on('error', (err) => {
        next(err);
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Удаление файла профиля
   * DELETE /files/profile/:fileId
   */
  async deleteProfileFile(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const fileId = String(req.params.fileId);
      await this.fileManagerService.deleteProfileFile(fileId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
