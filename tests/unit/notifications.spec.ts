import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  findNotificationByPushId,
  findNotificationByRouteId,
  inboxItemToNotification,
  mergeInboxItems,
  pushPayloadToNotification,
  useNotificationStore,
} from '@/stores/notifications'
import type { InboxApiItem, ReceivedNotification } from '@/types/notification'

vi.mock('@/services/api', () => ({
  fetchInbox: vi.fn(),
  markInboxRead: vi.fn(),
  markAllInboxRead: vi.fn(),
}))

vi.mock('@/services/storage', () => ({
  loadCachedInbox: vi.fn(async () => null),
  saveCachedInbox: vi.fn(async () => undefined),
}))

function makeInboxApiItem(overrides: Partial<InboxApiItem> = {}): InboxApiItem {
  return {
    id: 10,
    title: 'Synced',
    body: 'Body',
    payload: {},
    channel: 'push',
    delivered_at: '2026-07-15T10:00:00.000Z',
    read_at: null,
    read: false,
    created_at: '2026-07-15T10:00:00.000Z',
    push_notification_id: 42,
    company_id: 1,
    company: { id: 1, name: 'Acme', slug: 'acme' },
    ...overrides,
  }
}

describe('notification deep-link helpers', () => {
  it('maps inbox rows and push payloads with pushNotificationId', () => {
    const synced = inboxItemToNotification(makeInboxApiItem())
    const live = pushPayloadToNotification({
      title: 'Live',
      body: 'Body',
      data: { push_notification_id: '42' },
    })

    expect(synced).toMatchObject({
      id: 'inbox-10',
      serverId: 10,
      pushNotificationId: 42,
      source: 'sync',
      companySlug: 'acme',
      companyName: 'Acme',
    })
    expect(live).toMatchObject({
      id: 'push-42',
      pushNotificationId: 42,
      source: 'push',
    })
  })

  it('prefers synced inbox item when resolving by push id', () => {
    const synced = inboxItemToNotification(makeInboxApiItem())
    const live = pushPayloadToNotification({
      title: 'Live',
      body: null,
      data: { push_notification_id: 42 },
    })

    expect(findNotificationByPushId([live, synced], 42)?.id).toBe('inbox-10')
    expect(findNotificationByRouteId([synced], 'push-42')?.id).toBe('inbox-10')
  })

  it('drops orphan push items once the matching inbox row syncs', () => {
    const live = pushPayloadToNotification({
      title: 'Live',
      body: null,
      data: { push_notification_id: 42 },
    })
    const synced = [inboxItemToNotification(makeInboxApiItem())]

    const merged = mergeInboxItems(synced, [live])

    expect(merged).toHaveLength(1)
    expect(merged[0].id).toBe('inbox-10')
  })

  it('keeps unrelated local push items after sync', () => {
    const unrelated: ReceivedNotification = pushPayloadToNotification({
      title: 'Other',
      body: null,
      data: { push_notification_id: 99 },
    })
    const synced = [inboxItemToNotification(makeInboxApiItem())]

    const merged = mergeInboxItems(synced, [unrelated])

    expect(merged.map((item) => item.id).sort()).toEqual(['inbox-10', 'push-99'])
  })
})

describe('notification store deep links', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('finds notifications by push id after addFromPush', () => {
    const store = useNotificationStore()

    store.addFromPush({
      title: 'Hello',
      body: 'World',
      data: { push_notification_id: '7' },
    })

    expect(store.findByPushNotificationId('7')?.id).toBe('push-7')
    expect(store.findByRouteId('push-7')?.title).toBe('Hello')
  })
})
