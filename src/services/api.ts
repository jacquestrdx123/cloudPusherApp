import { config } from '@/config/env'
import type {
  AppSettings,
  AuthUser,
  InboxApiItem,
  PaginatedResponse,
  UserRegistrationItem,
} from '@/types/notification'

export const REQUEST_TIMEOUT_MS = 15_000

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function describeRequestFailure(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'The server did not respond. Check your connection and try again.'
  }

  if (error instanceof TypeError) {
    return 'Could not reach the server. Check your internet connection and try again.'
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Something went wrong. Please try again.'
}

function headers(accessToken?: string): HeadersInit {
  const result: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    result.Authorization = `Bearer ${accessToken}`
  }

  return result
}

function apiBase(): string {
  return config.apiBaseUrl.replace(/\/$/, '')
}

function authUrl(path: string): string {
  return `${apiBase()}/api/v1/auth${path}`
}

function v1Url(path: string): string {
  return `${apiBase()}/api/v1${path}`
}

function companyUrl(companySlug: string, path: string): string {
  return `${apiBase()}/api/v1/${companySlug}${path}`
}

function adminCompanySlug(settings: AppSettings): string {
  return (
    settings.activeCompanySlug ||
    settings.companies.find((company) => company.is_company_admin)?.slug ||
    settings.companySlug
  )
}

async function request<T>(
  url: string,
  init?: RequestInit,
  accessToken?: string,
): Promise<T> {
  const controller = new AbortController()
  let timeoutId = 0

  try {
    const response = await Promise.race([
      fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          ...headers(accessToken),
          ...(init?.headers ?? {}),
        },
      }),
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          controller.abort()
          reject(new DOMException('The request timed out.', 'AbortError'))
        }, REQUEST_TIMEOUT_MS)
      }),
    ])

    if (!response.ok) {
      let message = defaultHttpErrorMessage(response.status)

      try {
        const body = await response.json()
        const firstError = Object.values(body.errors ?? {}).flat()[0]
        message =
          (typeof firstError === 'string' ? firstError : null) ??
          (typeof body.message === 'string' ? body.message : null) ??
          message
      } catch {
        // ignore parse errors
      }

      throw new ApiError(message, response.status)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.json() as Promise<T>
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    throw new ApiError(describeRequestFailure(error), 0)
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function defaultHttpErrorMessage(status: number): string {
  if (status === 401) {
    return 'Incorrect mobile number or password.'
  }

  if (status === 404) {
    return 'The requested resource was not found.'
  }

  if (status >= 500) {
    return 'The server is temporarily unavailable. Please try again later.'
  }

  return `Request failed (${status})`
}

export async function registerCompanyUser(
  companySlug: string,
  payload: {
    name: string
    email: string
    phone: string
    password: string
    password_confirmation: string
  },
): Promise<{ data: UserRegistrationItem }> {
  return request(companyUrl(companySlug, '/auth/register'), {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function loginWithPassword(
  phone: string,
  password: string,
): Promise<{ token: string; token_type: string; user: AuthUser }> {
  return request(authUrl('/login'), {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  })
}

export async function fetchCurrentUser(settings: AppSettings): Promise<AuthUser> {
  const response = await request<{ data: AuthUser }>(
    authUrl('/me'),
    { method: 'GET' },
    settings.accessToken,
  )

  return response.data
}

export async function logout(settings: AppSettings): Promise<void> {
  await request(authUrl('/logout'), { method: 'POST' }, settings.accessToken)
}

export async function deleteAccount(
  settings: AppSettings,
  password: string,
): Promise<void> {
  await request(
    authUrl('/account'),
    {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    },
    settings.accessToken,
  )
}

export async function registerDeviceToken(
  settings: AppSettings,
  payload: {
    platform: 'fcm' | 'apns'
    token: string
    name?: string
  },
): Promise<void> {
  await request(
    v1Url('/device-tokens'),
    {
      method: 'POST',
      body: JSON.stringify({
        platform: payload.platform,
        token: payload.token,
        name: payload.name,
      }),
    },
    settings.accessToken,
  )
}

export async function unregisterDeviceToken(
  settings: AppSettings,
  deviceTokenId: number,
): Promise<void> {
  await request(
    v1Url(`/device-tokens/${deviceTokenId}`),
    { method: 'DELETE' },
    settings.accessToken,
  )
}

export async function fetchInbox(
  settings: AppSettings,
  page = 1,
  companySlug?: string,
): Promise<PaginatedResponse<InboxApiItem>> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: '50',
  })

  const filter = companySlug ?? settings.inboxCompanyFilter

  if (filter) {
    params.set('company', filter)
  }

  return request(
    v1Url(`/inbox?${params}`),
    { method: 'GET' },
    settings.accessToken,
  )
}

export async function markInboxRead(
  settings: AppSettings,
  inboxId: number,
): Promise<InboxApiItem> {
  const response = await request<{ data: InboxApiItem }>(
    v1Url(`/inbox/${inboxId}/read`),
    { method: 'PATCH' },
    settings.accessToken,
  )

  return response.data
}

export async function markAllInboxRead(settings: AppSettings): Promise<void> {
  const params = new URLSearchParams()

  if (settings.inboxCompanyFilter) {
    params.set('company', settings.inboxCompanyFilter)
  }

  const query = params.toString()

  await request(
    v1Url(`/inbox/read-all${query ? `?${query}` : ''}`),
    { method: 'PATCH' },
    settings.accessToken,
  )
}

export async function testConnection(settings: AppSettings): Promise<boolean> {
  await fetchInbox(settings, 1)

  return true
}

export async function fetchRegistrations(
  settings: AppSettings,
  status: 'pending' | 'approved' | 'rejected' = 'pending',
): Promise<PaginatedResponse<UserRegistrationItem>> {
  const params = new URLSearchParams({ status, per_page: '50' })
  const slug = adminCompanySlug(settings)

  return request(
    companyUrl(slug, `/registrations?${params}`),
    { method: 'GET' },
    settings.accessToken,
  )
}

export async function approveRegistration(
  settings: AppSettings,
  registrationId: number,
  notes?: string,
): Promise<UserRegistrationItem> {
  const slug = adminCompanySlug(settings)
  const response = await request<{ data: UserRegistrationItem }>(
    companyUrl(slug, `/registrations/${registrationId}/approve`),
    {
      method: 'POST',
      body: JSON.stringify({ notes: notes ?? null }),
    },
    settings.accessToken,
  )

  return response.data
}

export async function rejectRegistration(
  settings: AppSettings,
  registrationId: number,
  notes?: string,
): Promise<UserRegistrationItem> {
  const slug = adminCompanySlug(settings)
  const response = await request<{ data: UserRegistrationItem }>(
    companyUrl(slug, `/registrations/${registrationId}/reject`),
    {
      method: 'POST',
      body: JSON.stringify({ notes: notes ?? null }),
    },
    settings.accessToken,
  )

  return response.data
}

export async function inviteCompanyMember(
  settings: AppSettings,
  payload: { phone?: string; email?: string },
): Promise<void> {
  const slug = adminCompanySlug(settings)

  await request(
    companyUrl(slug, '/members'),
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    settings.accessToken,
  )
}
