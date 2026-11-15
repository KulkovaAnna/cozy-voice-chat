import express, { type Router } from 'express';
import { Readable } from 'stream';
import musicPlayerService, {
  type MusicPlayerService,
} from './music-player.service';
import { fetchTrackInfo, YTDLP_USER_AGENT } from './yt-dlp';

/** Кэш pending-запросов к yt-dlp: предотвращает гонку, когда оба участника
 *  одновременно запрашивают один трек. Второй получает тот же Promise,
 *  иначе два параллельных запроса к YouTube могут вернуть разные подписи,
 *  и одна из них окажется протухшей. Ключ включает callId: у каждой
 *  комнаты свой кэш прямых ссылок. */
const pendingRequests = new Map<string, Promise<string | null>>();

/**
 * Возвращает прямую ссылку на аудио-поток, получая её через yt-dlp.
 * Результат кэшируется в плеере звонка по индексу очереди.
 * @param player — плеер конкретного звонка
 * @param trackUrl — страница видео
 * @param index — индекс трека в очереди (для кэша)
 */
async function resolveDirectUrl(
  player: MusicPlayerService,
  trackUrl: string,
  index: number,
): Promise<string | null> {
  const cacheKey = `${player.callId}:${trackUrl}`;
  const pending = pendingRequests.get(cacheKey);
  if (pending) return pending;

  const request = fetchTrackInfo(trackUrl)
    .then((info) => {
      const url = info.directUrl;
      // Индекс мог устареть, пока yt-dlp работал — пишем только если совпал
      if (url && player.queueIndex === index) {
        player.setDirectUrlFor(index, url);
      }
      return url;
    })
    .catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error);
      console.error(`Не удалось получить ссылку на поток: ${detail}`);
      return null;
    })
    .finally(() => {
      pendingRequests.delete(cacheKey);
    });

  pendingRequests.set(cacheKey, request);
  return request;
}

export default class MusicPlayerRoutes {
  static BASE_URL = '/music';

  private router: Router;

  constructor() {
    this.router = express.Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // GET /music/stream?callId=... — отдаёт аудио-поток текущего трека звонка
    this.router.get('/stream', async (req, res) => {
      const callId =
        typeof req.query.callId === 'string' ? req.query.callId.trim() : '';

      if (!callId) {
        res.status(400).json({ error: 'Не указан callId' });
        return;
      }

      const player = musicPlayerService.get(callId);
      if (!player) {
        res.status(400).json({ error: 'Трек не загружен' });
        return;
      }

      const track = player.track;
      // Индекс фиксируем до await: за время получения ссылки трек мог смениться
      const index = player.queueIndex;

      if (!track) {
        res.status(400).json({ error: 'Трек не загружен' });
        return;
      }

      if (!player.isPlaying()) {
        res.status(409).json({ error: 'Плеер остановлен' });
        return;
      }

      const controller = new AbortController();
      // Клиент закрыл плеер/переключил трек — отменяем загрузку
      res.on('close', () => controller.abort());

      try {
        // Прямую ссылку получаем лениво и кэшируем по индексу трека
        let directUrl = player.directUrlFor(index);
        let cached = false;

        if (directUrl) {
          cached = true;
        } else {
          directUrl = await resolveDirectUrl(player, track.url, index);
        }

        // Трек сменили, пока мы ждали yt-dlp — клиент перезапросит сам
        if (player.queueIndex !== index) {
          res.status(409).json({ error: 'Трек уже сменился' });
          return;
        }

        if (!directUrl) {
          res.status(502).json({ error: 'Не удалось получить аудио-поток' });
          return;
        }

        const headers: Record<string, string> = {
          'User-Agent': YTDLP_USER_AGENT,
          Accept: '*/*',
        };

        // Пробрасываем Range: браузер запрашивает докрутку при перемотке
        const range = req.headers.range;
        if (typeof range === 'string') {
          headers.Range = range;
        }

        let upstream = await fetch(directUrl, {
          headers,
          signal: controller.signal,
        });

        // Ссылка могла протухнуть — делаем один внутренний retry со свежей ссылкой.
        // Отбрасываем тело неудачного ответа, иначе соединение утечёт.
        if (!upstream.ok && cached) {
          await upstream.body?.cancel().catch(() => undefined);
          player.setDirectUrlFor(index, null);
          directUrl = await resolveDirectUrl(player, track.url, index);
          if (!directUrl) {
            res.status(502).json({ error: 'Не удалось получить аудио-поток' });
            return;
          }
          upstream = await fetch(directUrl, {
            headers,
            signal: controller.signal,
          });
        }

        if (!upstream.ok) {
          console.error(`yt-dlp поток вернул статус ${upstream.status}`);
          player.setDirectUrlFor(index, null);
          res.status(502).json({ error: `Источник вернул ${upstream.status}` });
          return;
        }

        if (!upstream.body) {
          player.setDirectUrlFor(index, null);
          res.status(502).json({ error: 'Пустой ответ источника' });
          return;
        }

        res.status(upstream.status === 206 ? 206 : 200);
        res.setHeader(
          'Content-Type',
          upstream.headers.get('content-type') ?? 'audio/mp4',
        );
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Не передаём Content-Length при 206 — upstream содержит общий размер файла,
        // а браузеру нужен размер фрагмента. Node.js определит длину динамически.
        if (upstream.status === 200) {
          const contentLength = upstream.headers.get('content-length');
          if (contentLength) res.setHeader('Content-Length', contentLength);
        }

        const contentRange = upstream.headers.get('content-range');
        if (contentRange) res.setHeader('Content-Range', contentRange);

        const nodeStream = Readable.fromWeb(
          upstream.body as unknown as Parameters<typeof Readable.fromWeb>[0],
        );

        nodeStream.on('error', (error: Error) => {
          console.error('Ошибка при загрузке потока:', error.message);
          nodeStream.destroy();
          if (!res.headersSent) {
            res.status(502).json({ error: 'Ошибка при загрузке потока' });
          } else {
            res.destroy();
          }
        });

        nodeStream.pipe(res);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Ошибка стриминга:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Ошибка при обработке запроса' });
        } else {
          res.destroy();
        }
      }
    });

    // GET /music/state?callId=... — текущее состояние плеера (отладка)
    this.router.get('/state', (req, res) => {
      const callId =
        typeof req.query.callId === 'string' ? req.query.callId.trim() : '';

      if (!callId) {
        res.status(400).json({ error: 'Не указан callId' });
        return;
      }

      res.json(musicPlayerService.forCall(callId).state);
    });
  }

  getRouter(): Router {
    return this.router;
  }
}
