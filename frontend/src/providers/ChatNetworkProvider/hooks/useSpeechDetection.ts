import { useEffect, useRef } from "react";

import type { MediaConnection } from "peerjs";

import { SpeechDetection } from "@cvc/utils";

type UseSpeechDetectionParams = {
  call: MediaConnection | null;
  localAudioStream: MediaStream | null;
  onSpeakingChange: (isSpeaking: boolean) => void;
};

export function useSpeechDetection({
  call,
  localAudioStream,
  onSpeakingChange,
}: UseSpeechDetectionParams) {
  const speechDetection = useRef<SpeechDetection | null>(null);

  const onSpeakingChangeRef = useRef(onSpeakingChange);

  useEffect(() => {
    onSpeakingChangeRef.current = onSpeakingChange;
  }, [onSpeakingChange]);

  useEffect(() => {
    const stream = localAudioStream ?? call?.localStream ?? null;

    if (!call || !stream) {
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
  }, [call, localAudioStream]);
}
