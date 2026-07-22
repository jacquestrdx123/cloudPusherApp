<template>
  <ion-item
    button
    :detail="false"
    lines="none"
    class="notif"
    :class="{ unread: !notification.read }"
    @click="$emit('select', notification)"
  >
    <div slot="start" class="notif__icon" :class="{ 'notif__icon--live': !notification.read }">
      <ion-icon :icon="notificationIcon" aria-hidden="true" />
    </div>
    <ion-label>
      <div class="notif__top">
        <h2>{{ notification.title }}</h2>
        <span class="notif__time">{{ formattedTime }}</span>
      </div>
      <p v-if="notification.companyName" class="notif__company">{{ notification.companyName }}</p>
      <p v-if="notification.body" class="notif__body">{{ notification.body }}</p>
    </ion-label>
    <span v-if="!notification.read" class="notif__dot" aria-label="Unread" />
  </ion-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  IonIcon,
  IonItem,
  IonLabel,
} from '@ionic/vue'
import {
  mailOutline,
  notificationsOutline,
  phonePortraitOutline,
} from 'ionicons/icons'
import type { ReceivedNotification } from '@/types/notification'

const props = defineProps<{
  notification: ReceivedNotification
}>()

defineEmits<{
  select: [notification: ReceivedNotification]
}>()

const notificationIcon = computed(() => {
  switch (props.notification.channel) {
    case 'mail':
      return mailOutline
    case 'sms':
      return phonePortraitOutline
    default:
      return notificationsOutline
  }
})

const formattedTime = computed(() => {
  const date = new Date(props.notification.deliveredAt)

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
})
</script>

<style scoped>
.notif {
  --background: transparent;
  --padding-start: 0.85rem;
  --inner-padding-end: 0.85rem;
  --min-height: 76px;
  margin: 0 0.65rem 0.45rem;
  border-radius: var(--cp-radius-sm);
  border: 1px solid var(--cp-border);
  background: var(--cp-surface);
}

.notif.unread {
  border-color: color-mix(in srgb, var(--ion-color-primary) 35%, var(--cp-border));
  background:
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--ion-color-primary) 10%, transparent),
      transparent 42%
    ),
    var(--cp-surface);
}

.notif__icon {
  display: grid;
  place-items: center;
  width: 2.55rem;
  height: 2.55rem;
  margin-inline-end: 0.65rem;
  border-radius: 0.85rem;
  background: var(--ion-color-light);
  color: var(--ion-color-medium);
  font-size: 1.2rem;
}

.notif__icon--live {
  background: color-mix(in srgb, var(--ion-color-primary) 18%, transparent);
  color: var(--ion-color-primary);
}

.notif__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.notif h2 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 550;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

.unread h2 {
  font-weight: 700;
}

.notif__time {
  flex-shrink: 0;
  font-size: 0.72rem;
  color: var(--ion-color-medium);
  font-weight: 500;
}

.notif__company {
  margin: 0.2rem 0 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--ion-color-primary);
}

.notif__body {
  margin: 0.25rem 0 0;
  color: var(--ion-color-medium);
  font-size: 0.88rem;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notif__dot {
  width: 0.5rem;
  height: 0.5rem;
  margin-inline-start: 0.4rem;
  border-radius: 50%;
  background: var(--ion-color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ion-color-primary) 25%, transparent);
}
</style>
