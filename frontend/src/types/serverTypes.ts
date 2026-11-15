import type { CardAppearance } from "./settings";

export type UserDTO = {
  id: string;
  ip: string;
  connectionDate: string;
  personalInfo: {
    name: string;
    avatar: string;
    cardAppearance?: CardAppearance | null;
  };
};

export type CallMemberDTO = {
  client: UserDTO;
  isMuted: boolean;
  isSpeaking: boolean;
  online: boolean;
  isScreenSharing: boolean;
};

export type CallInfoDTO = {
  id: string;
  /** Тип звонка; сервер всегда присылает, optional — для совместимости */
  type?: "direct" | "group";
  /** Код групповой комнаты */
  roomCode?: string | null;
  initiator: UserDTO;
  members: CallMemberDTO[];
  receiver?: UserDTO | null;
};

export type MessageDto = {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  senderName?: string;
  avatar?: string;
  isSystem?: boolean;
  attachments?: FileAttachmentDTO[];
};

/** Файл, прикреплённый к сообщению */
export type FileAttachmentDTO = {
  id: string;
  fileName: string;
  fileSize: number;
};

export type ServerMessage = {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
};

export type MusicTrackInfo = {
  url: string;
  title: string;
  uploader?: string | null;
  duration?: number | null;
};

/** Элемент очереди воспроизведения */
export type MusicQueueItem = MusicTrackInfo;

export type MusicState = {
  status: "idle" | "playing" | "paused";
  track: MusicTrackInfo | null;
  streamUrl: string | null;
  /** Очередь воспроизведения (пустой массив, если трек без очереди) */
  queue: MusicQueueItem[];
  /** Индекс текущего трека в очереди (-1, если очереди нет) */
  queueIndex: number;
};

/** Стадия выполнения слэш-команды (приходит только инициатору) */
export type CommandStatus = {
  command: string;
  status: "started" | "running" | "done";
  text: string;
};
