import { EventEmitter } from 'events';
import type { FileDeletedEvent, FileUploadedEvent } from '../app/modules/file-manager/file-manager.types';

export interface AppEvents {
  'file:uploaded': [FileUploadedEvent];
  'file:deleted': [FileDeletedEvent];
}

/** Типизированная шина событий приложения */
class EventBus extends EventEmitter<AppEvents> {}

export default new EventBus();
