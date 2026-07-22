/**
 * Rich-media helpers shared by the push pipeline, the service worker and the
 * in-app notification views.
 *
 * The backend can attach an image/GIF to a notification by putting its URL
 * under any of {@link MEDIA_URL_KEYS}. Keep this list in sync with the iOS
 * Notification Service Extension (`ios/App/NotificationService/MediaDownloader.swift`)
 * so every platform reads the same payload.
 */
export const MEDIA_URL_KEYS = [
  'media_url',
  'image_url',
  'image',
  'attachment_url',
  'attachment-url',
  'media-url',
  'picture',
  'fcm_image',
] as const

function isHttpUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^https?:\/\//i.test(value.trim())
  )
}

/**
 * Pull the first usable media URL out of a push data payload, or null when the
 * notification has no image. Also understands FCM's nested
 * `fcm_options.image` shape.
 */
export function extractMediaUrl(
  data: Record<string, unknown> | undefined | null,
): string | null {
  if (!data) {
    return null
  }

  for (const key of MEDIA_URL_KEYS) {
    const value = data[key]

    if (isHttpUrl(value)) {
      return value.trim()
    }
  }

  const fcmOptions = data.fcm_options

  if (fcmOptions && typeof fcmOptions === 'object') {
    const image = (fcmOptions as Record<string, unknown>).image

    if (isHttpUrl(image)) {
      return image.trim()
    }
  }

  return null
}
