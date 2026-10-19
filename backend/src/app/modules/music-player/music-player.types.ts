/** Статус музыкального плеера */
export type MusicPlayerStatus = 'idle' | 'playing' | 'paused';

/** Метаданные трека, видимые участникам звонка */
export interface MusicTrack {
  /** URL страницы источника (YouTube, SoundCloud и т.д.) */
  url: string;
  /** Название трека */
  title: string;
  /** Исполнитель / канал */
  uploader?: string | null;
  /** Длительность в секундах */
  duration?: number | null;
}

/**
 * Элемент очереди воспроизведения.
 * Название усекается на стороне сервиса, чтобы очередь из
 * MAX_QUEUE_SIZE элементов влезала в лимит размера WS-сообщения.
 */
export type MusicQueueItem = MusicTrack;

/** Данные, сохраняемые при запуске трека */
export interface StartTrackPayload extends MusicTrack {
  /** Прямая ссылка на аудио-поток (не рассылается участникам) */
  directUrl?: string | null;
}

/** Состояние музыкального плеера */
export interface MusicState {
  /** Статус плеера */
  status: MusicPlayerStatus;
  /** Текущий трек */
  track: MusicTrack | null;
  /** Относительный URL стрима на сервере */
  streamUrl: string | null;
  /** Очередь воспроизведения (пустой массив, если трек запущен без очереди) */
  queue: MusicQueueItem[];
  /** Индекс текущего трека в очереди (-1, если очереди нет) */
  queueIndex: number;
}
