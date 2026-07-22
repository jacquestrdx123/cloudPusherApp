<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Inbox</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="markAllRead" :disabled="store.unreadCount === 0" aria-label="Mark all read">
            <ion-icon slot="icon-only" :icon="checkmarkDoneOutline" />
          </ion-button>
          <ion-button @click="refresh" :disabled="store.syncing" aria-label="Refresh">
            <ion-icon slot="icon-only" :icon="refreshOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar v-if="store.pushReady || store.unreadCount" class="status-bar">
        <div class="status-row">
          <span v-if="store.pushReady" class="cp-status">
            <ion-icon :icon="radioOutline" />
            Push active
          </span>
          <span v-if="store.unreadCount" class="unread-pill">
            {{ store.unreadCount }} unread
          </span>
        </div>
      </ion-toolbar>
      <ion-toolbar v-if="configured && companies.length > 0" class="filter-bar">
        <div class="company-filters">
          <ion-chip
            :outline="inboxFilter !== ''"
            :color="inboxFilter === '' ? 'primary' : 'medium'"
            @click="setInboxFilter('')"
          >
            All
          </ion-chip>
          <ion-chip
            v-for="company in companies"
            :key="company.slug"
            :outline="inboxFilter !== company.slug"
            :color="inboxFilter === company.slug ? 'primary' : 'medium'"
            @click="setInboxFilter(company.slug)"
          >
            {{ company.name }}
          </ion-chip>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <div v-if="!configured" class="cp-empty">
        <div class="cp-empty__icon">
          <ion-icon :icon="settingsOutline" />
        </div>
        <h2>Sign in to cloudPusher</h2>
        <p>Log in with your mobile number to receive notifications.</p>
        <ion-button router-link="/login">Sign in</ion-button>
      </div>

      <div v-else-if="store.loading" class="cp-empty">
        <ion-spinner name="crescent" color="primary" />
        <p>Loading notifications…</p>
      </div>

      <div v-else-if="store.sortedItems.length === 0" class="cp-empty">
        <div class="cp-empty__icon">
          <ion-icon :icon="notificationsOffOutline" />
        </div>
        <h2>All clear</h2>
        <p>When a push arrives, it will show up here with sound.</p>
      </div>

      <div v-else class="inbox-list">
        <NotificationItem
          v-for="item in store.sortedItems"
          :key="item.id"
          :notification="item"
          @select="openNotification"
        />
      </div>

      <ion-toast
        :is-open="Boolean(toastMessage)"
        :message="toastMessage ?? ''"
        duration="2500"
        @didDismiss="toastMessage = null"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToast,
  IonToolbar,
  RefresherCustomEvent,
  onIonViewWillEnter,
} from '@ionic/vue'
import {
  checkmarkDoneOutline,
  notificationsOffOutline,
  radioOutline,
  refreshOutline,
  settingsOutline,
} from 'ionicons/icons'
import NotificationItem from '@/components/NotificationItem.vue'
import { useSettings } from '@/composables/useSettings'
import { initializePushNotifications, type PushPayload } from '@/services/push'
import { playNotificationSound, unlockAudio } from '@/services/sound'
import { useNotificationStore } from '@/stores/notifications'
import type { ReceivedNotification } from '@/types/notification'

const router = useRouter()
const route = useRoute()
const store = useNotificationStore()
const { settings, configured, hydrate, update } = useSettings()
const toastMessage = ref<string | null>(null)
const bootstrapped = ref(false)

const companies = computed(() => settings.value?.companies ?? [])
const inboxFilter = computed(() => settings.value?.inboxCompanyFilter ?? '')

async function setInboxFilter(slug: string): Promise<void> {
  await update({ inboxCompanyFilter: slug })

  if (settings.value) {
    await store.syncInbox(settings.value)
  }
}

async function openNotification(notification: ReceivedNotification): Promise<void> {
  await store.markRead(notification.id, settings.value ?? undefined)
  await router.push(`/tabs/inbox/${encodeURIComponent(notification.id)}`)
}

