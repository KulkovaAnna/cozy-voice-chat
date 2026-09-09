const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const LobbyManager = require('../../../signaling-v2/LobbyManager');
const CallManager = require('../../../signaling-v2/CallManager');
const eventBus = require('../../../utils/event-bus');

class FileManagerService {
  /** @type {Map<string, Object>} */
  #fileMetadata = new Map(); // fileId -> { path, originalName, senderId, receiverId, createdAt }

  // Папка для хранения файлов (создаём при инициализации)
  #uploadDir = path.join(__dirname, './uploads');

  /**
   * @param {CallManager} callManager
   * @param {LobbyManager} lobbyManager
   *  */
  constructor(callManager, lobbyManager) {
    // Создаём папку, если её нет
    fs.promises
      .mkdir(this.#uploadDir, { recursive: true })
      .catch(console.error);
    this.callManager = callManager;
    this.lobbyManager = lobbyManager;
  }

  /**
   * Загружает файл и сохраняет метаданные.
   * @param {Express.Multer.File} file - объект файла от multer
   * @param {string} senderIp - IP отправителя
   * @param {string} callId - идентификатор звонка
   * @returns {Promise<{ fileId: string }>}
   */
  async uploadFile(file, senderIp, callId) {
    const sender = this.lobbyManager.getMemberByIp(senderIp);
    const call = this.callManager.getCallById(callId);
    if (!sender) {
      const error = new Error('Отправитель не найден');
      error.status = 404;
      throw error;
    }

    if (!call) {
      const error = new Error('Звонок не найден');
      error.status = 404;
      throw error;
    }

    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    const saveName = `${fileId}${ext}`;
    const savePath = path.join(this.#uploadDir, saveName);

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
   * Скачивает файл, проверяя права доступа, и удаляет после отправки.
   * @param {string} fileId
   * @returns {Promise<{ stream: NodeJS.ReadableStream, filename: string, path: string }>}
   */
  async downloadFile(fileId) {
    const meta = this.#fileMetadata.get(fileId);
    if (!meta) {
      const error = new Error('Файл не найден или уже удалён');
      error.status = 404;
      throw error;
    }

    // Создаём поток для чтения файла
    const stream = fs.createReadStream(meta.path);
    // После отправки (или ошибки) удаляем файл и метаданные
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
   * @param {string} fileId
   * @returns {Promise<{ stream: fs.ReadStream, meta: Object }>}
   */
  async getFileStream(fileId) {
    const meta = this.#fileMetadata.get(fileId);
    if (!meta) {
      const err = new Error('Файл не найден или уже удалён');
      err.status = 404;
      throw err;
    }

    const stream = fs.createReadStream(meta.path);
    return { stream, meta };
  }
}

module.exports = FileManagerService;
