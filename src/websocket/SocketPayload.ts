import { Channel } from './Channel';

/**
 * All messages sent through a socket should be SocketPayloads,
 * Typically created with the socketPayload() factory function.
 */
export interface SocketPayload<T> {
  channel: Channel,
  message: T
}

/** A simple factory for SocketPayloads.  */
export const socketPayload = <T>(channel: Channel, message: T) => ({ channel, message });