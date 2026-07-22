<template>
  <ion-page class="login-page">
    <ion-content :fullscreen="true">
      <div class="login-shell">
        <div class="brand">
          <img class="brand__mark" src="/apple-touch-icon.png" alt="" width="72" height="72" />
          <p class="brand__name">cloudPusher</p>
          <h1>Signal in. Act fast.</h1>
          <p class="brand__copy">Sign in with your mobile number to receive company notifications.</p>
        </div>

        <div class="login-card">
          <ion-list lines="full">
            <ion-item>
              <ion-input
                v-model="form.phone"
                label="Mobile number"
                label-placement="stacked"
                type="tel"
                placeholder="+27821234567"
                autocomplete="tel"
              />
            </ion-item>
            <ion-item>
              <ion-input
                v-model="form.password"
                label="Password"
                label-placement="stacked"
                type="password"
                autocomplete="current-password"
              />
            </ion-item>
          </ion-list>

          <div class="actions">
            <ion-button expand="block" size="large" :disabled="busy || !canSubmit" @click="signIn">
              {{ busy ? 'Signing in…' : 'Sign in' }}
            </ion-button>
            <ion-button
              expand="block"
              fill="clear"
              :href="contactUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              Need an account? Register
            </ion-button>
          </div>
        </div>
      </div>

      <ion-toast
        :is-open="Boolean(message)"
        :message="message ?? ''"
        :color="messageColor"
        duration="3500"
        @didDismiss="message = null"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonList,
  IonPage,
  IonToast,
} from '@ionic/vue'
import { useSettings } from '@/composables/useSettings'
import { config } from '@/config/env'
import { loginWithPassword } from '@/services/api'

const router = useRouter()
const { hydrate, update, configured } = useSettings()
const contactUrl = config.contactUrl

const busy = ref(false)
const message = ref<string | null>(null)
const messageColor = ref<'success' | 'danger' | 'warning'>('success')

const form = reactive({
  phone: '',
  password: '',
})

const canSubmit = computed(
  () => form.phone.trim().length >= 8 && form.password.length > 0,
)

onMounted(async () => {
  const current = await hydrate()

  if (configured.value) {
    router.replace('/tabs/inbox')
    return
  }

  form.phone = current.userPhone
})

async function signIn(): Promise<void> {
  busy.value = true
  message.value = null

  try {
    const phone = form.phone.trim()
    const response = await loginWithPassword(phone, form.password)

    if (!response.user.companies?.length && !response.user.company?.slug) {
      throw new Error('This account is not linked to a company.')
    }

    const companies = response.user.companies?.length
      ? response.user.companies
      : response.user.company
        ? [
            {
              id: response.user.company.id,
              name: response.user.company.name,
              slug: response.user.company.slug,
              is_company_admin: Boolean(response.user.is_company_admin),
            },
          ]
        : []

    const activeCompany =
      companies.find((company) => company.is_company_admin) ?? companies[0]

    await update({
      accessToken: response.token,
      companies,
      activeCompanySlug: activeCompany?.slug ?? '',
      companySlug: activeCompany?.slug ?? '',
      companyName: activeCompany?.name ?? '',
      userId: response.user.id,
      userName: response.user.name,
      userEmail: response.user.email,
      userPhone: response.user.phone ?? phone,
      isCompanyAdmin: companies.some((company) => company.is_company_admin),
      inboxCompanyFilter: '',
    })

    router.replace('/tabs/inbox')
  } catch (error) {
    messageColor.value = 'danger'
    message.value = error instanceof Error ? error.message : 'Sign in failed'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.login-shell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100%;
  padding: calc(2.5rem + env(safe-area-inset-top)) 1.25rem calc(2rem + env(safe-area-inset-bottom));
  background:
    radial-gradient(120% 70% at 10% -10%, color-mix(in srgb, var(--ion-color-primary) 28%, transparent), transparent 55%),
    radial-gradient(90% 50% at 100% 0%, color-mix(in srgb, #f97316 18%, transparent), transparent 50%),
    var(--ion-background-color);
}

.brand {
  margin: 0 0 1.75rem 0.15rem;
}

.brand__mark {
  display: block;
  width: 4.5rem;
  height: 4.5rem;
  margin-bottom: 1.1rem;
  border-radius: 1.15rem;
  box-shadow: 0 12px 28px color-mix(in srgb, var(--ion-color-primary) 35%, transparent);
}

.brand__name {
  margin: 0 0 0.55rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ion-color-primary);
}

.brand h1 {
  margin: 0 0 0.55rem;
  font-size: clamp(1.9rem, 6vw, 2.35rem);
  font-weight: 700;
  letter-spacing: -0.045em;
  line-height: 1.1;
}

.brand__copy {
  margin: 0;
  max-width: 18rem;
  color: var(--ion-color-medium);
  line-height: 1.5;
  font-size: 0.98rem;
}

.login-card {
  border-radius: var(--cp-radius);
  background: var(--cp-surface);
  border: 1px solid var(--cp-border);
  overflow: hidden;
  box-shadow: 0 18px 40px rgba(15, 20, 25, 0.08);
}

.login-card ion-list {
  background: transparent;
  padding-top: 0.35rem;
}

.actions {
  display: grid;
  gap: 0.25rem;
  padding: 1rem 1rem 1.15rem;
}
</style>
