import { useEffect, useRef } from "react";

import { SpeechDetection } from "@cvc/utils";

type UseSpeechDetectionParams = {
  /** Идёт ли звонок (в комнате соединений может быть ещё ноль) */
  isCallActive: boolean;
  localAudioStream: MediaStream | null;
  onSpeakingChange: (isSpeaking: boolean) => void;
};

export function useSpeechDetection({
  isCallActive,
  localAudioStream,
  onSpeakingChange,
}: UseSpeechDetectionParams) {
  const speechDetection = useRef<SpeechDetection | null>(null);

  const onSpeakingChangeRef = useRef(onSpeakingChange);

  useEffect(() => {
    onSpeakingChangeRef.current = onSpeakingChange;
  }, [onSpeakingChange]);

  useEffect(() => {
    const stream = localAudioStream;

    if (!isCallActive || !stream) {
      if (speechDetection.current) {
        speechDetection.current.stop();
        speechDetection.current = null;
      }
      return;
    }

    if (!speechDetection.current) {
      speechDetection.current = new SpeechDetection({
        onUpdate: (isSpeaking: boolean) =>
          onSpeakingChangeRef.current(isSpeaking),
      });
    }

    speechDetection.current.start(stream);

    return () => {
      speechDetection.current?.stop();
      speechDetection.current = null;
    };
  }, [isCallActive, localAudioStream]);
}
