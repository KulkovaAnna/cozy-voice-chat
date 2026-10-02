import { useEffect, useRef } from "react";

import { LoadingIcon } from "../Icons";
import * as Styles from "./ShareScreenVideo.styles";

export interface ShareScreenVideoProps {
  stream: MediaStream | null;
  /** @default true Рекомендуется выключить при демонстрации собственного экрана самому себе во избежание эха */
  muted?: boolean;
  loading?: boolean;
  width?: string | number;
  height?: string | number;
  error?: string;
}

export function ShareScreenVideo(props: ShareScreenVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = props.stream;
    }
  }, [props.stream]);

  if (props.loading)
    return (
      <Styles.BlackScreen width={props.width} height={props.height}>
        <LoadingIcon />
      </Styles.BlackScreen>
    );
  if (props.error)
    return (
      <Styles.BlackScreen width={props.width} height={props.height}>
        {props.error}
      </Styles.BlackScreen>
    );

  return (
    <Styles.Video
      ref={videoRef}
      autoPlay
      muted={props.muted ?? true}
      width={props.width}
      height={props.height}
      playsInline
      onDoubleClick={() => {
        videoRef.current?.requestFullscreen();
      }}
    />
  );
}
