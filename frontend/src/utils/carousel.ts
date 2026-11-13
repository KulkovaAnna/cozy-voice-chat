/**
 * Приводит индекс карусели к диапазону списка с круговой навигацией:
 * `-1` → последний элемент, `length` → первый.
 */
export function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;

  return ((index % length) + length) % length;
}
