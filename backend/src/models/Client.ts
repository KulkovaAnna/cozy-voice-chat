import { v4 } from 'uuid';
import type { WebSocket } from 'ws';
import PersonalInfo from './PersonalInfo';

export default class Client {
  public id: string;
  public ws: WebSocket;
  public ip: string;
  public connectionDate: string;
  public personalInfo: PersonalInfo;

  constructor(
    ws: WebSocket,
    ip: string,
    personalInfo: PersonalInfo = new PersonalInfo(),
    preferredId?: string | null,
  ) {
    this.id = preferredId || v4();
    this.ws = ws;
    this.ip = ip;
    this.connectionDate = new Date().toISOString();
    this.personalInfo = personalInfo;
  }
}
