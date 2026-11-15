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
  UploadedFile,
  ViewResult,
} from './file-manager.types';
import { MAX_ATTACHMENTS } from './file-manager.types';
import type { FileAttachment, HttpError } from '../../../types';

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

  /** Путь к JSON-файлу с метаданными профиля */
  #metadataPath = path.join(__dirname, './uploads/profile/metadata.json');

  private callManager: CallManagerLike;
  private lobbyManager: LobbyManagerLike;

  constructor(callManager: CallManagerLike, lobbyManager: LobbyManagerLike) {
    // Создаём папки, если их нет
    fs.promises.mkdir(this.#chatDir, { recursive: true }).catch(console.error);
    fs.promises
      .mkdir(this.#profileDir, { recursive: true })
      .catch(console.error);
    // Загружаем метаданные профиля из JSON при старте
    this.#loadMetadata();
    this.callManager = callManager;
    this.lobbyManager = lobbyManager;
  }

  /** Загружает метаданные файлов профиля из JSON */
  #loadMetadata(): void {
    try {
      const raw = fs.readFileSync(this.#metadataPath, 'utf-8');
      const data: Record<string, ProfileFileMetadata> = JSON.parse(raw);
      for (const [fileId, meta] of Object.entries(data)) {
        this.#profileFileMetadata.set(fileId, meta);
      }
    } catch {
      // Файл отсутствует или повреждён — начинаем с пустой карты
    }
  }

  /** Сохраняет метаданные файлов профиля в JSON */
  #saveMetadata(): void {
    const data: Record<string, ProfileFileMetadata> = {};
    for (const [fileId, meta] of this.#profileFileMetadata.entries()) {
      data[fileId] = meta;
    }
    fs.writeFileSync(
      this.#metadataPath,
      JSON.stringify(data, null, 2),
      'utf-8',
    );
  }

  /**
   * Находит отправителя по clientId (точнее, чем IP: с одного IP может быть
   * несколько вкладок). IP дополнительно сверяется, чтобы нельзя было
   * загрузить файл от имени чужого клиента.
   */
  #resolveSender(senderIp: string, clientId: string) {
    const byId = clientId
      ? this.lobbyManager.getMemberById(clientId)
      : undefined;

    if (byId) {
      if (senderIp && byId.ip !== senderIp) {
        const error: HttpError = new Error(
          'Нельзя загружать файлы от имени другого клиента',
        );
        error.status = 403;
        throw error;
      }
      return byId;
    }

    const byIp = this.lobbyManager.getMemberByIp(senderIp);
    if (!byIp) {
      const error: HttpError = new Error('Отправитель не найден');
      error.status = 404;
      throw error;
    }
    return byIp;
  }

  /** Откатывает уже сохранённые файлы и временные файлы multer */
  async #rollbackAttachments(
    files: UploadedFile[],
    saved: Array<{ id: string; meta: FileMetadata }>,
  ): Promise<void> {
    await Promise.all([
      ...files.map((file) =>
        fs.promises.unlink(file.path).catch(() => undefined),
      ),
      ...saved.map(({ meta }) =>
        fs.promises.unlink(meta.path).catch(() => undefined),
      ),
    ]);
    saved.forEach(({ id }) => this.#fileMetadata.delete(id));
  }

  /**
   * Загружает файлы, которые затем прикрепляются к сообщению по ID.
   * Файлы не рассылаются отдельным событием: клиент получает их ID,
   * отправляет их вместе с текстом в call::send-message, а сервер
   * помечает файлы как прикреплённые (claimAttachments).
   */
  async uploadAttachments(
    files: UploadedFile[],
    senderIp: string,
    callId: string,
    clientId: string,
  ): Promise<FileAttachment[]> {
    if (!callId) {
      const error: HttpError = new Error('Не указан callId');
      error.status = 400;
      throw error;
    }

    if (!clientId) {
      const error: HttpError = new Error('Не указан clientId');
      error.status = 400;
      throw error;
    }

    if (files.length === 0) {
      const error: HttpError = new Error('Файлы не загружены');
      error.status = 400;
      throw error;
    }

    if (files.length > MAX_ATTACHMENTS) {
      const error: HttpError = new Error(
        `За один раз можно прикрепить не больше ${MAX_ATTACHMENTS} файлов`,
      );
      error.status = 400;
      throw error;
    }

    const sender = this.#resolveSender(senderIp, clientId);
    const call = this.callManager.getCallById(callId);
    if (!call) {
      const error: HttpError = new Error('Звонок не найден');
      error.status = 404;
      throw error;
    }

    if (!call.members.some((member) => member.client.id === sender.id)) {
      const error: HttpError = new Error(
        'Отправитель не является участником звонка',
      );
      error.status = 403;
      throw error;
    }

    const saved: Array<{ id: string; meta: FileMetadata }> = [];

    try {
      for (const file of files) {
        const fileId = uuidv4();
        const ext = path.extname(file.originalname);
        const saveName = `${fileId}${ext}`;
        const savePath = path.join(this.#chatDir, saveName);

        await fs.promises.rename(file.path, savePath);

        const meta: FileMetadata = {
          path: savePath,
          originalName: file.originalname,
          senderId: sender.id,
          callId,
          createdAt: Date.now(),
          size: file.size,
          claimed: false,
        };
        this.#fileMetadata.set(fileId, meta);
        saved.push({ id: fileId, meta });
      }
    } catch (error) {
      // Частично загруженное сообщение не нужно: убираем всё
      await this.#rollbackAttachments(files, saved);
      throw error;
    }

    return saved.map(({ id, meta }) => ({
      id,
      fileName: meta.originalName,
      fileSize: meta.size,
    }));
  }

  /**
   * Помечает файлы как прикреплённые к сообщению.
   * Сначала валидируется весь список, и только потом файлы помечаются —
   * частично прикреплённых сообщений быть не должно.
   */
  claimAttachments(
    fileIds: string[],
    senderId: string,
    callId: string,
  ): FileAttachment[] {
    if (fileIds.length === 0) return [];

    if (fileIds.length > MAX_ATTACHMENTS) {
      const error: HttpError = new Error(
        `К сообщению можно прикрепить не больше ${MAX_ATTACHMENTS} файлов`,
      );
      error.status = 400;
      throw error;
    }

    if (new Set(fileIds).size !== fileIds.length) {
      const error: HttpError = new Error(
        'Файлы не должны повторяться в одном сообщении',
      );
      error.status = 400;
      throw error;
    }

    const metas = fileIds.map((fileId) => {
      const meta = this.#fileMetadata.get(fileId);
      if (!meta) {
        const error: HttpError = new Error('Файл не найден или уже удалён');
        error.status = 404;
        throw error;
      }

      if (meta.senderId !== senderId) {
        const error: HttpError = new Error('Нельзя прикрепить чужой файл');
        error.status = 403;
        throw error;
      }

      if (meta.callId !== callId) {
        const error: HttpError = new Error(
          'Файл принадлежит другому звонку',
        );
        error.status = 403;
        throw error;
      }

      if (meta.claimed) {
        const error: HttpError = new Error(
          'Файл уже прикреплён к сообщению',
        );
        error.status = 409;
        throw error;
      }

      return meta;
    });

    metas.forEach((meta) => {
      meta.claimed = true;
    });

    return fileIds.map((fileId, index) => ({
      id: fileId,
      fileName: metas[index].originalName,
      fileSize: metas[index].size,
    }));
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
    await this.#saveMetadata();

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
    await this.#saveMetadata();
  }

  /**
   * Возвращает поток для скачивания файла без удаления.
   */
  async downloadFile(fileId: string): Promise<DownloadResult> {
    const meta = this.#fileMetadata.get(fileId);
    if (!meta) {
      const error: HttpError = new Error('Файл не найден или уже удалён');
      error.status = 404;
      throw error;
    }

    const stream = fs.createReadStream(meta.path);

    return {
      stream,
      filename: meta.originalName,
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
   * Удаляет файлы конкретного звонка/комнаты.
   * Нужен, чтобы завершение одной комнаты не стирало файлы параллельной.
   */
  async cleanCallFiles(callId: string): Promise<void> {
    const entries = Array.from(this.#fileMetadata.entries()).filter(
      ([, meta]) => meta.callId === callId,
    );

    await Promise.all(
      entries.map(async ([fileId, meta]) => {
        this.#fileMetadata.delete(fileId);
        await fs.promises.unlink(meta.path).catch(console.error);
      }),
    );
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
