import { WebSocket, WebSocketServer, MessageEvent } from 'ws';
import { v4 as uuid } from 'uuid';
import { ObjectId } from 'bson';
import { authenticateUser } from '../middleware/authenticate';
import { SocketId } from '../common/types';
import { UserWithId } from '../model/User';
import { GroupWithId } from '../model/Group';
import { SocketListener } from './SocketListener';

const AUTH_TIMEOUT_DURATION = 30_000;

const authTimeouts = new Map<SocketId, NodeJS.Timeout>();
const sockets = new Map<SocketId, SocketListener>();
const groupRooms = new Map<GroupWithId['_id'], SocketListener[]>();

export function initWebsocketServer(wss: WebSocketServer) {
  wss.on('connection', initWebsocket);
}

function initWebsocket(socket: WebSocket) {
  const socketId = uuid();

  const authTimeout = setTimeout(() => {
    // Client did not authenticate in time. Disconnect it
    socket.close();
    authTimeouts.delete(socketId);
  }, AUTH_TIMEOUT_DURATION);
  authTimeouts.set(socketId, authTimeout);

  socket.addEventListener('message', message => authenticate(socketId, message));
}

/**
 * Checks a socket's authentication.
 */
async function authenticate(socketId: SocketId, message: MessageEvent) {
  const bearerString = message.data.toString();
  const socket = message.target;

  // todo return a response on success or failure

  if (!bearerString) {
    return;
  }

  const authResult = await authenticateUser(bearerString);
  if (!authResult.ok) {
    return;
  }

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
    const room = groupRooms.get(groupId) ?? [];
    groupRooms.set(groupId, [...room, listener]);
  }

  socket.on('close', () => {
    sockets.delete(socketId);
  });
}

interface OutboundPayload {
  entityType: 'app' | 'category' | 'group' | 'notification' | 'tag' | 'user';
  entity: ObjectId,
  [data: string]: unknown;
}
function send(payload: OutboundPayload, groups: GroupWithId[]) {
  const allGroupListeners = groups.flatMap(({ _id }) => groupRooms.get(_id) ?? []);

  allGroupListeners.forEach((listener => listener.send(payload)));
}