import { isValidRoomCode, normalizeRoomCode } from "./roomCode";

const ACTIVE_ROOM_KEY = "cvc:active-room";

export interface ActiveRoom {
  callId: string;
  roomCode: string;
}

/** Запоминает комнату, чтобы после F5 вернуться в неё, а не в лобби */
export function saveActiveRoom(callId: string, roomCode: string): void {
  if (!callId || !isValidRoomCode(roomCode)) return;

  try {
    sessionStorage.setItem(
      ACTIVE_ROOM_KEY,
      JSON.stringify({
        callId,
        roomCode: normalizeRoomCode(roomCode),
      }),
    );
  } catch {
    // sessionStorage может быть недоступен — восстановление просто не сработает
  }
}

/** Возвращает комнату, в которой вкладка была до перезагрузки */
export function readActiveRoom(): ActiveRoom | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_ROOM_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ActiveRoom> | null;
    if (
      !parsed ||
      typeof parsed.callId !== "string" ||
      !parsed.callId ||
      typeof parsed.roomCode !== "string" ||
      !isValidRoomCode(parsed.roomCode)
    ) {
      return null;
    }

    return {
      callId: parsed.callId,
      roomCode: normalizeRoomCode(parsed.roomCode),
    };
  } catch {
    return null;
  }
}

/** Забывает комнату после выхода, завершения звонка или ошибки входа */
export function clearActiveRoom(): void {
  try {
    sessionStorage.removeItem(ACTIVE_ROOM_KEY);
  } catch {
    // ignore
  }
}