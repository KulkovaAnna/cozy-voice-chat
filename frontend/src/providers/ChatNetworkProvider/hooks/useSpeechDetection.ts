import { useEffect, useRef } from "react";

import type { MediaConnection } from "peerjs";

import { SpeechDetection } from "@cvc/utils";

type UseSpeechDetectionParams = {
  call: MediaConnection | null;
  onSpeakingChange: (isSpeaking: boolean) => void;
};

export function useSpeechDetection({
  call,
  onSpeakingChange,
}: UseSpeechDetectionParams) {
  const speechDetection = useRef<SpeechDetection | null>(null);

  const onSpeakingChangeRef = useRef(onSpeakingChange);

  useEffect(() => {
    onSpeakingChangeRef.current = onSpeakingChange;
  }, [onSpeakingChange]);

  useEffect(() => {
    if (!call) {
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

    if (call.localStream) {
      speechDetection.current.start(call.localStream);
    }

    return () => {
      speechDetection.current?.stop();
      speechDetection.current = null;
    };
  }, [call]);
}
