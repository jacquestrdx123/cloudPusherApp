import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

/** Opens a URL in SFSafariViewController on iOS, Chrome Custom Tabs on Android. */
export async function openInAppBrowser(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url })
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}
