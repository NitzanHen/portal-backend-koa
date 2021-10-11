import { WebSocket } from 'ws';
import { SocketId } from '../common/types';
import { UserWithId } from '../model/User';

/**
 * An authenticated listener, listening for updates.
 */
export class SocketListener {
  constructor(
    public readonly socketId: SocketId,
    public readonly socket: WebSocket,
    public readonly user: UserWithId,
  ) {}

  send(message: object) {
    this.socket.send(JSON.stringify(message));
  }
}