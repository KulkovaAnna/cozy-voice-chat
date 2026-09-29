import * as mime from 'mime-types';
import type { NextFunction, Request, Response } from 'express';
import eventBus from '../../../utils/event-bus';
import type FileManagerService from './file-manager.service';
import type { HttpError } from '../../../types';

export default class FileManagerController {
  private fileManagerService: FileManagerService;

  constructor(fileManagerService: FileManagerService) {
    this.fileManagerService = fileManagerService;
  }

  async uploadFile(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const senderIp = req.socket.remoteAddress ?? '';
      const callId = req.body?.callId as string | undefined;
      if (!callId) {
        const err: HttpError = new Error('Не указан callId');
        err.status = 400;
        throw err;
      }
      if (!req.file) {
        const err: HttpError = new Error('Файл не загружен');
        err.status = 400;
        throw err;
      }

      const result = await this.fileManagerService.uploadFile(
        req.file,
        senderIp,
        callId,
      );

      eventBus.emit('file:uploaded', {
        fileId: result.fileId,
        originalName: req.file.originalname,
        size: req.file.size,
        callId,
        senderIp,
      });

      res.status(201).json(result);
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
}
