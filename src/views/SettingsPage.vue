<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="settings-hero cp-panel">
        <div class="avatar">{{ initials }}</div>
        <div>
          <h2>{{ form.userName || 'Signed in' }}</h2>
          <p>{{ form.userPhone }}</p>
          <p v-if="form.userEmail">{{ form.userEmail }}</p>
        </div>
      </div>

      <div class="cp-panel">
        <ion-list lines="full">
          <ion-list-header>Companies</ion-list-header>
          <ion-item v-for="company in form.companies" :key="company.slug">
            <ion-label>
              <h2>{{ company.name }}</h2>
              <p>{{ company.slug }}</p>
              <p v-if="company.is_company_admin" class="admin-tag">Company admin</p>
            </ion-label>
          </ion-item>
          <ion-item v-if="form.companies.length === 0">
            <ion-label>
              <p>{{ form.companyName || form.companySlug || 'No companies' }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </div>

      <div class="cp-panel">
        <ion-list lines="full">
          <ion-list-header>Preferences</ion-list-header>
          <ion-item>
            <ion-input
              v-model="form.deviceName"
              label="Device name"
              label-placement="stacked"
              placeholder="iPhone 15, Pixel 8, Browser"
            />
          </ion-item>
          <ion-item>
            <ion-toggle v-model="form.soundEnabled">Play sound on receive</ion-toggle>
          </ion-item>
        </ion-list>
      </div>

      <div class="actions">
        <ion-button expand="block" @click="save" :disabled="saving">
          Save preferences
        </ion-button>
        <ion-button expand="block" fill="outline" @click="testSound">
          Test sound
        </ion-button>
        <ion-button expand="block" fill="outline" @click="enablePush" :disabled="enablingPush">
          Enable push notifications
        </ion-button>
        <ion-button expand="block" fill="outline" @click="openPrivacyPolicy">
          Privacy policy
        </ion-button>
        <ion-button expand="block" fill="clear" color="danger" @click="signOut" :disabled="saving">
          Sign out
        </ion-button>
        <ion-button
          expand="block"
          fill="clear"
          color="danger"
          @click="showDeleteAlert = true"
          :disabled="saving || deleting"
        >
          Delete account
        </ion-button>
      </div>

      <ion-note class="help">
        Push registers this device with the backend so company notifications can reach you.
        Deleting your account permanently removes your profile, device tokens, and company memberships.
      </ion-note>

      <ion-alert
        :is-open="showDeleteAlert"
        header="Delete account"
        message="This permanently deletes your cloudPusher account. Enter your password to confirm."
        :inputs="deleteAlertInputs"
        :buttons="deleteAlertButtons"
        @didDismiss="showDeleteAlert = false"
      />

      <ion-toast
        :is-open="Boolean(message)"
        :message="message ?? ''"
        :color="messageColor"
        duration="3000"
        @didDismiss="message = null"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import {
  IonAlert,
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonPage,
  IonTitle,
  IonToast,
  IonToggle,
  IonToolbar,
  type AlertButton,
  type AlertInput,
} from '@ionic/vue'
import { config } from '@/config/env'
import { useSettings } from '@/composables/useSettings'
import { deleteAccount, logout as apiLogout } from '@/services/api'
import { getCurrentPushToken, initializePushNotifications } from '@/services/push'
import { playNotificationSound, unlockAudio } from '@/services/sound'
import { useNotificationStore } from '@/stores/notifications'
import type { AppSettings } from '@/types/notification'

const router = useRouter()
const store = useNotificationStore()
const { hydrate, update, reset } = useSettings()

const form = reactive<AppSettings>({
  companies: [],
  activeCompanySlug: '',
  companySlug: '',
  companyName: '',
  accessToken: '',
  userId: null,
  userName: '',
  userEmail: '',
  userPhone: '',
  isCompanyAdmin: false,
  soundEnabled: true,
  deviceName: '',
  inboxCompanyFilter: '',
})

const saving = ref(false)
const deleting = ref(false)
const enablingPush = ref(false)
const showDeleteAlert = ref(false)
const message = ref<string | null>(null)
const messageColor = ref<'success' | 'danger' | 'warning'>('success')

const deleteAlertInputs: AlertInput[] = [
  {
    name: 'password',
    type: 'password',
    placeholder: 'Password',
    attributes: {
      autocomplete: 'current-password',
    },
  },
]

const deleteAlertButtons: AlertButton[] = [
  {
    text: 'Cancel',
    role: 'cancel',
  },
  {
    text: 'Delete',
    role: 'destructive',
    handler: (data) => {
      void confirmDeleteAccount(String(data?.password ?? ''))
      return false
    },
  },
]

const initials = computed(() => {
  const name = form.userName.trim()

  if (!name) {
    return 'CP'
  }

  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
})

onMounted(async () => {
  const current = await hydrate()
  Object.assign(form, current)
})

async function save(): Promise<void> {
  saving.value = true
  message.value = null

  try {
    await update({
      deviceName: form.deviceName,
      soundEnabled: form.soundEnabled,
    })
    messageColor.value = 'success'
    message.value = 'Preferences saved'
  } catch (error) {
    messageColor.value = 'danger'
    message.value = error instanceof Error ? error.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

async function testSound(): Promise<void> {
  await unlockAudio()
  await playNotificationSound(true)
  messageColor.value = 'success'
  message.value = 'Sound played'
}

async function enablePush(): Promise<void> {
  enablingPush.value = true
  message.value = null

  try {
    const current = await hydrate()

    if (!current.accessToken) {
      throw new Error('Sign in before enabling push notifications.')
    }

    const token = await initializePushNotifications(
      current,
      async (payload) => {
        store.addFromPush(payload)
        await playNotificationSound(current.soundEnabled)
      },
      { force: true },
    )

    store.pushReady = Boolean(token || getCurrentPushToken())
    messageColor.value = 'success'
    message.value = store.pushReady
      ? 'Push enabled — device token registered'
      : 'Permission granted — waiting for device token'
  } catch (error) {
    store.pushReady = false
    messageColor.value = 'danger'
    message.value = error instanceof Error ? error.message : 'Push setup failed'
  } finally {
    enablingPush.value = false
  }
}

async function openPrivacyPolicy(): Promise<void> {
  const url = config.privacyUrl

  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url })
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

async function signOut(): Promise<void> {
  saving.value = true
  message.value = null

  try {
    const current = await hydrate()

    if (current.accessToken) {
      try {
        await apiLogout(current)
      } catch {
        // Still clear local session if the API revoke fails.
      }
    }

    await reset()
    router.replace('/login')
  } finally {
    saving.value = false
  }
}

async function confirmDeleteAccount(password: string): Promise<void> {
  if (!password.trim()) {
    messageColor.value = 'danger'
    message.value = 'Enter your password to delete your account'
    return
  }

  deleting.value = true
  message.value = null

  try {
    const current = await hydrate()

    if (!current.accessToken) {
      throw new Error('Sign in before deleting your account.')
    }

    await deleteAccount(current, password)
    showDeleteAlert.value = false
    await reset()
    router.replace('/login')
  } catch (error) {
    messageColor.value = 'danger'
    message.value = error instanceof Error ? error.message : 'Account deletion failed'
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.settings-hero {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.1rem 1rem;
  margin-top: 0.85rem;
}

.avatar {
  display: grid;
  place-items: center;
  width: 3.35rem;
  height: 3.35rem;
  flex-shrink: 0;
  border-radius: 1rem;
  background: linear-gradient(145deg, var(--ion-color-primary), #f97316);
  color: #1a1205;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.settings-hero h2 {
  margin: 0 0 0.15rem;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.settings-hero p {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
  line-height: 1.4;
}

.admin-tag {
  color: var(--ion-color-primary) !important;
  font-weight: 600;
}

.actions {
  display: grid;
  gap: 0.5rem;
  margin: 1rem 1rem 0.5rem;
}

.help {
  display: block;
  margin: 0.75rem 1.25rem 2rem;
  line-height: 1.5;
  color: var(--ion-color-medium);
}
</style>
