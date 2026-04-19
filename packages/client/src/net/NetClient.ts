import { Client, Room } from 'colyseus.js';
import {
  ArenaState,
  INPUT_MESSAGE,
  INPUT_ACK,
  InputBatch,
  InputFrame,
  InputAckMessage,
} from '@glide/shared';

export interface NetEvents {
  onAck: (lastSeq: number) => void;
}

export class NetClient {
  private client: Client;
  private room: Room<ArenaState> | null = null;
  readonly events: NetEvents;

  constructor(events: NetEvents) {
    this.events = events;
    const url = import.meta.env.DEV
      ? 'ws://localhost:2567'
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
    this.client = new Client(url);
  }

  async join(): Promise<Room<ArenaState>> {
    this.room = await this.client.joinOrCreate<ArenaState>('arena');
    this.room.onMessage(INPUT_ACK, (msg: InputAckMessage) => this.events.onAck(msg.lastSeq));
    return this.room;
  }

  sendInputs(frames: InputFrame[]): void {
    if (!this.room) return;
    const batch: InputBatch = { frames };
    this.room.send(INPUT_MESSAGE, batch);
  }

  get sessionId(): string {
    return this.room?.sessionId ?? '';
  }

  get state(): ArenaState | null {
    return this.room?.state ?? null;
  }
}
