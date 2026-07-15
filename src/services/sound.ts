import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { config } from '@/config/env'
import { pushLog, pushWarn } from '@/services/log'

let audio: HTMLAudioElement | null = null
let unlocked = false
let gesturePrimed = false

/**
 * Attach a one-time listener that retries {@link unlockAudio} the next time the
 * user interacts with the page. Autoplay policy only permits `audio.play()`
 * from within a user gesture, so calling `unlockAudio()` on mount always fails —
 * this makes the first real tap/keypress unlock it.
 */
function primeUnlockOnGesture(): void {
  if (gesturePrimed || unlocked || typeof window === 'undefined') {
    return
  }

  gesturePrimed = true

  const handler = (): void => {
    window.removeEventListener('pointerdown', handler)
    window.removeEventListener('keydown', handler)
    gesturePrimed = false
    pushLog('user gesture detected, retrying audio unlock')
    void unlockAudio()
  }

  window.addEventListener('pointerdown', handler)
  window.addEventListener('keydown', handler)
  pushLog('audio unlock primed for next user gesture')
}

export async function unlockAudio(): Promise<void> {
  if (unlocked || typeof Audio === 'undefined') {
    return
  }

  if (!audio) {
    audio = new Audio(config.soundPath)
    audio.preload = 'auto'
    audio.volume = 1
  }

  try {
    await audio.play()
    audio.pause()
    audio.currentTime = 0
    unlocked = true
    pushLog('audio unlocked')
  } catch (error) {
    // Browser requires a user gesture before audio can play. If this runs
    // outside a click/tap it lands here — retry on the next user interaction.
    pushWarn('audio unlock blocked (needs a user gesture), will retry on next tap:', error)
    primeUnlockOnGesture()
  }
}

export async function playNotificationSound(enabled: boolean): Promise<void> {
  if (!enabled) {
    pushLog('sound disabled in settings, skipping playback')

    return
  }

  if (typeof Audio === 'undefined') {
    return
  }

  if (!audio) {
    audio = new Audio(config.soundPath)
    audio.preload = 'auto'
  }

  audio.currentTime = 0

  try {
    await audio.play()
    pushLog('notification sound played (unlocked:', `${unlocked})`)
  } catch (error) {
    // Ignore autoplay restrictions; native push still plays system sound.
    pushWarn('notification sound blocked by autoplay policy:', error)
  }

  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium })
    } catch {
      // Haptics optional
    }
  }
}

export async function vibrateAlert(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return
  }

  try {
    await Haptics.notification({ type: 'WARNING' as never })
  } catch {
    // optional
  }
}
