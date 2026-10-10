import express, { type Router } from 'express';
import multer from 'multer';
import type FileManagerController from './file-manager.controller';

const upload = multer({ dest: 'uploads/temp/' });

// Загрузка файлов профиля: только изображения, максимум 1 МБ
const MAX_PROFILE_FILE_SIZE = 1024 * 1024;
const profileUpload = multer({
  dest: 'uploads/temp/',
  limits: { fileSize: MAX_PROFILE_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Файл профиля должен быть изображением'));
    }
  },
});

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

    // Файлы профиля (аватары/фоны карточки) — хранятся постоянно
    router.post(
      '/profile/avatar',
      profileUpload.single('file'),
      this.fileManagerController.uploadProfileFile.bind(
        this.fileManagerController,
      ),
    );
    router.get(
      '/profile/:fileId',
      this.fileManagerController.viewProfileFile.bind(
        this.fileManagerController,
      ),
    );
    router.delete(
      '/profile/:fileId',
      this.fileManagerController.deleteProfileFile.bind(
        this.fileManagerController,
      ),
    );

    return router;
  }
}
