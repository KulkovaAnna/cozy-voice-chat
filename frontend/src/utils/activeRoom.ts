import { isValidRoomCode, normalizeRoomCode } from "./roomCode";

const ACTIVE_CALL_KEY = "cvc:active-room";

export interface ActiveCall {
  callId: string;
  /** Код комнаты есть только у группового звонка */
  roomCode: string | null;
}

/**
 * Запоминает активный звонок (и комнату, и 1-на-1), чтобы после F5
 * вернуться в него, а не в лобби.
 */
export function saveActiveCall(
  callId: string,
  roomCode: string | null = null,
): void {
  if (!callId) return;

  const normalizedCode =
    roomCode && isValidRoomCode(roomCode)
      ? normalizeRoomCode(roomCode)
      : null;

  try {
    sessionStorage.setItem(
      ACTIVE_CALL_KEY,
      JSON.stringify({
        callId,
        roomCode: normalizedCode,
      }),
    );
  } catch {
    // sessionStorage может быть недоступен — восстановление просто не сработает
  }
}

/** Возвращает звонок, в котором вкладка была до перезагрузки */
export function readActiveCall(): ActiveCall | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_CALL_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ActiveCall> | null;
    if (
      !parsed ||
      typeof parsed.callId !== "string" ||
      !parsed.callId
    ) {
      return null;
    }

    const roomCode =
      typeof parsed.roomCode === "string" && isValidRoomCode(parsed.roomCode)
        ? normalizeRoomCode(parsed.roomCode)
        : null;

    return {
      callId: parsed.callId,
      roomCode,
    };
  } catch {
    return null;
  }
}

/** Забывает звонок после выхода, завершения или ошибки входа */
export function clearActiveCall(): void {
  try {
    sessionStorage.removeItem(ACTIVE_CALL_KEY);
  } catch {
    // ignore
  }
}