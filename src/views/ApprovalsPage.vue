<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Approvals</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="refresh" :disabled="loading" aria-label="Refresh">
            <ion-icon slot="icon-only" :icon="refreshOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="!isCompanyAdmin" class="cp-empty">
        <div class="cp-empty__icon">
          <ion-icon :icon="shieldOutline" />
        </div>
        <h2>Company admin only</h2>
        <p>Ask a platform admin to grant you company admin access.</p>
      </div>

      <template v-else>
        <div class="cp-panel">
          <ion-list lines="full">
            <ion-list-header>Admin company</ion-list-header>
            <ion-item v-if="adminCompanies.length > 1">
              <ion-select
                :value="activeCompanySlug"
                label="Company"
                label-placement="stacked"
                interface="popover"
                @ionChange="onCompanyChange"
              >
                <ion-select-option
                  v-for="company in adminCompanies"
                  :key="company.slug"
                  :value="company.slug"
                >
                  {{ company.name }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item v-else>
              <ion-label>
                <h2>{{ activeCompanyName }}</h2>
              </ion-label>
            </ion-item>

            <ion-list-header>Add existing member</ion-list-header>
            <ion-item>
              <ion-input
                v-model="invitePhone"
                label="Mobile number"
                label-placement="stacked"
                type="tel"
                placeholder="+27821234567"
              />
            </ion-item>
            <ion-item lines="none">
              <ion-button
                expand="block"
                :disabled="inviting || !invitePhone.trim()"
                @click="inviteMember"
              >
                Add member
              </ion-button>
            </ion-item>
          </ion-list>
        </div>

        <div v-if="loading" class="cp-empty">
          <ion-spinner name="crescent" color="primary" />
          <p>Loading registrations…</p>
        </div>

        <div v-else-if="items.length === 0" class="cp-empty">
          <div class="cp-empty__icon">
            <ion-icon :icon="checkmarkCircleOutline" />
          </div>
          <h2>No pending registrations</h2>
          <p>New requests for {{ activeCompanyName }} will show up here.</p>
        </div>

        <div v-else class="cp-panel">
          <ion-list lines="full">
            <ion-list-header>Pending registrations</ion-list-header>
            <ion-item v-for="item in items" :key="item.id">
              <ion-label>
                <h2>{{ item.name }}</h2>
                <p>{{ item.phone }}</p>
                <p>{{ item.email }}</p>
                <p>Requested {{ formatDate(item.created_at) }}</p>
              </ion-label>
              <div slot="end" class="item-actions">
                <ion-button
                  size="small"
                  color="success"
                  :disabled="busyId === item.id"
                  @click="approve(item.id)"
                >
                  Approve
                </ion-button>
                <ion-button
                  size="small"
                  color="danger"
                  fill="outline"
                  :disabled="busyId === item.id"
                  @click="reject(item.id)"
                >
                  Reject
                </ion-button>
              </div>
            </ion-item>
          </ion-list>
        </div>
      </template>

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
import { computed, onMounted, ref } from 'vue'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/vue'
import { checkmarkCircleOutline, refreshOutline, shieldOutline } from 'ionicons/icons'
import { useSettings } from '@/composables/useSettings'
import {
  approveRegistration,
  fetchRegistrations,
  inviteCompanyMember,
  rejectRegistration,
} from '@/services/api'
import type { UserRegistrationItem } from '@/types/notification'

const { settings, hydrate, update } = useSettings()
const items = ref<UserRegistrationItem[]>([])
const loading = ref(true)
const busyId = ref<number | null>(null)
const inviting = ref(false)
const invitePhone = ref('')
const message = ref<string | null>(null)
const messageColor = ref<'success' | 'danger'>('success')

const isCompanyAdmin = computed(() => Boolean(settings.value?.isCompanyAdmin))
const adminCompanies = computed(
  () => settings.value?.companies.filter((company) => company.is_company_admin) ?? [],
)
const activeCompanySlug = computed(() => settings.value?.activeCompanySlug ?? '')
const activeCompanyName = computed(() => {
  const match = settings.value?.companies.find(
    (company) => company.slug === settings.value?.activeCompanySlug,
  )

  return match?.name || settings.value?.companyName || settings.value?.companySlug || 'Company'
})

function formatDate(value: string): string {
  return new Date(value).toLocaleString()
}

async function onCompanyChange(event: CustomEvent): Promise<void> {
  const slug = String(event.detail.value ?? '')
  const company = settings.value?.companies.find((item) => item.slug === slug)

  await update({
    activeCompanySlug: slug,
    companySlug: slug,
    companyName: company?.name ?? '',
  })
  await refresh()
}

async function refresh(): Promise<void> {
  const current = settings.value ?? (await hydrate())

  if (!current.isCompanyAdmin || !current.accessToken) {
    loading.value = false
    return
  }

  loading.value = true

  try {
    const response = await fetchRegistrations(current, 'pending')
    items.value = response.data
  } catch (error) {
    messageColor.value = 'danger'
    message.value = error instanceof Error ? error.message : 'Failed to load registrations'
  } finally {
    loading.value = false
  }
}

async function inviteMember(): Promise<void> {
  if (!settings.value) {
    return
  }

  inviting.value = true

  try {
    await inviteCompanyMember(settings.value, { phone: invitePhone.value.trim() })
    invitePhone.value = ''
    messageColor.value = 'success'
    message.value = 'Member added to this company'
  } catch (error) {
    messageColor.value = 'danger'
    message.value = error instanceof Error ? error.message : 'Could not add member'
  } finally {
    inviting.value = false
  }
}

async function approve(id: number): Promise<void> {
  if (!settings.value) {
    return
  }

  busyId.value = id

  try {
    await approveRegistration(settings.value, id)
    items.value = items.value.filter((item) => item.id !== id)
    messageColor.value = 'success'
    message.value = 'Registration approved'
  } catch (error) {
    messageColor.value = 'danger'
    message.value = error instanceof Error ? error.message : 'Approve failed'
  } finally {
    busyId.value = null
  }
}

async function reject(id: number): Promise<void> {
  if (!settings.value) {
    return
  }

  busyId.value = id

  try {
    await rejectRegistration(settings.value, id, 'Rejected by company admin')
    items.value = items.value.filter((item) => item.id !== id)
    messageColor.value = 'success'
    message.value = 'Registration rejected'
  } catch (error) {
    messageColor.value = 'danger'
    message.value = error instanceof Error ? error.message : 'Reject failed'
  } finally {
    busyId.value = null
  }
}

onMounted(async () => {
  await hydrate()
  await refresh()
})
</script>

<style scoped>
.item-actions {
  display: grid;
  gap: 0.35rem;
}
</style>