async function openFromPushPayload(payload: PushPayload): Promise<void> {
  const pushId = payload.data.push_notification_id

  if (pushId === undefined || pushId === null || pushId === '') {
    return
  }

  await openFromPushNotificationId(String(pushId))
}

async function openFromPushNotificationId(pushNotificationId: string): Promise<void> {
  if (!settings.value) {
    return
  }

  try {
    await store.syncInbox(settings.value)
  } catch {
    // Fall through to whatever is already cached locally.
  }

  const item = store.findByPushNotificationId(pushNotificationId)

  await router.replace({ path: '/tabs/inbox', query: {} })

  if (!item) {
    toastMessage.value = 'Notification received. Pull to refresh if it is missing.'

    return
  }

  await openNotification(item)
}

async function handlePendingDeepLink(): Promise<void> {
  const pushId = route.query.push_notification_id

  if (typeof pushId !== 'string' || pushId === '') {
    return
  }

  await openFromPushNotificationId(pushId)
}

function onServiceWorkerMessage(event: MessageEvent): void {
  if (event.data?.type !== 'NOTIFICATION_CLICK' || typeof event.data.url !== 'string') {
    return
  }

  const url = new URL(event.data.url, window.location.origin)
  const pushId = url.searchParams.get('push_notification_id')

  if (pushId) {
    void openFromPushNotificationId(pushId)

    return
  }

  void router.push(url.pathname + url.search)
}

async function bootstrap(): Promise<void> {
  await store.hydrateFromCache()
  const current = await hydrate()

  if (!configured.value) {
    return
  }

  store.loading = true

  try {
    await store.syncInbox(current)

    const token = await initializePushNotifications(
      current,
      async (payload) => {
        store.addFromPush(payload)
        await playNotificationSound(current.soundEnabled)
        toastMessage.value = payload.title
      },
      {
        onOpened: async (payload) => {
          await openFromPushPayload(payload)
        },
      },
    )

    store.pushReady = Boolean(token)
    await handlePendingDeepLink()
  } catch (error) {
    store.pushReady = false
    toastMessage.value =
      error instanceof Error ? error.message : 'Failed to connect'
  } finally {
    store.loading = false
    bootstrapped.value = true
  }
}

async function refresh(): Promise<void> {
  if (!settings.value) {
    return
  }

  await store.syncInbox(settings.value)
}

async function handleRefresh(event: RefresherCustomEvent): Promise<void> {
  await refresh()
  event.target.complete()
}

async function markAllRead(): Promise<void> {
  await store.markAllRead(settings.value ?? undefined)
}

onIonViewWillEnter(() => {
  if (!bootstrapped.value || !settings.value) {
    return
  }

  void (async () => {
    try {
      await store.syncInbox(settings.value!)
    } catch {
      // Keep showing cached notifications if refresh fails.
    }

    await handlePendingDeepLink()
  })()
})

watch(
  () => route.query.push_notification_id,
  (pushId) => {
    if (!bootstrapped.value || typeof pushId !== 'string' || pushId === '') {
      return
    }

    void openFromPushNotificationId(pushId)
  },
)

onMounted(async () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage)
  }

  await unlockAudio()
  await bootstrap()
})

onUnmounted(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.removeEventListener('message', onServiceWorkerMessage)
  }
})
</script>

<style scoped>
.status-bar,
.filter-bar {
  --min-height: 0;
  --padding-top: 0;
  --padding-bottom: 0;
}

.status-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1rem 0.65rem;
}

.unread-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.7rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ion-color-primary) 16%, transparent);
  color: var(--ion-color-primary);
  font-size: 0.78rem;
  font-weight: 650;
}

.company-filters {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.4rem;
  padding: 0 0.85rem 0.75rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.company-filters::-webkit-scrollbar {
  display: none;
}

.inbox-list {
  padding: 0.65rem 0 1.25rem;
}
</style>
