import { WebSocket } from 'ws';
import { SocketId } from '../common/types';
import { UserWithId } from '../model/User';
import { Channel } from './Channel';
import { socketPayload } from './SocketPayload';

/**
 * An authenticated listener, listening for updates.
 */
export class SocketListener {
  constructor(
    public readonly socketId: SocketId,
    public readonly socket: WebSocket,
    public readonly user: UserWithId,
  ) { }

  send(channel: Channel, message: any) {
    this.socket.send(JSON.stringify(socketPayload(channel, message)));
  }
}