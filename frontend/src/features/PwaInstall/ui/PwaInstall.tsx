import { InstallAppIcon } from "@cvc/components";
import { usePwaInstall, usePwaUpdate } from "@cvc/hooks";
import { useEffect } from "react";
import { toast } from "react-toastify";
import * as Styles from "./PwaInstall.styles";

// Кнопка установки приложения + тост о доступной новой версии.
// Обе части живут в одном компоненте, потому что обе про PWA и обе
// показываются в шапке: без beforeinstallprompt кнопка не отрисуется,
// а без service worker не приддёт событие обновления.
export function PwaInstall() {
  const { canInstall, install } = usePwaInstall();
  const { isUpdateAvailable, applyUpdate, dismissUpdate } = usePwaUpdate();

  useEffect(() => {
    if (!isUpdateAvailable) return;

    toast(
      <Styles.UpdateToast>
        <span>Доступна новая версия</span>
        <Styles.UpdateButton onClick={applyUpdate}>
          Обновить
        </Styles.UpdateButton>
      </Styles.UpdateToast>,
      {
        // Не закрываем сами: пользователь может перезагрузиться позже,
        // чтобы не рвать идущий звонок.
        autoClose: false,
        closeOnClick: false,
        toastId: "pwa-update",
      },
    );

    return () => {
      dismissUpdate();
    };
  }, [isUpdateAvailable, applyUpdate, dismissUpdate]);

  if (!canInstall) return null;

  return (
    <Styles.InstallButton
      onClick={() => void install()}
      title="Установить Cozy Voice Chat как приложение"
    >
      <InstallAppIcon />
      Установить
    </Styles.InstallButton>
  );
}
