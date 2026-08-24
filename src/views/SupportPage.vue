<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/login" />
        </ion-buttons>
        <ion-title>Support</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="cp-panel support-copy">
        <h2>cloudPusher help</h2>
        <p>
          cloudPusher delivers company notifications to this device. You sign in with the
          mobile number and password issued for your organization.
        </p>
      </div>

      <div class="cp-panel support-copy">
        <h2>Create or recover access</h2>
        <p>
          New users register in the app with a company slug, name, email, mobile number, and
          password. A company admin must approve the request before sign-in works.
        </p>
        <p>If you cannot sign in, ask your company administrator to confirm that your account is approved.</p>
        <ion-button expand="block" fill="outline" router-link="/register">
          Register in the app
        </ion-button>
      </div>

      <div class="cp-panel support-copy">
        <h2>Delete your account</h2>
        <p>
          Signed-in users can permanently delete their account from
          <strong>Settings → Delete account</strong>. This removes your profile, device tokens,
          and company memberships.
        </p>
      </div>

      <div class="cp-panel support-copy">
        <h2>Still need help?</h2>
        <p>
          Contact the administrator who invited you, or send a message through the cloudPusher
          contact page. Account and privacy requests are handled there.
        </p>
        <ion-button expand="block" fill="outline" @click="openContact">
          Contact form
        </ion-button>
        <ion-button expand="block" fill="clear" @click="openPrivacy">
          Privacy policy
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { config } from '@/config/env'
import { openInAppBrowser } from '@/services/browser'

async function openContact(): Promise<void> {
  await openInAppBrowser(config.contactUrl)
}

async function openPrivacy(): Promise<void> {
  await openInAppBrowser(config.privacyUrl)
}
</script>

<style scoped>
.support-copy {
  padding: 1.1rem 1rem 1.15rem;
}

.support-copy h2 {
  margin: 0 0 0.45rem;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.support-copy p {
  margin: 0 0 0.75rem;
  color: var(--ion-color-medium);
  line-height: 1.5;
  font-size: 0.95rem;
}

.support-copy ion-button {
  margin-top: 0.25rem;
}
</style>
