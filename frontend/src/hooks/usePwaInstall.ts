import { useCallback, useEffect, useState } from "react";

// Событие beforeinstallprompt не входит в стандартные типы DOM:
// браузер отдаёт объект с prompt() и userChoice, поэтому описываем его сами.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly message: string;
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function readStandaloneFlag(): boolean {
  // Приложение уже запущено как установленное (отдельное окно без вкладок).
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari: собственного события установки нет, флаг лежит в navigator.
  const iosStandalone = (navigator as Navigator & { standalone?: boolean })
    .standalone;
  return iosStandalone === true;
}

export function usePwaInstall() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(readStandaloneFlag);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      // Обязательное preventDefault: без него браузер скроет кнопку установки
      // и событие станет недоступным для программному вызову.
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return null;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    // Браузер отдаёт только одно событие beforeinstallprompt за сессию —
    // после показа системного диалога оно аннулируется.
    setPromptEvent(null);
    return choice.outcome;
  }, [promptEvent]);

  return {
    isInstalled,
    canInstall: promptEvent !== null && !isInstalled,
    install,
  };
}
