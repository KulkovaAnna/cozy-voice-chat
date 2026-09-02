import { useEffect, useRef } from "react";

type Props = {
  src: string;
};

export function Audio(props: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.1;
      audioRef.current.play();
    }
  }, []);

  return <audio ref={audioRef} loop {...props} />;
}
