/**
 * Стор несохранённых изменений.
 *
 * Фичи с черновиком настроек (например, кастомизация карточки) регистрируют
 * здесь «охранника» — пару предиката несохранённых изменений и колбэка
 * сохранения. Любая сторона (например, панель настроек перед закрытием или
 * переключением вкладки) может проверить `hasUnsavedChanges()` и сохранить всё
 * разом через `saveAllUnsavedChanges()`, не зная ничего о конкретной фиче.
 */

/** Охранник несохранённых изменений одной фичи. */
export type UnsavedChangesGuard = {
  /** Возвращает true, если у фичи есть несохранённый черновик. */
  hasUnsaved: () => boolean;
  /** Сохраняет черновик фичи. */
  save: () => void | Promise<void>;
};

const guards = new Map<string, UnsavedChangesGuard>();

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
  guards.set(name, guard);

  return () => {
    // Удаляем только своего охранника: если к этому моменту имя уже
    // перехвачено другой регистрацией, чужую запись не трогаем.
    if (guards.get(name) === guard) {
      guards.delete(name);
    }
  };
}

/** Снимает охранника несохранённых изменений по имени фичи. */
export function unregisterUnsavedChanges(name: string): void {
  guards.delete(name);
}

/** Есть ли хотя бы одна фича с несохранёнными изменениями. */
export function hasUnsavedChanges(): boolean {
  for (const guard of guards.values()) {
    if (guard.hasUnsaved()) return true;
  }

  return false;
}

/** Имена фич, у которых есть несохранённые изменения. */
export function getUnsavedChangesNames(): string[] {
  const names: string[] = [];

  for (const [name, guard] of guards) {
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
  const pending = [...guards.values()].filter((guard) => guard.hasUnsaved());

  for (const guard of pending) {
    await guard.save();
  }
}
