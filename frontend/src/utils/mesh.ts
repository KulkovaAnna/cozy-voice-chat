/**
 * Правило инициатора mesh-соединения.
 * Для каждой пары участников соединение открывает только один —
 * тот, чей id лексикографически меньше. Иначе обе стороны вызовут
 * друг друга и получится два MediaConnection на одну пару.
 */
export function shouldInitiateConnection(
  myId: string,
  peerId: string,
): boolean {
  return myId.localeCompare(peerId) < 0;
}

/**
 * Сравнивает текущий набор соединений с желаемым и возвращает,
 * кого нужно подключить и от кого отключиться.
 */
export function diffPeerIds(
  current: Iterable<string>,
  next: Iterable<string>,
): { added: string[]; removed: string[] } {
  const currentSet = new Set(current);
  const nextSet = new Set(next);

  return {
    added: Array.from(nextSet).filter((id) => !currentSet.has(id)),
    removed: Array.from(currentSet).filter((id) => !nextSet.has(id)),
  };
}
