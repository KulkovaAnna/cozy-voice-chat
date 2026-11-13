import type PersonalInfo from '../../../models/PersonalInfo';
import type Call from '../../../models/Call';
import type CallOffer from '../../../models/CallOffer';
import type Client from '../../../models/Client';
import type { WebSocket } from 'ws';

/** Максимальное число файлов, прикрепляемых к одному сообщению */
export const MAX_ATTACHMENTS = 10;

/** Метаданные загруженного файла */
export interface FileMetadata {
  path: string;
  originalName: string;
  senderId: string;
  callId: string;
  createdAt: number;
  /** Размер файла в байтах */
  size: number;
  /** Файл уже прикреплён к сообщению (повторно прикрепить нельзя) */
  claimed?: boolean;
}

/** Файл, полученный от multer */
export interface UploadedFile {
  originalname: string;
  path: string;
  size: number;
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

/** Результат скачивания файла */
export interface DownloadResult {
  stream: import('fs').ReadStream;
  filename: string;
}

/** Результат просмотра файла */
export interface ViewResult {
  stream: import('fs').ReadStream;
  meta: FileMetadata;
}

/** Абстракция менеджера лобби (для разрыва циклических зависимостей) */
export interface LobbyManagerLike {
  addClient(
    ws: WebSocket,
    ip: string,
    personalInfo: PersonalInfo,
    preferredId?: string | null,
  ): Client | undefined;
  getMemberById(clientId: string): Client | undefined;
  getMemberByIp(clientIp: string): Client | undefined;
}

/** Абстракция менеджера звонков (для разрыва циклических зависимостей) */
export interface CallManagerLike {
  getCallById(callId: string): Call | undefined;
}
