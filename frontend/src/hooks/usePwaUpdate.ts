import { useCallback, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

// В dev-режиме (yarn dev) service worker не регистрируется, поэтому
// useRegisterSW возвращает заглушку: needRefresh никогда не станет true.
export function usePwaUpdate() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  const { updateServiceWorker } = useRegisterSW({
    // registerType: "autoUpdate" — новый sw уже установлен и активирован,
    // осталось перезагрузить страницу. onNeedReload подменяет собой
    // автоматический window.location.reload(), который иначе оборвал бы
    // идущий звонок.
    onNeedReload() {
      setIsUpdateAvailable(true);
    },
    onRegisterError(error) {
      console.error("Не удалось зарегистрировать service worker", error);
    },
  });

  const applyUpdate = useCallback(() => {
    setIsUpdateAvailable(false);
    // updateServiceWorker в autoUpdate ничего не делает, но вызываем его
    // для совместимости со стратегией prompt.
    void updateServiceWorker(true);
    window.location.reload();
  }, [updateServiceWorker]);

  const dismissUpdate = useCallback(() => setIsUpdateAvailable(false), []);

  return { isUpdateAvailable, applyUpdate, dismissUpdate };
}
