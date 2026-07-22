<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/inbox" text="" />
        </ion-buttons>
        <ion-title>Notification</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content v-if="notification">
      <article class="detail">
        <p class="detail__meta">
          <span class="channel">{{ notification.channel }}</span>
          <span v-if="notification.companyName">{{ notification.companyName }}</span>
        </p>
        <h1>{{ notification.title }}</h1>
        <img
          v-if="mediaUrl"
          class="notification-media"
          :src="mediaUrl"
          alt=""
        />
        <p v-if="notification.body" class="detail__body">{{ notification.body }}</p>
        <div class="detail__times">
          <span>Delivered {{ formattedDeliveredAt }}</span>
          <span v-if="notification.readAt">Read {{ formattedReadAt }}</span>
        </div>
      </article>

      <div v-if="payloadEntries.length" class="cp-panel">
        <ion-list lines="full">
          <ion-list-header>Payload</ion-list-header>
          <ion-item v-for="[key, value] in payloadEntries" :key="key">
            <ion-label>
              <h3>{{ key }}</h3>
              <p>{{ formatValue(value) }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>

    <ion-content v-else>
      <div class="cp-empty">
        <h2>Notification not found</h2>
        <p>It may have been cleared from this device.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { useNotificationStore } from '@/stores/notifications'
import { extractMediaUrl } from '@/services/media'

const route = useRoute()
const store = useNotificationStore()

const notification = computed(() =>
  store.findByRouteId(String(route.params.id)),
)

const mediaUrl = computed(() => extractMediaUrl(notification.value?.payload))

const payloadEntries = computed(() =>
  Object.entries(notification.value?.payload ?? {}),
)

const formattedDeliveredAt = computed(() => {
  if (!notification.value) {
    return ''
  }

  return new Date(notification.value.deliveredAt).toLocaleString()
})

const formattedReadAt = computed(() => {
  if (!notification.value?.readAt) {
    return ''
  }

  return new Date(notification.value.readAt).toLocaleString()
})

function formatValue(value: unknown): string {
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}
</script>

<style scoped>
.detail {
  margin: 0.85rem 1rem 1rem;
  padding: 1.35rem 1.2rem 1.25rem;
  border-radius: var(--cp-radius);
  background: var(--cp-surface);
  border: 1px solid var(--cp-border);
}

.detail__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  margin: 0 0 0.85rem;
  color: var(--ion-color-medium);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.channel {
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ion-color-primary) 16%, transparent);
  color: var(--ion-color-primary);
}

.detail h1 {
  margin: 0 0 0.75rem;
  font-size: 1.55rem;
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.2;
}

.notification-media {
  display: block;
  width: 100%;
  max-height: 320px;
  margin: 0 0 1rem;
  border-radius: calc(var(--cp-radius) - 4px);
  object-fit: cover;
}

.detail__body {
  margin: 0 0 1rem;
  color: var(--cp-ink-soft);
  font-size: 1.02rem;
  line-height: 1.55;
}

.detail__times {
  display: grid;
  gap: 0.25rem;
  color: var(--ion-color-medium);
  font-size: 0.82rem;
}
</style>
