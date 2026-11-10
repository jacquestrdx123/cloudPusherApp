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

            <ion-list-header>Add member</ion-list-header>
            <ion-item>
              <ion-input
                v-model="inviteForm.name"
                label="Full name"
                label-placement="stacked"
                autocomplete="name"
                placeholder="Thandi Mokoena"
              />
            </ion-item>
            <ion-item>
              <ion-input
                v-model="inviteForm.phone"
                label="Mobile number"
                label-placement="stacked"
                type="tel"
                autocomplete="tel"
                placeholder="+27821234567"
              />
            </ion-item>
            <ion-item>
              <ion-input
                v-model="inviteForm.email"
                label="E-mail"
                label-placement="stacked"
                type="email"
                autocomplete="email"
                placeholder="thandi@example.com"
              />
            </ion-item>
            <ion-item>
              <ion-toggle v-model="inviteForm.isCompanyAdmin">Company admin</ion-toggle>
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>
                  New people receive an invitation with a link to set their password. People who
                  already use cloudPusher are added straight away.
                </p>
              </ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-button
                expand="block"
                class="add-member-button"
                :disabled="inviting || !canInvite"
                @click="inviteMember"
              >
                Add member
              </ion-button>
            </ion-item>
          </ion-list>
        </div>

        <div v-if="invitations.length > 0" class="cp-panel">
          <ion-list lines="full">
            <ion-list-header>Pending invitations</ion-list-header>
            <ion-item v-for="invitation in invitations" :key="invitation.id">
              <ion-label>
                <h2>
                  {{ invitation.name }}
                  <span v-if="invitation.is_company_admin" class="admin-badge">Admin</span>
                </h2>
                <p>{{ invitation.phone }}</p>
                <p>{{ invitation.email }}</p>
                <p v-if="invitation.is_expired" class="expired">
                  Link expired {{ formatDate(invitation.expires_at) }}
                </p>
                <p v-else>Link valid until {{ formatDate(invitation.expires_at) }}</p>
              </ion-label>
              <div slot="end" class="item-actions">
                <ion-button
                  size="small"
                  :disabled="busyInvitationId === invitation.id"
                  @click="resend(invitation)"
                >
                  Resend
                </ion-button>
                <ion-button
                  size="small"
                  color="danger"
                  fill="outline"
                  :disabled="busyInvitationId === invitation.id"
                  @click="revokeTarget = invitation"
                >
                  Revoke
                </ion-button>
              </div>
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

      <ion-alert
        :is-open="revokeTarget !== null"
        header="Revoke invitation"
        :message="revokeAlertMessage"
        :buttons="revokeAlertButtons"
        @didDismiss="revokeTarget = null"
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
import {
  IonAlert,
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
  IonToggle,
  IonToolbar,
  type AlertButton,
} from '@ionic/vue'
import { checkmarkCircleOutline, refreshOutline, shieldOutline } from 'ionicons/icons'
import { useSettings } from '@/composables/useSettings'
import {
  approveRegistration,
  fetchInvitations,
  fetchRegistrations,
  inviteNewMember,
  rejectRegistration,
  resendInvitation,
  revokeInvitation,
} from '@/services/api'
import type { CompanyInvitationItem, UserRegistrationItem } from '@/types/notification'

const { settings, hydrate, update } = useSettings()
const items = ref<UserRegistrationItem[]>([])
const invitations = ref<CompanyInvitationItem[]>([])
const loading = ref(true)
const busyId = ref<number | null>(null)
const busyInvitationId = ref<number | null>(null)
const revokeTarget = ref<CompanyInvitationItem | null>(null)
const inviting = ref(false)
const inviteForm = reactive({
  name: '',
  phone: '',
  email: '',
  isCompanyAdmin: false,
})
const message = ref<string | null>(null)
const messageColor = ref<'success' | 'danger'>('success')

const canInvite = computed(
  () =>
    inviteForm.name.trim() !== '' &&
    inviteForm.phone.trim() !== '' &&
    /^\S+@\S+\.\S+$/.test(inviteForm.email.trim()),
)
const revokeAlertMessage = computed(() =>
  revokeTarget.value
    ? `${revokeTarget.value.name} will no longer be able to use their invitation link.`
    : '',
)
const revokeAlertButtons: AlertButton[] = [
  { text: 'Cancel', role: 'cancel' },
  {
    text: 'Revoke',
    role: 'destructive',
    handler: () => {
      if (revokeTarget.value) {
        void revoke(revokeTarget.value)
      }
    },
  },
]

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

  const [registrationsResult, invitationsResult] = await Promise.allSettled([
    fetchRegistrations(current, 'pending'),
    fetchInvitations(current),
  ])

  if (registrationsResult.status === 'fulfilled') {
    items.value = registrationsResult.value.data
  } else {
    showError(registrationsResult.reason, 'Failed to load registrations')
  }

  if (invitationsResult.status === 'fulfilled') {
    invitations.value = invitationsResult.value
  } else {
    invitations.value = []
    showError(invitationsResult.reason, 'Failed to load invitations')
  }

  loading.value = false
}

function showError(error: unknown, fallback: string): void {
  messageColor.value = 'danger'
  message.value = error instanceof Error ? error.message : fallback
}

function resetInviteForm(): void {
  inviteForm.name = ''
  inviteForm.phone = ''
  inviteForm.email = ''
  inviteForm.isCompanyAdmin = false
}

async function inviteMember(): Promise<void> {
  if (!settings.value || !canInvite.value) {
    return
  }

  inviting.value = true

  try {
    const result = await inviteNewMember(settings.value, {
      name: inviteForm.name,
      phone: inviteForm.phone,
      email: inviteForm.email,
      is_company_admin: inviteForm.isCompanyAdmin,
    })

    resetInviteForm()
    messageColor.value = 'success'
    message.value =
      result.status === 'invited'
        ? `Invitation sent to ${result.member.name}`
        : `${result.member.name} added to ${activeCompanyName.value}`

    if (result.status === 'invited') {
      invitations.value = await fetchInvitations(settings.value)
    }
  } catch (error) {
    showError(error, 'Could not add member')
  } finally {
    inviting.value = false
  }
}

async function resend(invitation: CompanyInvitationItem): Promise<void> {
  if (!settings.value) {
    return
  }

  busyInvitationId.value = invitation.id

  try {
    const updated = await resendInvitation(settings.value, invitation.id)
    invitations.value = invitations.value.map((item) => (item.id === updated.id ? updated : item))
    messageColor.value = 'success'
    message.value = `Invitation resent to ${invitation.name}`
  } catch (error) {
    showError(error, 'Could not resend invitation')
  } finally {
    busyInvitationId.value = null
  }
}

async function revoke(invitation: CompanyInvitationItem): Promise<void> {
  if (!settings.value) {
    return
  }

  busyInvitationId.value = invitation.id

  try {
    await revokeInvitation(settings.value, invitation.id)
    invitations.value = invitations.value.filter((item) => item.id !== invitation.id)
    messageColor.value = 'success'
    message.value = `Invitation for ${invitation.name} revoked`
  } catch (error) {
    showError(error, 'Could not revoke invitation')
  } finally {
    busyInvitationId.value = null
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

.add-member-button {
  width: 100%;
}

.admin-badge {
  margin-left: 0.4rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  font-size: 0.7rem;
  font-weight: 600;
  vertical-align: middle;
}

.expired {
  color: var(--ion-color-danger) !important;
}
</style>
