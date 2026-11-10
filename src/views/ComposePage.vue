<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Send</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="loadingRecipients" aria-label="Refresh" @click="loadRecipients">
            <ion-icon slot="icon-only" :icon="refreshOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="!companies.length" class="cp-empty">
        <div class="cp-empty__icon">
          <ion-icon :icon="businessOutline" />
        </div>
        <h2>No company yet</h2>
        <p>Once a company admin approves you, you can message your colleagues here.</p>
      </div>

      <div v-else class="compose-shell">
        <div class="cp-panel">
          <ion-list lines="full">
            <ion-item v-if="companies.length > 1">
              <ion-select
                :value="companySlug"
                label="Company"
                label-placement="stacked"
                interface="popover"
                :disabled="sending"
                @ionChange="onCompanyChange"
              >
                <ion-select-option
                  v-for="company in companies"
                  :key="company.slug"
                  :value="company.slug"
                >
                  {{ company.name }}
                </ion-select-option>
              </ion-select>
            </ion-item>

            <ion-list-header>Send to</ion-list-header>
            <ion-item lines="none">
              <ion-segment :value="audience" :disabled="sending" @ionChange="onAudienceChange">
                <ion-segment-button value="people">
                  <ion-label>People</ion-label>
                </ion-segment-button>
                <ion-segment-button value="group">
                  <ion-label>Group</ion-label>
                </ion-segment-button>
                <ion-segment-button value="broadcast">
                  <ion-label>Everyone</ion-label>
                </ion-segment-button>
              </ion-segment>
            </ion-item>
          </ion-list>
        </div>

        <div v-if="audience === 'people'" class="cp-panel">
          <ion-searchbar
            :value="search"
            :debounce="300"
            placeholder="Search name, email, or number"
            :disabled="sending"
            @ionInput="onSearch"
          />

          <div v-if="loadingRecipients" class="compose-state">
            <ion-spinner name="crescent" color="primary" />
          </div>

          <p v-else-if="members.length === 0" class="compose-state">
            {{ search ? 'No colleagues match your search.' : 'No colleagues found in this company.' }}
          </p>

          <ion-list v-else lines="full">
            <ion-item lines="full">
              <ion-label color="medium">
                {{ selectedUserIds.length }} selected
              </ion-label>
              <ion-button slot="end" fill="clear" size="small" :disabled="sending" @click="toggleAllShown">
                {{ allShownSelected ? 'Clear shown' : 'Select all shown' }}
              </ion-button>
            </ion-item>
            <ion-item v-for="member in members" :key="member.id">
              <ion-checkbox
                :checked="selectedUserIds.includes(member.id)"
                :disabled="sending"
                justify="space-between"
                @ionChange="toggleMember(member.id)"
              >
                <span class="compose-member__name">
                  {{ member.name }}<span v-if="member.id === currentUserId" class="compose-member__you"> (you)</span>
                </span>
                <span class="compose-member__meta">{{ member.phone || member.email }}</span>
              </ion-checkbox>
            </ion-item>
          </ion-list>
        </div>

        <div v-else-if="audience === 'group'" class="cp-panel">
          <div v-if="loadingRecipients" class="compose-state">
            <ion-spinner name="crescent" color="primary" />
          </div>

          <p v-else-if="groups.length === 0" class="compose-state">
            This company has no groups yet. Choose People or Everyone instead.
          </p>

          <ion-list v-else lines="full">
            <ion-radio-group :value="selectedGroupId" @ionChange="onGroupChange">
              <ion-item v-for="group in groups" :key="group.id">
                <ion-radio :value="group.id" :disabled="sending" justify="space-between">
                  <span class="compose-member__name">{{ group.name }}</span>
                  <span class="compose-member__meta">
                    {{ group.users_count }} {{ group.users_count === 1 ? 'member' : 'members' }}
                  </span>
                </ion-radio>
              </ion-item>
            </ion-radio-group>
          </ion-list>
        </div>

        <div v-else class="cp-panel">
          <ion-item lines="none">
            <ion-icon slot="start" :icon="megaphoneOutline" color="primary" />
            <ion-label class="ion-text-wrap">
              Everyone in {{ activeCompanyName }} will get this message.
            </ion-label>
          </ion-item>
        </div>

        <div class="cp-panel">
          <ion-list lines="full">
            <ion-list-header>Message</ion-list-header>
            <ion-item>
              <ion-input
                v-model="title"
                label="Title"
                label-placement="stacked"
                placeholder="What is this about?"
                :maxlength="255"
                :disabled="sending"
              />
            </ion-item>
            <ion-item lines="none">
              <ion-textarea
                v-model="body"
                label="Message"
                label-placement="stacked"
                placeholder="Write your message"
                :auto-grow="true"
                :rows="4"
                :maxlength="2000"
                :counter="true"
                :disabled="sending"
              />
            </ion-item>
          </ion-list>
        </div>

        <div class="compose-actions">
          <ion-button expand="block" size="large" :disabled="!canSend" @click="confirmAndSend">
            <ion-icon slot="start" :icon="paperPlaneOutline" />
            {{ sending ? 'Sending…' : sendLabel }}
          </ion-button>
        </div>
      </div>

      <ion-alert
        :is-open="confirmBroadcastOpen"
        header="Send to everyone?"
        :message="`Everyone in ${activeCompanyName} will get a push notification.`"
        :buttons="confirmButtons"
        @didDismiss="confirmBroadcastOpen = false"
      />

      <ion-toast
        :is-open="Boolean(toastMessage)"
        :message="toastMessage ?? ''"
        :color="toastColor"
        duration="3000"
        @didDismiss="toastMessage = null"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  IonAlert,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonRadio,
  IonRadioGroup,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/vue'
