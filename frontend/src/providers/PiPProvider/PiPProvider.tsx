import { useEffect, type PropsWithChildren } from "react";

import { useDocumentPictureInPicture } from "@cvc/hooks";
import { useChatNetwork } from "../ChatNetworkProvider";
import { PiPContext } from "./PiPContext";

// Chrome расширяет набор mediaSession-действий значением
// "enterpictureinpicture", которого может не быть в типах DOM.
type MediaSessionActionLike = Parameters<MediaSession["setActionHandler"]>[0];

const ENTER_PICTURE_IN_PICTURE =
  "enterpictureinpicture" as MediaSessionActionLike;

export function PiPProvider(props: PropsWithChildren) {
  const pip = useDocumentPictureInPicture();
  const { callInfo } = useChatNetwork();

  const { isSupported, openAuto } = pip;
  const isInCall = !!callInfo?.id;

  // Пока идёт звонок, регистрируем mediaSession-действие "enterpictureinpicture".
  // Браузер сам вызывает его, когда пользователь переключается на другой таб или
  // окно, — это позволяет открыть PiP-окно без пользовательского жеста
  // (Chrome 120+; условие — активный захват микрофона через getUserMedia).
  useEffect(() => {
    if (!isSupported || !isInCall) return;

    const mediaSession = navigator.mediaSession;
    if (!mediaSession) return;

    try {
      mediaSession.setActionHandler(ENTER_PICTURE_IN_PICTURE, () => {
        openAuto();
      });
    } catch {
      // Браузер не поддерживает это действие.
      return;
    }

    return () => {
      try {
        mediaSession.setActionHandler(ENTER_PICTURE_IN_PICTURE, null);
      } catch {
        // Действие уже снято вместе с документом.
      }
    };
  }, [isSupported, isInCall, openAuto]);

  return <PiPContext value={pip}>{props.children}</PiPContext>;
}
