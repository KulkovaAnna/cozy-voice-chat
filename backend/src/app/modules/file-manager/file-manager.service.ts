import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Request } from 'express';
import type { CallManagerLike, LobbyManagerLike } from './file-manager.types';
import type {
  DownloadResult,
  FileMetadata,
  ProfileFileMetadata,
  ProfileUploadResult,
  ProfileViewResult,
  UploadResult,
  ViewResult,
} from './file-manager.types';
import type { HttpError } from '../../../types';

type MulterFile = NonNullable<Request['file']>;

export default class FileManagerService {
  /** fileId -> метаданные файла (файлы звонка) */
  #fileMetadata: Map<string, FileMetadata> = new Map();

  /** fileId -> метаданные файла профиля (аватары/фоны, хранятся постоянно) */
  #profileFileMetadata: Map<string, ProfileFileMetadata> = new Map();

  /** Папка для файлов звонков (удаляются после завершения звонка) */
  #chatDir = path.join(__dirname, './uploads/chat');

  /** Папка для файлов профиля (аватары/фоны карточки) */
  #profileDir = path.join(__dirname, './uploads/profile');

  private callManager: CallManagerLike;
  private lobbyManager: LobbyManagerLike;

  constructor(callManager: CallManagerLike, lobbyManager: LobbyManagerLike) {
    // Создаём папки, если их нет
    fs.promises.mkdir(this.#chatDir, { recursive: true }).catch(console.error);
    fs.promises
      .mkdir(this.#profileDir, { recursive: true })
      .catch(console.error);
    this.callManager = callManager;
    this.lobbyManager = lobbyManager;
  }

  /**
   * Загружает файл и сохраняет метаданные.
   * @param file - объект файла от multer
   * @param senderIp - IP отправителя
   * @param callId - идентификатор звонка
   */
  async uploadFile(
    file: MulterFile,
    senderIp: string,
    callId: string,
  ): Promise<UploadResult> {
    const sender = this.lobbyManager.getMemberByIp(senderIp);
    const call = this.callManager.getCallById(callId);
    if (!sender) {
      const error: HttpError = new Error('Отправитель не найден');
      error.status = 404;
      throw error;
    }

    if (!call) {
      const error: HttpError = new Error('Звонок не найден');
      error.status = 404;
      throw error;
    }

    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    const saveName = `${fileId}${ext}`;
    const savePath = path.join(this.#chatDir, saveName);

    await fs.promises.rename(file.path, savePath);

    this.#fileMetadata.set(fileId, {
      path: savePath,
      originalName: file.originalname,
      senderId: sender.id,
      callId,
      createdAt: Date.now(),
    });

    return { fileId };
  }

  /**
   * Загружает файл профиля (аватар или фон карточки).
   * Файлы профиля хранятся постоянно и не удаляются после звонка.
   * @param file - объект файла от multer
   * @param senderIp - IP владельца файла (клиент должен быть в лобби)
   */
  async uploadProfileFile(
    file: MulterFile,
    senderIp: string,
  ): Promise<ProfileUploadResult> {
    const owner = this.lobbyManager.getMemberByIp(senderIp);
    if (!owner) {
      const error: HttpError = new Error('Отправитель не найден');
      error.status = 404;
      throw error;
    }

    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    const saveName = `${fileId}${ext}`;
    const savePath = path.join(this.#profileDir, saveName);

    await fs.promises.rename(file.path, savePath);

    this.#profileFileMetadata.set(fileId, {
      path: savePath,
      originalName: file.originalname,
      ownerId: owner.id,
      createdAt: Date.now(),
    });

    return { fileId };
  }

  /**
   * Возвращает поток для чтения файла профиля без удаления.
   */
  async getProfileFile(fileId: string): Promise<ProfileViewResult> {
    const meta = this.#profileFileMetadata.get(fileId);
    if (!meta) {
      const err: HttpError = new Error('Файл профиля не найден');
      err.status = 404;
      throw err;
    }

    const stream = fs.createReadStream(meta.path);
    return { stream, meta };
  }

  /**
   * Удаляет файл профиля с диска и из метаданных.
   */
  async deleteProfileFile(fileId: string): Promise<void> {
    const meta = this.#profileFileMetadata.get(fileId);
    if (!meta) {
      const err: HttpError = new Error('Файл профиля не найден');
      err.status = 404;
      throw err;
    }

    await fs.promises.unlink(meta.path).catch(console.error);
    this.#profileFileMetadata.delete(fileId);
  }

  /**
   * Скачивает файл, проверяя права доступа, и удаляет после отправки.
   */
  async downloadFile(fileId: string): Promise<DownloadResult> {
    const meta = this.#fileMetadata.get(fileId);
    if (!meta) {
      const error: HttpError = new Error('Файл не найден или уже удалён');
      error.status = 404;
      throw error;
    }

    // Создаём поток для чтения файла
    const stream = fs.createReadStream(meta.path);
    const cleanup = () => {
      this.#fileMetadata.delete(fileId);
      fs.promises.unlink(meta.path).catch(console.error);
    };

    // Возвращаем информацию, а удаление будет выполнено в контроллере после завершения ответа
    return {
      stream,
      filename: meta.originalName,
      path: meta.path,
      cleanup,
    };
  }

  /**
   * Возвращает поток для чтения файла без удаления.
   */
  async getFileStream(fileId: string): Promise<ViewResult> {
    const meta = this.#fileMetadata.get(fileId);
    if (!meta) {
      const err: HttpError = new Error('Файл не найден или удалён');
      err.status = 404;
      throw err;
    }

    const stream = fs.createReadStream(meta.path);
    return { stream, meta };
  }

  /**
   * Удаляет только файлы звонков (папка chat/).
   * Файлы профиля (папка profile/) не затрагиваются.
   */
  async cleanDownloads(): Promise<void> {
    const entries = await fs.promises
      .readdir(this.#chatDir, { withFileTypes: true })
      .catch((err) => {
        console.error('cleanDownloads readdir error:', err);
        return [] as fs.Dirent[];
      });

    await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map((entry) =>
          fs.promises
            .unlink(path.join(this.#chatDir, entry.name))
            .catch(console.error),
        ),
    );

    this.#fileMetadata.clear();
  }
}
