import { useState } from "react";

import {
  CloseIcon,
  HorizontalSlider,
  PauseIcon,
  PlayIcon,
  SkipNextIcon,
  SkipPrevIcon,
  VolumeOffIcon,
  VolumeOnIcon,
} from "@cvc/components";
import { formatDuration } from "@cvc/utils";
import { useMusicPlayer } from "../useMusicPlayer";
import * as Styles from "./MusicPlayer.styles";

export function MusicPlayer() {
  const {
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
  } = useMusicPlayer();

  const [isQueueOpen, setIsQueueOpen] = useState(false);

  if (state.status === "idle" || !state.track) return null;

  const { title, uploader, url } = state.track;
  const queue = state.queue;
  const hasQueue = queue.length > 1;
  const isFirst = state.queueIndex <= 0;
  const isLast = state.queueIndex >= queue.length - 1;

  const total = duration ?? state.track.duration ?? null;
  const elapsed = formatDuration(currentTime);
  const totalStr = formatDuration(total);

  return (
    <>
      <Styles.Bar>
        {isQueueOpen && hasQueue && (
          <Styles.QueuePanel>
            {queue.map((item, index) => {
              const duration = formatDuration(item.duration);

              return (
                <Styles.QueueItem
                  key={`${index}-${item.url}`}
                  $current={index === state.queueIndex}
                >
                  <Styles.QueueItemIndex>{index + 1}</Styles.QueueItemIndex>
                  <Styles.QueueItemTitle title={item.title}>
                    {item.title}
                  </Styles.QueueItemTitle>
                  {duration && (
                    <Styles.QueueItemDuration>
                      {duration}
                    </Styles.QueueItemDuration>
                  )}
                </Styles.QueueItem>
              );
            })}
          </Styles.QueuePanel>
        )}
        <Styles.ControlsContainer>
          <Styles.Controls>
            {hasQueue && (
              <Styles.SkipButton
                onClick={goPrev}
                disabled={isFirst}
                title="Предыдущий трек"
              >
                <SkipPrevIcon />
              </Styles.SkipButton>
            )}
            {state.status === "playing" ? (
              <Styles.ControlButton onClick={pause} title="Пауза">
                <PauseIcon />
              </Styles.ControlButton>
            ) : (
              <Styles.ControlButton onClick={play} title="Воспроизвести">
                <PlayIcon />
              </Styles.ControlButton>
            )}
            {hasQueue && (
              <Styles.SkipButton
                onClick={goNext}
                disabled={isLast}
                title="Следующий трек"
              >
                <SkipNextIcon />
              </Styles.SkipButton>
            )}
          </Styles.Controls>
          {elapsed && (
            <Styles.TrackTime>
              {elapsed}
              {totalStr ? ` / ${totalStr}` : ""}
            </Styles.TrackTime>
          )}
        </Styles.ControlsContainer>

        <Styles.TrackInfo>
          <Styles.TrackLine>
            <Styles.TrackTitle title={title}>
              {uploader ? `${uploader} — ${title}` : title}
            </Styles.TrackTitle>
            {hasQueue && (
              <Styles.QueueCounter
                onClick={() => setIsQueueOpen((prev) => !prev)}
                title={isQueueOpen ? "Скрыть список" : "Список треков"}
              >
                {state.queueIndex + 1} / {queue.length}
              </Styles.QueueCounter>
            )}
          </Styles.TrackLine>
          <Styles.TrackLine>
            <Styles.TrackLink
              href={isBuffering ? undefined : url}
              target="_blank"
              rel="noopener noreferrer"
              title={url}
            >
              {isBuffering ? "Буферизация…" : "🔗 источник"}
            </Styles.TrackLink>
            <Styles.VolumeControls>
              <Styles.MuteButton
                onClick={toggleMute}
                title={muted ? "Включить звук" : "Отключить звук"}
              >
                {muted ? <VolumeOffIcon /> : <VolumeOnIcon />}
              </Styles.MuteButton>
              <HorizontalSlider
                value={volume}
                onChange={setVolumeLocal}
                thumbSize={12}
                trackHeight={4}
                step={0.05}
              />
            </Styles.VolumeControls>
          </Styles.TrackLine>
        </Styles.TrackInfo>

        <Styles.Controls>
          <Styles.StopButton onClick={stop} title="Остановить">
            <CloseIcon />
          </Styles.StopButton>
        </Styles.Controls>
      </Styles.Bar>
      <audio ref={audioRef} preload="none" />
    </>
  );
}
