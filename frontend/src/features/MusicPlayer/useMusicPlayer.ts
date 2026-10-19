import { useCallback, useEffect, useRef, useState } from "react";

import { API_URLS } from "@cvc/api/config";
import { useChatNetwork } from "@cvc/providers";
import type { MusicState } from "@cvc/types";

const MUSIC_STATE_EVENT = "music::state-changed";

const IDLE_STATE: MusicState = {
  status: "idle",
  track: null,
  streamUrl: null,
  queue: [],
  queueIndex: -1,
};

// Локальные настройки воспроизведения — у каждого участника свои
const VOLUME_KEY = "music.volume";
const MUTED_KEY = "music.muted";

/** Сколько раз подряд перезапрашиваем поток при ошибке загрузки */
const MAX_STREAM_RETRIES = 2;
/** Порог конца трека для фолбэка, если браузер не выдал ended */
const END_THRESHOLD = 0.5;

function readVolume(): number {
  const raw = Number(localStorage.getItem(VOLUME_KEY));
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 1;
}

function readMuted(): boolean {
  return localStorage.getItem(MUTED_KEY) === "true";
}

export function useMusicPlayer() {
  const { playMusic, pauseMusic, stopMusic, nextMusic, prevMusic } =
    useChatNetwork();

  // Callback-ref: полоска размонтирует <audio> в idle, поэтому эффекты
  // должны переподписываться в момент появления элемента.
  // audioEl используется только как триггер для переподписки, а доступ к DOM
  // идёт через audioElRef.current — так линтер immutability не ругается.
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = useCallback((node: HTMLAudioElement | null) => {
    audioElRef.current = node;
    setAudioEl(node);
  }, []);

  const [state, setState] = useState<MusicState>(IDLE_STATE);

  // Синхронизируем ref с state — для обработчиков событий,
  // которые могут сработать между рендерами.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Флаг «уже отправили skipToNext на этот трек»
  const skipSentRef = useRef(false);
  // Счётчик повторов загрузки потока при ошибке
  const retryRef = useRef(0);
  // Ключ последнего загруженного трека: индекс + URL
  const lastLoadedKey = useRef<string | null>(null);

  // Флаг «качаем поток, но звука ещё нет»
  const [isBuffering, setIsBuffering] = useState(false);

  // Текущая позиция в секундах — только для отображения
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const skipToNext = useCallback(() => {
    if (skipSentRef.current) return;
    const current = stateRef.current;
    if (current.status !== "playing") return;
    skipSentRef.current = true;
    nextMusic(current.queueIndex);
  }, [nextMusic]);

  // Готовность потока и автопереход по окончании трека
  useEffect(() => {
    const audio = audioElRef.current;
    if (!audio) return;

    // Если трек уже закончился до навешивания обработчиков — сразу переключаем
    if (audio.ended) {
      skipToNext();
      return;
    }

    const onStartBuffering = () => setIsBuffering(true);
    const onStopBuffering = () => setIsBuffering(false);
    const onError = () => {
      setIsBuffering(false);

      // Автоматический retry: сервер уже сбросил кэш протухшей ссылки
      if (
        retryRef.current < MAX_STREAM_RETRIES &&
        stateRef.current.status === "playing"
      ) {
        retryRef.current += 1;
        audio.load();
        audio.play().catch(() => {
          /* retry */
        });
        return;
      }

      console.warn("Ошибка воспроизведения музыкального потока");
    };

    // Основной триггер — браузер сам определил конец трека
    const onEnded = () => skipToNext();

    // Фолбэк: для потокового аудио через прокси duration может быть Infinity,
    // и ended не генерируется. Отслеживаем через timeupdate: если currentTime
    // дошёл до duration (известного из метаданных M4A/MP3), принудительно
    // переключаем.
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const dur = audio.duration;
      if (Number.isFinite(dur) && dur > 0) setDuration(dur);
      if (!Number.isFinite(dur) || dur <= 0) return;
      if (audio.currentTime >= dur - END_THRESHOLD && !skipSentRef.current) {
        skipToNext();
      }
    };

    // Для стримов без метаданных (duration === Infinity): если audio.paused
    // и currentTime не меняется — поток закончился
    let lastTime = 0;
    let stalledTimer: ReturnType<typeof setTimeout> | null = null;

    const onWaiting = () => {
      setIsBuffering(true);
      lastTime = audio.currentTime;
      if (stalledTimer) clearTimeout(stalledTimer);
      stalledTimer = setTimeout(() => {
        if (
          audio.currentTime === lastTime &&
          !Number.isFinite(audio.duration) &&
          stateRef.current.status === "playing" &&
          !skipSentRef.current
        ) {
          skipToNext();
        }
      }, 5000);
    };

    const onPlaying = () => {
      onStopBuffering();
      retryRef.current = 0;
      if (stalledTimer) {
        clearTimeout(stalledTimer);
        stalledTimer = null;
      }
    };

    audio.addEventListener("loadstart", onStartBuffering);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onStopBuffering);
    audio.addEventListener("emptied", onStopBuffering);
    audio.addEventListener("error", onError);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      audio.removeEventListener("loadstart", onStartBuffering);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onStopBuffering);
      audio.removeEventListener("emptied", onStopBuffering);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      if (stalledTimer) clearTimeout(stalledTimer);
    };
  }, [audioEl, skipToNext]);

  // Подписка на WS-событие all::call::music-state-changed
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent;
      const payload = custom.detail as {
        type: string;
        data: MusicState & { timestamp?: string };
      };
      if (payload?.type === "all::call::music-state-changed") {
        setState(payload.data);
      }
    };
    window.addEventListener(MUSIC_STATE_EVENT, handler);
    return () => window.removeEventListener(MUSIC_STATE_EVENT, handler);
  }, []);

  // Реагируем на изменение статуса и трека
  useEffect(() => {
    const audio = audioElRef.current;
    if (!audio) return;
    const trackUrl = state.track?.url ?? null;

    // Плеер сброшен или трек снят — убираем источник
    if (state.status === "idle" || !trackUrl) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      lastLoadedKey.current = null;
      skipSentRef.current = false;
      retryRef.current = 0;
      return;
    }

    if (state.status === "playing") {
      const loadKey = `${state.queueIndex}|${trackUrl}`;

      // Новый трек очереди — перезагружаем источник.
      // Индекс в параметре нужен, чтобы браузер не взял предыдущий трек из кэша
      if (lastLoadedKey.current !== loadKey) {
        lastLoadedKey.current = loadKey;
        skipSentRef.current = false;
        retryRef.current = 0;
        audio.src = `${API_URLS.BASE_URL}/music/stream?track=${state.queueIndex}`;
        audio.load();
      }

      audio.play().catch((err) => {
        console.warn(
          `Не удалось воспроизвести трек «${state.track?.title ?? "?"}»: ${err.message}`,
        );
      });
    } else {
      audio.pause();
    }
  }, [
    audioEl,
    state.status,
    state.track?.url,
    state.track?.title,
    state.queueIndex,
  ]);

  const play = useCallback(() => {
    playMusic();
    // Оптимистично: эффект выше включит воспроизведение
    setCurrentTime(0);
    setDuration(null);
    setState((prev) => ({ ...prev, status: "playing" }));
  }, [playMusic]);

  const pause = useCallback(() => {
    pauseMusic();
    setState((prev) => ({ ...prev, status: "paused" }));
    audioElRef.current?.pause();
  }, [pauseMusic]);

  const stop = useCallback(() => {
    stopMusic();
    setState(IDLE_STATE);
    const audio = audioElRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    lastLoadedKey.current = null;
    skipSentRef.current = false;
    retryRef.current = 0;
    setCurrentTime(0);
    setDuration(null);
  }, [stopMusic]);

  const goNext = useCallback(() => {
    nextMusic(stateRef.current.queueIndex);
    setCurrentTime(0);
    setDuration(null);
  }, [nextMusic]);

  const goPrev = useCallback(() => {
    prevMusic(stateRef.current.queueIndex);
    setCurrentTime(0);
    setDuration(null);
  }, [prevMusic]);

  // --- Локальная громкость и мьют ---
  // Намеренно НЕ синхронизируются с сервером: очередь и play/pause общие,
  // а громкость у каждого своя.

  const [muted, setMuted] = useState(readMuted);
  const [volume, setVolume] = useState(readVolume);

  // Элемент <audio> размонтируется, когда плеер в idle, поэтому применяем
  // настройки и при смене статуса — иначе новый элемент останется на 100%.
  useEffect(() => {
    const audio = audioElRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
  }, [audioEl, volume, muted, state.status]);

  const setVolumeLocal = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolume(clamped);
    localStorage.setItem(VOLUME_KEY, String(clamped));
    // Двигаем ползунок вверх — снимаем мьют, иначе кажется, что он не работает
    if (clamped > 0) {
      setMuted(false);
      localStorage.setItem(MUTED_KEY, "false");
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem(MUTED_KEY, String(next));
      return next;
    });
  }, []);

  return {
    state,
    audioRef,
    isBuffering,
    currentTime,
    duration,
    play,
    pause,
    stop,
    goNext,
    goPrev,
    volume,
    muted,
    setVolumeLocal,
    toggleMute,
  };
}
