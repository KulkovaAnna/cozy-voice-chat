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

    setInterval(() => this.#cleanupOldFiles(), 10 * 60 * 1000);
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
   * @param {string} userIp - кто запрашивает скачивание
   * @returns {Promise<{ stream: NodeJS.ReadableStream, filename: string, path: string }>}
   */
  async downloadFile(fileId, userIp) {
    const lobby = LobbyManager.getInstance();
    const meta = this.#fileMetadata.get(fileId);
    if (!meta) {
      const error = new Error('Файл не найден или уже удалён');
      error.status = 404;
      throw error;
    }
    const user = lobby.getMemberByIp(userIp);
    // Проверяем, что скачивает именно получатель
    if (meta.receiverId !== user.id) {
      const error = new Error('У вас нет прав на скачивание этого файла');
      error.status = 403;
      +3;
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
   * Удаляет файлы, которые были загружены более 10 минут назад и не скачаны.
   */
  #cleanupOldFiles() {
    const now = Date.now();
    const MAX_AGE = 10 * 60 * 1000; // 10 минут
    for (const [fileId, meta] of this.#fileMetadata.entries()) {
      if (now - meta.createdAt > MAX_AGE) {
        this.#fileMetadata.delete(fileId);
        fs.unlink(meta.path).catch(console.error);
        console.log(`Удалён старый файл ${fileId}`);
        eventBus.emit('file:deleted', {
          fileId: result.fileId,
          originalName: req.file.originalname,
          size: req.file.size,
          callId,
        });
      }
    }
  }
}

module.exports = FileManagerService;
