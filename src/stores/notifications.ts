import { defineStore } from 'pinia'
import { fetchInbox, markAllInboxRead, markInboxRead } from '@/services/api'
import { loadCachedInbox, saveCachedInbox } from '@/services/storage'
import type { AppSettings, InboxApiItem, ReceivedNotification } from '@/types/notification'

function parsePushNotificationId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

export function inboxItemToNotification(item: InboxApiItem): ReceivedNotification {
  return {
    id: `inbox-${item.id}`,
    serverId: item.id,
    pushNotificationId: item.push_notification_id,
    title: item.title,
    body: item.body,
    payload: item.payload ?? {},
    channel: item.channel,
    deliveredAt: item.delivered_at ?? item.created_at,
    readAt: item.read_at,
    read: item.read,
    source: 'sync',
    companyId: item.company?.id ?? item.company_id ?? null,
    companyName: item.company?.name ?? null,
    companySlug: item.company?.slug ?? null,
  }
}

export function pushPayloadToNotification(payload: {
  title: string
  body: string | null
  data: Record<string, unknown>
}): ReceivedNotification {
  const pushNotificationId = parsePushNotificationId(payload.data.push_notification_id)

  return {
    id: pushNotificationId ? `push-${pushNotificationId}` : `push-${Date.now()}`,
    serverId: null,
    pushNotificationId,
    title: payload.title,
    body: payload.body,
    payload: payload.data,
    channel: 'push',
    deliveredAt: new Date().toISOString(),
    readAt: null,
    read: false,
    source: 'push',
    companyId: typeof payload.data.company_id === 'number' ? payload.data.company_id : null,
    companyName: typeof payload.data.company_name === 'string' ? payload.data.company_name : null,
    companySlug: typeof payload.data.company_slug === 'string' ? payload.data.company_slug : null,
  }
}

export function findNotificationByRouteId(
  items: ReceivedNotification[],
  routeId: string,
): ReceivedNotification | undefined {
  const decoded = decodeURIComponent(routeId)
  const direct = items.find((item) => item.id === decoded)

  if (direct) {
    return direct
  }

  if (decoded.startsWith('push-')) {
    return findNotificationByPushId(items, decoded.slice('push-'.length))
  }

  if (decoded.startsWith('inbox-')) {
    const serverId = Number(decoded.slice('inbox-'.length))

    if (Number.isFinite(serverId)) {
      return items.find((item) => item.serverId === serverId)
    }
  }

  return undefined
}

export function findNotificationByPushId(
  items: ReceivedNotification[],
  pushNotificationId: string | number,
): ReceivedNotification | undefined {
  const id = parsePushNotificationId(pushNotificationId)

  if (id === null) {
    return undefined
  }

  return (
    items.find((item) => item.pushNotificationId === id && item.source === 'sync') ??
    items.find((item) => item.pushNotificationId === id)
  )
}

export function mergeInboxItems(
  synced: ReceivedNotification[],
  existing: ReceivedNotification[],
): ReceivedNotification[] {
  const merged = new Map<string, ReceivedNotification>()
  const syncedPushIds = new Set(
    synced
      .map((item) => item.pushNotificationId)
      .filter((id): id is number => id !== null),
  )

  for (const item of synced) {
    merged.set(item.serverId ? `inbox-${item.serverId}` : item.id, item)
  }

  for (const item of existing) {
    if (item.source !== 'push' || item.serverId !== null) {
      continue
    }

    if (item.pushNotificationId !== null && syncedPushIds.has(item.pushNotificationId)) {
      continue
    }

    merged.set(item.id, item)
  }

  return [...merged.values()]
}

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    items: [] as ReceivedNotification[],
    loading: false,
    syncing: false,
    error: null as string | null,
    pushReady: false,
    lastSyncAt: null as string | null,
  }),

  getters: {
    unreadCount: (state) => state.items.filter((item) => !item.read).length,
    sortedItems: (state) =>
      [...state.items].sort(
        (a, b) =>
          new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime(),
      ),
  },

  actions: {
    async hydrateFromCache(): Promise<void> {
      const cached = await loadCachedInbox()

      if (!cached) {
        return
      }

      const parsed = JSON.parse(cached) as ReceivedNotification[]

      this.items = parsed.map((item) => ({
        ...item,
        pushNotificationId:
          item.pushNotificationId ??
          parsePushNotificationId(item.payload?.push_notification_id) ??
          null,
      }))
    },

    async persistCache(): Promise<void> {
      await saveCachedInbox(JSON.stringify(this.items.slice(0, 200)))
    },

    addFromPush(payload: {
      title: string
      body: string | null
      data: Record<string, unknown>
    }): ReceivedNotification {
      const notification = pushPayloadToNotification(payload)
      const existingIndex = this.items.findIndex(
        (item) =>
          item.id === notification.id ||
          (notification.pushNotificationId !== null &&
            item.pushNotificationId === notification.pushNotificationId),
      )

      if (existingIndex >= 0) {
        const existing = this.items[existingIndex]

        // Prefer an already-synced inbox row over a live push duplicate.
        if (existing.source === 'sync') {
          return existing
        }

        this.items[existingIndex] = notification
      } else {
        this.items.unshift(notification)
      }

      void this.persistCache()

      return notification
    },

    findByPushNotificationId(
      pushNotificationId: string | number,
    ): ReceivedNotification | undefined {
      return findNotificationByPushId(this.items, pushNotificationId)
    },

    findByRouteId(routeId: string): ReceivedNotification | undefined {
      return findNotificationByRouteId(this.items, routeId)
    },

    async markRead(id: string, settings?: AppSettings): Promise<void> {
      const item = this.items.find((entry) => entry.id === id)

      if (!item || item.read) {
        return
      }

      item.read = true
      item.readAt = new Date().toISOString()

      if (settings && item.serverId !== null) {
        try {
          const updated = await markInboxRead(settings, item.serverId)
          item.read = updated.read
          item.readAt = updated.read_at
        } catch {
          // Keep optimistic read state locally.
        }
      }

      await this.persistCache()
    },

    async markAllRead(settings?: AppSettings): Promise<void> {
      if (settings) {
        try {
          await markAllInboxRead(settings)
        } catch {
          // Fall through to local update.
        }
      }

      this.items.forEach((item) => {
        item.read = true
        item.readAt = item.readAt ?? new Date().toISOString()
      })

      await this.persistCache()
    },

    async syncInbox(settings: AppSettings): Promise<void> {
      this.syncing = true
      this.error = null

      try {
        const response = await fetchInbox(settings)
        const synced = response.data.map(inboxItemToNotification)

        this.items = mergeInboxItems(synced, this.items)
        this.lastSyncAt = new Date().toISOString()
        await this.persistCache()
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Sync failed'
        throw error
      } finally {
        this.syncing = false
      }
    },
  },
})
