/**
 * Lightweight prefixed logger for push / notification debugging.
 *
 * All push-related lifecycle events log through here so they can be filtered
 * in the browser console by the `[push]` prefix. Flip `enabled` to false to
 * silence them in production.
 */
const PREFIX = '[push]'

export const pushLogging = {
  enabled: true,
}

export function pushLog(...args: unknown[]): void {
  if (pushLogging.enabled) {
    console.info(PREFIX, ...args)
  }
}

export function pushWarn(...args: unknown[]): void {
  if (pushLogging.enabled) {
    console.warn(PREFIX, ...args)
  }
}

export function pushError(...args: unknown[]): void {
  if (pushLogging.enabled) {
    console.error(PREFIX, ...args)
  }
}
