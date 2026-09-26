import express, { type Router } from 'express';
import multer from 'multer';
import type FileManagerController from './file-manager.controller';

const upload = multer({ dest: 'uploads/temp/' });

export default class FileManagerRoutes {
  static BASE_URL = '/files';

  private fileManagerController: FileManagerController;

  constructor(fileManagerController: FileManagerController) {
    this.fileManagerController = fileManagerController;
  }

  getRouter(): Router {
    const router = express.Router();
    router.post(
      '/upload',
      upload.single('file'),
      this.fileManagerController.uploadFile.bind(this.fileManagerController),
    );
    router.get(
      '/download/:fileId',
      this.fileManagerController.downloadFile.bind(this.fileManagerController),
    );
    router.get(
      '/view/:fileId',
      this.fileManagerController.viewFile.bind(this.fileManagerController),
    );

    return router;
  }
}
