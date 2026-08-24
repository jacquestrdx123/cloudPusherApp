<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="auth-backdrop">
        <div class="auth-shell">
          <div class="auth-brand">
            <img class="auth-brand__mark" src="/apple-touch-icon.png" alt="" width="72" height="72" />
            <p class="auth-brand__name">cloudPusher</p>
            <h1>Create an account</h1>
            <p class="auth-brand__copy">
              Register with your company slug. A company admin must approve you before you can sign in.
            </p>
          </div>

          <div class="auth-card">
            <ion-list lines="full">
              <ion-item>
                <ion-input
                  v-model="form.companySlug"
                  label="Company slug"
                  label-placement="stacked"
                  placeholder="acme"
                  autocomplete="organization"
                  :disabled="busy"
                />
              </ion-item>
              <ion-item>
                <ion-input
                  v-model="form.name"
                  label="Full name"
                  label-placement="stacked"
                  autocomplete="name"
                  :disabled="busy"
                />
              </ion-item>
              <ion-item>
                <ion-input
                  v-model="form.email"
                  label="Email"
                  label-placement="stacked"
                  type="email"
                  autocomplete="email"
                  :disabled="busy"
                />
              </ion-item>
              <ion-item>
                <ion-input
                  v-model="form.phone"
                  label="Mobile number"
                  label-placement="stacked"
                  type="tel"
                  placeholder="+27821234567"
                  autocomplete="tel"
                  :disabled="busy"
                />
              </ion-item>
              <ion-item>
                <ion-input
                  v-model="form.password"
                  label="Password"
                  label-placement="stacked"
                  type="password"
                  autocomplete="new-password"
                  :disabled="busy"
                />
              </ion-item>
              <ion-item>
                <ion-input
                  v-model="form.passwordConfirmation"
                  label="Confirm password"
                  label-placement="stacked"
                  type="password"
                  autocomplete="new-password"
                  :disabled="busy"
                />
              </ion-item>
            </ion-list>

            <div v-if="errorMessage" class="auth-error" role="alert">
              {{ errorMessage }}
            </div>

            <div class="auth-actions">
              <ion-button expand="block" size="large" :disabled="busy" @click="register">
                {{ busy ? 'Submitting…' : 'Create account' }}
              </ion-button>
              <ion-button expand="block" fill="clear" router-link="/login" :disabled="busy">
                Already have an account? Sign in
              </ion-button>
            </div>
          </div>
        </div>
      </div>

      <ion-alert
        :is-open="Boolean(alertMessage)"
        :header="alertHeader"
        :message="alertMessage ?? ''"
        :buttons="alertButtons"
        @didDismiss="onAlertDismiss"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonAlert,
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonList,
  IonPage,
  type AlertButton,
} from '@ionic/vue'
import { ApiError, describeRequestFailure, registerCompanyUser } from '@/services/api'

const router = useRouter()

const busy = ref(false)
const errorMessage = ref<string | null>(null)
const alertMessage = ref<string | null>(null)
const alertHeader = ref('Registration failed')
const registered = ref(false)

const form = reactive({
  companySlug: '',
  name: '',
  email: '',
  phone: '',
  password: '',
  passwordConfirmation: '',
})

const alertButtons: AlertButton[] = [
  {
    text: 'OK',
    role: 'confirm',
  },
]

function showError(message: string): void {
  registered.value = false
  alertHeader.value = 'Registration failed'
  errorMessage.value = message
  alertMessage.value = message
}

function onAlertDismiss(): void {
  const shouldReturnToLogin = registered.value
  alertMessage.value = null

  if (shouldReturnToLogin) {
    router.replace('/login')
  }
}

async function register(): Promise<void> {
  if (busy.value) {
    return
  }

  const companySlug = form.companySlug.trim().toLowerCase()
  const name = form.name.trim()
  const email = form.email.trim()
  const phone = form.phone.trim()

  if (!companySlug || !name || !email || phone.length < 8) {
    showError('Fill in your company slug, name, email, and mobile number.')
    return
  }

  if (form.password.length < 8) {
    showError('Password must be at least 8 characters.')
    return
  }

  if (form.password !== form.passwordConfirmation) {
    showError('Password confirmation does not match.')
    return
  }

  busy.value = true
  errorMessage.value = null
  alertMessage.value = null

  try {
    await registerCompanyUser(companySlug, {
      name,
      email,
      phone,
      password: form.password,
      password_confirmation: form.passwordConfirmation,
    })

    registered.value = true
    alertHeader.value = 'Registration submitted'
    alertMessage.value =
      'A company admin must approve your account before you can sign in. You will use this mobile number and password after approval.'
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      showError('Company not found. Check the company slug and try again.')
    } else {
      showError(describeRequestFailure(error))
    }
  } finally {
    busy.value = false
  }
}
</script>
