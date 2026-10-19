import type {
  MusicPlayerStatus,
  MusicQueueItem,
  MusicState,
  MusicTrack,
  StartTrackPayload,
} from './music-player.types';

/**
 * Максимальная длина названия трека в очереди.
 * Очередь рассылается всем участникам одним WS-сообщением, поэтому
 * названия держим короткими — 50 элементов гарантированно вписываются
 * в MAX_MESSAGE_SIZE (16 КБ).
 */
const MAX_QUEUE_TITLE_LENGTH = 120;

/** Максимальное число треков в очереди */
export const MAX_QUEUE_SIZE = 50;

/** Путь стрима на сервере, который использует фронтенд */
const STREAM_PATH = '/music/stream';

function idleState(): MusicState {
  return {
    status: 'idle',
    track: null,
    streamUrl: null,
    queue: [],
    queueIndex: -1,
  };
}

class MusicPlayerService {
  #state: MusicState = idleState();

  /**
   * Прямые ссылки на аудио-поток по индексу очереди.
   * Ссылки YouTube протухают, поэтому получаем их лениво —
   * только для трека, который стал текущим.
   */
  #directUrls = new Map<number, string>();

  /** Текущее состояние плеера (копия) */
  get state(): MusicState {
    return { ...this.#state, queue: [...this.#state.queue] };
  }

  /** Текущий статус */
  get status(): MusicPlayerStatus {
    return this.#state.status;
  }

  /** Текущий трек */
  get track(): MusicTrack | null {
    return this.#state.track;
  }

  /** URL потока для стриминга */
  get streamUrl(): string | null {
    return this.#state.streamUrl;
  }

  /** Очередь воспроизведения */
  get queue(): MusicQueueItem[] {
    return [...this.#state.queue];
  }

  /** Индекс текущего трека (-1, если очереди нет) */
  get queueIndex(): number {
    return this.#state.queueIndex;
  }

  /** Прямая ссылка на поток текущего трека */
  get directUrl(): string | null {
    return this.#directUrls.get(this.#state.queueIndex) ?? null;
  }

  /** Прямая ссылка на поток трека с указанным индексом */
  directUrlFor(index: number): string | null {
    return this.#directUrls.get(index) ?? null;
  }

  /**
   * Сохраняет/сбрасывает прямую ссылку для текущего трека
   * @param url — прямая ссылка или null для сброса кэша
   */
  setDirectUrl(url: string | null): void {
    this.setDirectUrlFor(this.#state.queueIndex, url);
  }

  /** Сохраняет/сбрасывает прямую ссылку для трека с указанным индексом */
  setDirectUrlFor(index: number, url: string | null): void {
    if (index < 0) return;

    if (url) {
      this.#directUrls.set(index, url);
    } else {
      this.#directUrls.delete(index);
    }
  }

  /**
   * Заменяет очередь и ставит выбранный трек текущим.
   * Статус — 'paused': браузеры блокируют autoplay без жеста пользователя,
   * воспроизведение стартует по кнопке ▶.
   * @param tracks — треки плейлиста (обрезаются до MAX_QUEUE_SIZE)
   * @param startIndex — индекс стартового трека
   */
  startQueue(tracks: MusicTrack[], startIndex = 0): boolean {
    const queue = this.#normalizeQueue(tracks);
    if (queue.length === 0) return false;

    const index = this.#clampIndex(startIndex, queue.length);

    this.#state = {
      status: 'paused',
      track: queue[index],
      streamUrl: STREAM_PATH,
      queue,
      queueIndex: index,
    };
    this.#directUrls.clear();

    return true;
  }

  /**
   * Готовит один трек к воспроизведению — обёртка над startQueue.
   * @param payload — метаданные трека и прямая ссылка на поток
   */
  startTrack(payload: StartTrackPayload): void {
    const { directUrl, ...track } = payload;

    this.startQueue([track], 0);

    if (directUrl) {
      this.setDirectUrl(directUrl);
    }
  }

  /**
   * Переход к следующему треку. За последним треком плеер останавливается.
   * @returns новый текущий трек или null, если очередь на исходе
   */
  next(): MusicQueueItem | null {
    const { queue, queueIndex } = this.#state;

    if (queue.length === 0) return null;
    if (queueIndex >= queue.length - 1) {
      this.stop();
      return null;
    }

    return this.jumpTo(queueIndex + 1);
  }

  /**
   * Переход к предыдущему треку.
   * @returns новый текущий трек или null, если текущий уже первый
   */
  prev(): MusicQueueItem | null {
    if (this.#state.queueIndex <= 0) return null;
    return this.jumpTo(this.#state.queueIndex - 1);
  }

  /**
   * Делает трек с указанным индексом текущим.
   * @returns трек или null, если индекс вне очереди
   */
  jumpTo(index: number): MusicQueueItem | null {
    const { queue } = this.#state;
    if (index < 0 || index >= queue.length) return null;

    this.#state = { ...this.#state, track: queue[index], queueIndex: index };

    return queue[index];
  }

  /**
   * Обновляет статус плеера
   */
  setStatus(status: MusicPlayerStatus): void {
    this.#state = { ...this.#state, status };
  }

  /**
   * Останавливает воспроизведение, сбрасывает состояние и очередь
   */
  stop(): void {
    this.#state = idleState();
    this.#directUrls.clear();
  }

  /**
   * Возвращает true, если плеер не в idle-состоянии
   */
  isPlaying(): boolean {
    return this.#state.status !== 'idle';
  }

  /** Приводит треки очереди к безопасному виду и обрезает до лимита */
  #normalizeQueue(tracks: MusicTrack[]): MusicQueueItem[] {
    return tracks
      .filter((track) => typeof track.url === 'string' && track.url.length > 0)
      .slice(0, MAX_QUEUE_SIZE)
      .map((track) => ({
        url: track.url,
        title: (track.title || 'Без названия').slice(0, MAX_QUEUE_TITLE_LENGTH),
        uploader: track.uploader ?? null,
        duration: track.duration ?? null,
      }));
  }

  #clampIndex(index: number, length: number): number {
    if (!Number.isFinite(index)) return 0;
    return Math.min(Math.max(Math.trunc(index), 0), length - 1);
  }
}

/** Синглтон музыкального плеера */
export const musicPlayerService = new MusicPlayerService();
export default musicPlayerService;
