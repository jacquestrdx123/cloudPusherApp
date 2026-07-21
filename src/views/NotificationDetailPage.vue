<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/inbox" />
        </ion-buttons>
        <ion-title>Notification</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" v-if="notification">
      <ion-card>
        <ion-card-header>
          <ion-card-subtitle>{{ notification.channel.toUpperCase() }}</ion-card-subtitle>
          <ion-card-title>{{ notification.title }}</ion-card-title>
        </ion-card-header>
        <img
          v-if="mediaUrl"
          class="notification-media"
          :src="mediaUrl"
          alt=""
        />
        <ion-card-content>
          <p v-if="notification.body">{{ notification.body }}</p>
          <ion-note>{{ formattedDeliveredAt }}</ion-note>
          <ion-note v-if="notification.readAt">Read {{ formattedReadAt }}</ion-note>
        </ion-card-content>
      </ion-card>

      <ion-list v-if="payloadEntries.length">
        <ion-list-header>Payload</ion-list-header>
        <ion-item v-for="[key, value] in payloadEntries" :key="key">
          <ion-label>
            <h3>{{ key }}</h3>
            <p>{{ formatValue(value) }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>

    <ion-content v-else class="ion-padding">
      <p>Notification not found.</p>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { useNotificationStore } from '@/stores/notifications'
import { extractMediaUrl } from '@/services/media'

const route = useRoute()
const store = useNotificationStore()

const notification = computed(() =>
  store.items.find((item) => item.id === decodeURIComponent(String(route.params.id))),
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
.notification-media {
  display: block;
  width: 100%;
  max-height: 320px;
  object-fit: cover;
}
</style>
