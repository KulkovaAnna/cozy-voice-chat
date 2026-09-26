import { useEffect, useRef } from "react";
import * as Styled from "./ShareScreenVideo.styles";
import { LoadingIcon } from "../../components/Icons";

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
      <Styled.BlackScreen width={props.width} height={props.height}>
        <LoadingIcon />
      </Styled.BlackScreen>
    );
  if (props.error)
    return (
      <Styled.BlackScreen width={props.width} height={props.height}>
        {props.error}
      </Styled.BlackScreen>
    );

  return (
    <Styled.Video
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