import {
  businessOutline,
  megaphoneOutline,
  paperPlaneOutline,
  refreshOutline,
} from 'ionicons/icons'
import { useSettings } from '@/composables/useSettings'
import {
  describeRequestFailure,
  fetchCompanyGroups,
  fetchCompanyMembers,
  sendCompanyMessage,
} from '@/services/api'
import type {
  CompanyGroupItem,
  CompanyMemberItem,
  MessageRecipients,
} from '@/types/notification'

type Audience = 'people' | 'group' | 'broadcast'

const { settings, hydrate } = useSettings()

const companySlug = ref('')
const audience = ref<Audience>('people')
const search = ref('')
const members = ref<CompanyMemberItem[]>([])
const groups = ref<CompanyGroupItem[]>([])
const selectedUserIds = ref<number[]>([])
const selectedGroupId = ref<number | null>(null)
const title = ref('')
const body = ref('')
const loadingRecipients = ref(false)
const sending = ref(false)
const confirmBroadcastOpen = ref(false)
const toastMessage = ref<string | null>(null)
const toastColor = ref<'success' | 'danger'>('success')

const companies = computed(() => settings.value?.companies ?? [])
const currentUserId = computed(() => settings.value?.userId ?? null)
const activeCompanyName = computed(
  () => companies.value.find((company) => company.slug === companySlug.value)?.name ?? 'your company',
)

const allShownSelected = computed(
  () =>
    members.value.length > 0 &&
    members.value.every((member) => selectedUserIds.value.includes(member.id)),
)

const hasRecipients = computed(() => {
  if (audience.value === 'people') {
    return selectedUserIds.value.length > 0
  }

  if (audience.value === 'group') {
    return selectedGroupId.value !== null
  }

  return true
})

const canSend = computed(
  () => !sending.value && Boolean(companySlug.value) && Boolean(title.value.trim()) && hasRecipients.value,
)

const sendLabel = computed(() => {
  if (audience.value === 'broadcast') {
    return 'Send to everyone'
  }

  if (audience.value === 'group') {
    return 'Send to group'
  }

  const count = selectedUserIds.value.length

  return count ? `Send to ${count} ${count === 1 ? 'person' : 'people'}` : 'Send'
})

const confirmButtons = [
  { text: 'Cancel', role: 'cancel' },
  { text: 'Send', role: 'confirm', handler: () => void send() },
]

function showToast(message: string, color: 'success' | 'danger'): void {
  toastColor.value = color
  toastMessage.value = message
}

function defaultCompanySlug(): string {
  const current = settings.value

  if (!current) {
    return ''
  }

  const preferred = current.activeCompanySlug || current.companySlug

  return current.companies.some((company) => company.slug === preferred)
    ? preferred
    : current.companies[0]?.slug ?? ''
}

