<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="auth-backdrop">
        <div class="auth-shell">
          <div class="auth-brand">
            <img class="auth-brand__mark" src="/apple-touch-icon.png" alt="" width="72" height="72" />
            <p class="auth-brand__name">cloudPusher</p>
            <h1>Signal in. Act fast.</h1>
            <p class="auth-brand__copy">Sign in with your mobile number to receive company notifications.</p>
          </div>

          <div class="auth-card">
            <ion-list lines="full">
              <ion-item>
                <ion-input
                  v-model="form.phone"
                  label="Mobile number"
                  label-placement="stacked"
                  type="tel"
                  placeholder="+27821234567"
                  autocomplete="tel"
                  :disabled="busy"
                  @keydown.enter="signIn"
                />
              </ion-item>
              <ion-item>
                <ion-input
                  v-model="form.password"
                  label="Password"
                  label-placement="stacked"
                  type="password"
                  autocomplete="current-password"
                  :disabled="busy"
                  @keydown.enter="signIn"
                />
              </ion-item>
            </ion-list>

            <div v-if="errorMessage" class="auth-error" role="alert">
              {{ errorMessage }}
            </div>

            <div class="auth-actions">
              <ion-button expand="block" size="large" :disabled="busy" @click="signIn">
                {{ busy ? 'Signing in…' : 'Sign in' }}
              </ion-button>
              <ion-button expand="block" fill="clear" router-link="/register" :disabled="busy">
                Need an account? Register
              </ion-button>
              <ion-button expand="block" fill="clear" color="medium" router-link="/support" :disabled="busy">
                Need help?
              </ion-button>
            </div>
          </div>
        </div>
      </div>

      <ion-alert
        :is-open="Boolean(alertMessage)"
        header="Sign in failed"
        :message="alertMessage ?? ''"
        :buttons="['OK']"
        @didDismiss="alertMessage = null"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonAlert,
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonList,
  IonPage,
} from '@ionic/vue'
import { useSettings } from '@/composables/useSettings'
import { describeRequestFailure, loginWithPassword } from '@/services/api'

const router = useRouter()
const { hydrate, update, configured } = useSettings()

const busy = ref(false)
const errorMessage = ref<string | null>(null)
const alertMessage = ref<string | null>(null)

const form = reactive({
  phone: '',
  password: '',
})

onMounted(async () => {
  const current = await hydrate()

  if (configured.value) {
    router.replace('/tabs/inbox')
    return
  }

  form.phone = current.userPhone
})

function showError(message: string): void {
  errorMessage.value = message
  alertMessage.value = message
}

async function signIn(): Promise<void> {
  if (busy.value) {
    return
  }

  const phone = form.phone.trim()
  const password = form.password

  if (phone.length < 8 || !password) {
    showError('Enter your mobile number and password, then tap Sign in.')
    return
  }

  busy.value = true
  errorMessage.value = null
  alertMessage.value = null

  try {
    const response = await loginWithPassword(phone, password)

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
    showError(describeRequestFailure(error))
  } finally {
    busy.value = false
  }
}
</script>
