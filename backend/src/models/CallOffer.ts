import { v4 } from 'uuid';
import type Client from './Client';

export default class CallOffer {
  public id: string;
  public initiator: Client;
  public receiver: Client;

  constructor(initiator: Client, receiver: Client) {
    this.id = v4();
    this.initiator = initiator;
    this.receiver = receiver;
  }
}
