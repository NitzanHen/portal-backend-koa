import { WebSocket, WebSocketServer, MessageEvent } from 'ws';
import { v4 as uuid } from 'uuid';
import { ObjectId } from 'bson';
import { magenta } from 'chalk';
import { UserWithId } from '../model/User';
import { logger } from '../common/logger';
import { authenticate } from '../auth/authenticate';
import { SocketListener } from './SocketListener';
import { Channel } from './Channel';
import { socketPayload } from './SocketPayload';
import { SocketId } from './SocketId';

const AUTH_TIMEOUT_DURATION = 30_000;

const authTimeouts = new Map<SocketId, NodeJS.Timeout>();
const sockets = new Map<SocketId, SocketListener>();

const groupRooms = new Map<string, SocketListener[]>();

export function initWebsocketServer(wss: WebSocketServer) {
  wss.on('connection', initWebsocket);
}

function initWebsocket(socket: WebSocket) {
  const socketId = uuid();

  logger.info(`Opened auth window for socket ${magenta(socketId)}`);

  const authTimeout = setTimeout(() => {
    // Client did not authenticate in time. Notify and disconnect it
    socket.send(JSON.stringify(socketPayload(
      Channel.AUTH,
      'Auth window timed out'
    )));
    socket.close();
    authTimeouts.delete(socketId);

    logger.info(`Auth window for socket ${magenta(socketId)} timed out`);

  }, AUTH_TIMEOUT_DURATION);
  authTimeouts.set(socketId, authTimeout);

  socket.addEventListener('message', message => authenticateSocket(socketId, message));
}

/**
 * Checks a socket's authentication.
 */
async function authenticateSocket(socketId: SocketId, message: MessageEvent) {
  const bearerString = message.data.toString();
  const socket = message.target;

  // todo return a response on success or failure

  const authResult = await authenticate(bearerString);
  if (!authResult.ok) {
    const { err: error } = authResult;
    return socket.send(JSON.stringify(socketPayload(
      Channel.AUTH,
      (error as Error).message ?? error
    )));
  }

  socket.send(JSON.stringify(socketPayload(
    Channel.AUTH,
    'Authentication successful'
  )));
  const user = authResult.data;
  approveSocket(socketId, socket, user);
}

/**
 * This callback is meant to be called when authentication for a socket is successful.
 */
function approveSocket(socketId: SocketId, socket: WebSocket, user: UserWithId) {
  const authTimeout = authTimeouts.get(socketId);
  clearTimeout(authTimeout!);
  authTimeouts.delete(socketId);

  const listener = new SocketListener(socketId, socket, user);
  sockets.set(socketId, listener);

  // Add the listener to its group rooms
  for (const groupId of user.groups) {
    const groupIdHex = groupId.toHexString();
    const room = groupRooms.get(groupIdHex) ?? [];
    groupRooms.set(groupIdHex, [...room, listener]);
  }

  logger.info(`Socket ${magenta(socketId)} approved`);

  socket.on('close', () => {
    sockets.delete(socketId);
    logger.info(`Socket ${magenta(socketId)} disconnected`);
  });
}

interface OutboundPayload<T> {
  entity: ObjectId;
  action: 'created' | 'updated' | 'deleted';
  data?: T
}
export async function sendToClients<T>(channel: Channel, payload: OutboundPayload<T>, groups: ObjectId[] | '*') {
  const allGroupListeners = (
    groups === '*'
      ? [...groupRooms.values()]
      : groups.map(_id => groupRooms.get(_id.toHexString()) ?? [])
  )
    .flat()
    .reduce((acc, listener) => ({
      // Reduce into a socketId to listener record to remove duplicates
      ...acc,
      [listener.socketId]: listener
    }), {} as Record<SocketId, SocketListener>);

  Object.values(allGroupListeners).forEach((listener => listener.send(channel, payload)));
}