/**
 * Стор несохранённых изменений (Zustand).
 *
 * Фичи с черновиком настроек (например, кастомизация карточки) регистрируют
 * здесь «охранника» — пару предиката несохранённых изменений и колбэка
 * сохранения. Любая сторона (например, панель настроек перед закрытием или
 * переключением вкладки) может проверить `hasUnsavedChanges()` и сохранить всё
 * разом через `saveAllUnsavedChanges()`, не зная ничего о конкретной фиче.
 */

import { create } from "zustand";

/** Охранник несохранённых изменений одной фичи. */
export type UnsavedChangesGuard = {
  /** Возвращает true, если у фичи есть несохранённый черновик. */
  hasUnsaved: () => boolean;
  /** Сохраняет черновик фичи. */
  save: () => void | Promise<void>;
};

type UnsavedChangesState = {
  guards: Map<string, UnsavedChangesGuard>;
  register: (name: string, guard: UnsavedChangesGuard) => void;
  unregister: (name: string) => void;
};

const createInitialMap = () => new Map<string, UnsavedChangesGuard>();

export const useUnsavedChangesStore = create<UnsavedChangesState>()(
  (set, get) => ({
    guards: createInitialMap(),

    register(name, guard) {
      const guards = new Map(get().guards);
      guards.set(name, guard);
      set({ guards });
    },

    unregister(name) {
      const guards = new Map(get().guards);
      guards.delete(name);
      set({ guards });
    },
  }),
);

/**
 * Регистрирует охранника несохранённых изменений.
 *
 * @param name уникальный идентификатор фичи (повторная регистрация
 * перезаписывает прежнего охранника).
 * @returns функцию отмены регистрации; безопасна для многократного вызова.
 */
export function registerUnsavedChanges(
  name: string,
  guard: UnsavedChangesGuard,
): VoidFunction {
  useUnsavedChangesStore.getState().register(name, guard);

  return () => {
    useUnsavedChangesStore.getState().unregister(name);
  };
}

/** Снимает охранника несохранённых изменений по имени фичи. */
export function unregisterUnsavedChanges(name: string): void {
  useUnsavedChangesStore.getState().unregister(name);
}

/** Есть ли хотя бы одна фича с несохранёнными изменениями. */
export function hasUnsavedChanges(): boolean {
  const guards = useUnsavedChangesStore.getState().guards;
  for (const guard of guards.values()) {
    if (guard.hasUnsaved()) return true;
  }

  return false;
}

/** Имена фич, у которых есть несохранённые изменения. */
export function getUnsavedChangesNames(): string[] {
  const names: string[] = [];

  for (const [name, guard] of useUnsavedChangesStore.getState().guards) {
    if (guard.hasUnsaved()) names.push(name);
  }

  return names;
}

/**
 * Сохраняет черновики всех фич с несохранёнными изменениями.
 *
 * Определяет список охранников заранее, чтобы сохранение одной фичи не
 * влияло на обход остальных.
 */
export async function saveAllUnsavedChanges(): Promise<void> {
  const pending = [...useUnsavedChangesStore.getState().guards.values()].filter(
    (guard) => guard.hasUnsaved(),
  );

  for (const guard of pending) {
    await guard.save();
  }
}
