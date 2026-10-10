import { useEffect, useId, useRef } from "react";

import {
  registerUnsavedChanges,
  type UnsavedChangesGuard,
} from "../utils/unsavedChangesStore";

/**
 * Регистрирует черновик фичи в сторе несохранённых изменений.
 *
 * Пока хук смонтирован и `isDirty === true`, любая сторона может узнать об
 * этом через `hasUnsavedChanges()` и сохранить черновик через
 * `saveAllUnsavedChanges()`. Отписка выполняется автоматически при размонтировании.
 *
 * @param isDirty есть ли у фичи несохранённый черновик.
 * @param save сохраняет черновик.
 * @param name человекочитаемое имя фичи; по умолчанию — уникальный id компонента.
 */
export function useUnsavedChangesGuard(
  isDirty: boolean,
  save: () => void | Promise<void>,
  name?: string,
): void {
  const autoName = useId();
  const guardName = name ?? autoName;

  // Черновик и колбэк сохранения читаются через ref: так охранник не
  // перерегистрируется на каждое изменение state фичи.
  const latest = useRef({ isDirty, save });

  useEffect(() => {
    latest.current = { isDirty, save };
  });

  useEffect(() => {
    const guard: UnsavedChangesGuard = {
      hasUnsaved: () => latest.current.isDirty,
      save: () => latest.current.save(),
    };

    return registerUnsavedChanges(guardName, guard);
  }, [guardName]);
}
