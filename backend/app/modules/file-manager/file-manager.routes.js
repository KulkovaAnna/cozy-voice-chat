const express = require('express');
const multer = require('multer');
const FileManagerController = require('./file-manager.controller');

const upload = multer({ dest: 'uploads/temp/' });

class FileManagerRoutes {
  /** @type {FileManagerController} */
  fileManagerController;

  static BASE_URL = '/files';
  constructor(/** @type {FileManagerController} */ fileManagerController) {
    this.fileManagerController = fileManagerController;
  }

  getRouter() {
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

    return router;
  }
}

module.exports = FileManagerRoutes;
