const FileManagerService = require('./file-manager.service');
const eventBus = require('../../../utils/event-bus');

class FileManagerController {
  /** @type {FileManagerService} */
  fileManagerService;

  constructor(/** @type {FileManagerService} */ fileManagerService) {
    this.fileManagerService = fileManagerService;
  }

  async uploadFile(req, res, next) {
    try {
      const senderIp = req.socket.remoteAddress;
      const { receiverId } = req.body;
      if (!receiverId) {
        const err = new Error('Не указан receiverId');
        err.status = 400;
        throw err;
      }
      if (!req.file) {
        const err = new Error('Файл не загружен');
        err.status = 400;
        throw err;
      }

      const result = await this.fileManagerService.uploadFile(
        req.file,
        senderIp,
        receiverId,
      );

      eventBus.emit('file:uploaded', {
        fileId: result.fileId,
        originalName: req.file.originalname,
        size: req.file.size,
        receiverId,
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async downloadFile(req, res, next) {
    try {
      const { fileId } = req.params;
      const userIp = req.socket.remoteAddress;

      const { stream, filename, cleanup } =
        await this.fileManagerService.downloadFile(fileId, userIp);

      // Устанавливаем заголовки для скачивания
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(filename)}"`,
      );
      // Отправляем поток
      stream.pipe(res);

      // После завершения ответа (или при ошибке) чистим файл
      const onFinish = () => {
        cleanup();
        res.off('finish', onFinish);
        res.off('error', onFinish);
      };
      res.on('finish', onFinish);
      res.on('error', onFinish);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = FileManagerController;