async function loadMembers(): Promise<void> {
  if (!settings.value || !companySlug.value) {
    return
  }

  const response = await fetchCompanyMembers(settings.value, companySlug.value, search.value)
  members.value = response.data
}

async function loadGroups(): Promise<void> {
  if (!settings.value || !companySlug.value) {
    return
  }

  groups.value = await fetchCompanyGroups(settings.value, companySlug.value)
}

async function loadRecipients(): Promise<void> {
  loadingRecipients.value = true

  try {
    await Promise.all([loadMembers(), loadGroups()])
  } catch (error) {
    showToast(describeRequestFailure(error), 'danger')
  } finally {
    loadingRecipients.value = false
  }
}

async function onCompanyChange(event: CustomEvent): Promise<void> {
  companySlug.value = String(event.detail.value ?? '')
  selectedUserIds.value = []
  selectedGroupId.value = null
  search.value = ''
  await loadRecipients()
}

function onAudienceChange(event: CustomEvent): void {
  audience.value = (event.detail.value as Audience) ?? 'people'
}

async function onSearch(event: CustomEvent): Promise<void> {
  search.value = String(event.detail.value ?? '')
  loadingRecipients.value = true

  try {
    await loadMembers()
  } catch (error) {
    showToast(describeRequestFailure(error), 'danger')
  } finally {
    loadingRecipients.value = false
  }
}

function toggleMember(userId: number): void {
  selectedUserIds.value = selectedUserIds.value.includes(userId)
    ? selectedUserIds.value.filter((id) => id !== userId)
    : [...selectedUserIds.value, userId]
}

function toggleAllShown(): void {
  const shownIds = members.value.map((member) => member.id)

  selectedUserIds.value = allShownSelected.value
    ? selectedUserIds.value.filter((id) => !shownIds.includes(id))
    : Array.from(new Set([...selectedUserIds.value, ...shownIds]))
}

function onGroupChange(event: CustomEvent): void {
  const value = event.detail.value

  selectedGroupId.value = typeof value === 'number' ? value : null
}

function recipients(): MessageRecipients {
  if (audience.value === 'broadcast') {
    return { type: 'broadcast' }
  }

  if (audience.value === 'group' && selectedGroupId.value !== null) {
    return { type: 'group', group_id: selectedGroupId.value }
  }

  return { type: 'users', user_ids: selectedUserIds.value }
}

function confirmAndSend(): void {
  if (!canSend.value) {
    return
  }

  if (audience.value === 'broadcast') {
    confirmBroadcastOpen.value = true
    return
  }

  void send()
}

function successMessage(sent: number): string {
  if (audience.value === 'broadcast') {
    return 'Message sent to everyone'
  }

  if (audience.value === 'group') {
    const group = groups.value.find((item) => item.id === selectedGroupId.value)

    return `Message sent to ${group?.name ?? 'the group'}`
  }

  return `Message sent to ${sent} ${sent === 1 ? 'person' : 'people'}`
}

async function send(): Promise<void> {
  if (!settings.value || !canSend.value) {
    return
  }

  sending.value = true

  try {
    const result = await sendCompanyMessage(settings.value, companySlug.value, {
      title: title.value.trim(),
      body: body.value.trim() || null,
      recipients: recipients(),
    })

    showToast(successMessage(result.sent), 'success')
    title.value = ''
    body.value = ''
    selectedUserIds.value = []
    selectedGroupId.value = null
  } catch (error) {
    showToast(describeRequestFailure(error), 'danger')
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  await hydrate()
  companySlug.value = defaultCompanySlug()
  await loadRecipients()
})
</script>

<style scoped>
.compose-shell {
  max-width: 44rem;
  margin: 0 auto;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));
}

.compose-state {
  display: flex;
  justify-content: center;
  margin: 0;
  padding: 1.5rem 1rem;
  color: var(--ion-color-medium);
  text-align: center;
}

.compose-member__name {
  display: block;
  font-weight: 550;
}

.compose-member__you {
  color: var(--ion-color-medium);
  font-weight: 400;
}

.compose-member__meta {
  display: block;
  margin-top: 0.15rem;
  color: var(--ion-color-medium);
  font-size: 0.85rem;
}

.compose-actions {
  margin: 1rem;
}

ion-segment {
  width: 100%;
}
</style>
