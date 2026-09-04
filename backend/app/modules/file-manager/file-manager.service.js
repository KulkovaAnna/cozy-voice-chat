const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const LobbyManager = require('../../../signaling-v2/LobbyManager');

class FileManagerService {
  /** @type {Map<string, Object>} */
  #fileMetadata = new Map(); // fileId -> { path, originalName, senderId, receiverId, createdAt }

  // Папка для хранения файлов (создаём при инициализации)
  #uploadDir = path.join(__dirname, './uploads');

  constructor() {
    // Создаём папку, если её нет
    fs.promises
      .mkdir(this.#uploadDir, { recursive: true })
      .catch(console.error);
  }

  /**
   * Загружает файл и сохраняет метаданные.
   * @param {Express.Multer.File} file - объект файла от multer
   * @param {string} senderIp - IP отправителя
   * @param {string} receiverId - идентификатор получателя
   * @returns {Promise<{ fileId: string }>}
   */
  async uploadFile(file, senderIp, receiverId) {
    const lobby = LobbyManager.getInstance();
    const sender = lobby.getMemberByIp(senderIp);
    const receiver = lobby.getMemberById(receiverId);
    if (!sender || !receiver) {
      const error = new Error('Отправитель или получатель не найдены в лобби');
      error.status = 404;
      throw error;
    }

    // Генерируем уникальный ID для файла
    const fileId = uuidv4();
    // Сохраняем файл с новым именем, чтобы избежать коллизий
    const ext = path.extname(file.originalname);
    const saveName = `${fileId}${ext}`;
    const savePath = path.join(this.#uploadDir, saveName);

    // Переносим файл из временной папки multer в постоянную
    await fs.promises.rename(file.path, savePath);

    // Сохраняем метаданные
    this.#fileMetadata.set(fileId, {
      path: savePath,
      originalName: file.originalname,
      senderId: sender.id,
      receiverId,
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
}

module.exports = FileManagerService;
