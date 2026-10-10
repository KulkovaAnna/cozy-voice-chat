import type PersonalInfo from '../../../models/PersonalInfo';
import type Call from '../../../models/Call';
import type CallOffer from '../../../models/CallOffer';
import type Client from '../../../models/Client';
import type { WebSocket } from 'ws';

/** Метаданные загруженного файла */
export interface FileMetadata {
  path: string;
  originalName: string;
  senderId: string;
  callId: string;
  createdAt: number;
}

/** Метаданные файла профиля (аватар/фон карточки) */
export interface ProfileFileMetadata {
  path: string;
  originalName: string;
  ownerId: string;
  createdAt: number;
}

/** Результат загрузки файла профиля */
export interface ProfileUploadResult {
  fileId: string;
}

/** Результат чтения файла профиля */
export interface ProfileViewResult {
  stream: import('fs').ReadStream;
  meta: ProfileFileMetadata;
}

/** Результат загрузки файла */
export interface UploadResult {
  fileId: string;
}

/** Результат скачивания файла */
export interface DownloadResult {
  stream: import('fs').ReadStream;
  filename: string;
  path: string;
  cleanup: () => void;
}

/** Результат просмотра файла */
export interface ViewResult {
  stream: import('fs').ReadStream;
  meta: FileMetadata;
}

/** Payload события "файл загружен" */
export interface FileUploadedEvent {
  fileId: string;
  originalName: string;
  size: number;
  callId: string;
  senderIp: string;
}

/** Payload события "файл удалён" */
export interface FileDeletedEvent {
  fileId: string;
  callId: string;
  originalName: string;
  size: number;
}

/** Абстракция менеджера лобби (для разрыва циклических зависимостей) */
export interface LobbyManagerLike {
  addClient(
    ws: WebSocket,
    ip: string,
    personalInfo: PersonalInfo,
    preferredId?: string | null,
  ): Client | undefined;
  getMemberByIp(clientIp: string): Client | undefined;
}

/** Абстракция менеджера звонков (для разрыва циклических зависимостей) */
export interface CallManagerLike {
  getCallById(callId: string): Call | undefined;
}
