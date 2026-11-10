import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  ApiError,
  REQUEST_TIMEOUT_MS,
  describeRequestFailure,
  fetchCompanyGroups,
  fetchCompanyMembers,
  fetchInvitations,
  inviteNewMember,
  loginWithPassword,
  normalizePhoneInput,
  resendInvitation,
  revokeInvitation,
  sendCompanyMessage,
} from '@/services/api'

describe('describeRequestFailure', () => {
  test('explains a network failure', () => {
    expect(describeRequestFailure(new TypeError('Failed to fetch'))).toMatch(
      /Could not reach the server/,
    )
  })

  test('explains a timeout', () => {
    expect(describeRequestFailure(new DOMException('Aborted', 'AbortError'))).toMatch(
      /did not respond/,
    )
  })

  test('keeps an ApiError message', () => {
    expect(describeRequestFailure(new ApiError('Incorrect password.', 401))).toBe(
      'Incorrect password.',
    )
  })
})

describe('loginWithPassword', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  test('maps a dropped connection to a clear error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    await expect(loginWithPassword('+27821234567', 'secret')).rejects.toMatchObject({
      name: 'ApiError',
      message: expect.stringMatching(/Could not reach the server/),
    })
  })

  test('times out a hung request', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'))
            })
          }),
      ),
    )

    const pending = loginWithPassword('+27821234567', 'secret')
    const expectation = expect(pending).rejects.toMatchObject({
      name: 'ApiError',
      message: expect.stringMatching(/did not respond/),
    })

    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)
    await expectation
  })

  test('surfaces a 5xx outage instead of a generic parse failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      }),
    )

    await expect(loginWithPassword('+27821234567', 'secret')).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
      message: expect.stringMatching(/temporarily unavailable/),
    })
  })

  test('explains a 429 when the server body has no message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => {
          throw new SyntaxError('Unexpected token')
        },
      }),
    )

    await expect(loginWithPassword('+27821234567', 'secret')).rejects.toMatchObject({
      status: 429,
      message: expect.stringMatching(/Too many attempts/),
    })
  })

  test('prefers the server validation message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({
          message: 'These credentials do not match our records.',
          errors: { phone: ['These credentials do not match our records.'] },
        }),
      }),
    )

    await expect(loginWithPassword('+27821234567', 'secret')).rejects.toMatchObject({
      status: 422,
      message: 'These credentials do not match our records.',
    })
  })

  test('never shows a raw status code for unexpected errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 418,
        json: async () => ({}),
      }),
    )

    await expect(loginWithPassword('+27821234567', 'secret')).rejects.toMatchObject({
      message: expect.not.stringMatching(/418/),
    })
  })
})

describe('company messaging', () => {
  const settings = {
    companies: [],
    activeCompanySlug: 'acme',
    companySlug: 'acme',
    companyName: 'Acme',
    accessToken: 'token-123',
    userId: 1,
    userName: 'Lerato',
    userEmail: 'lerato@example.com',
    userPhone: '+27821234567',
    isCompanyAdmin: false,
    soundEnabled: true,
    deviceName: 'iPad',
    inboxCompanyFilter: '',
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubJson(body: unknown, status = 200) {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: status < 400,
      status,
      json: async () => body,
    })

    vi.stubGlobal('fetch', fetchMock)

    return fetchMock
  }

  test('searches company members with the bearer token', async () => {
    const fetchMock = stubJson({ data: [{ id: 2, name: 'Thandi' }] })

    const response = await fetchCompanyMembers(settings, 'acme', ' thandi ')

    expect(response.data[0].name).toBe('Thandi')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/v1\/acme\/members\?per_page=100&search=thandi$/)
    expect(init.headers.Authorization).toBe('Bearer token-123')
  })

  test('loads company groups', async () => {
    stubJson({ data: [{ id: 5, name: 'Drivers', slug: 'drivers', users_count: 3 }] })

    await expect(fetchCompanyGroups(settings, 'acme')).resolves.toEqual([
      { id: 5, name: 'Drivers', slug: 'drivers', users_count: 3 },
    ])
  })

  test('posts a message to selected people', async () => {
    const fetchMock = stubJson({ data: { sent: 2, notification_ids: [10, 11] } }, 202)

    const result = await sendCompanyMessage(settings, 'acme', {
      title: 'Meeting at 10',
      recipients: { type: 'users', user_ids: [2, 3] },
    })

    expect(result.sent).toBe(2)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/v1\/acme\/messages$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      title: 'Meeting at 10',
      recipients: { type: 'users', user_ids: [2, 3] },
    })
  })

  test('surfaces the server validation message when sending fails', async () => {
    stubJson(
      {
        message: 'One or more selected people are not members of this company.',
        errors: {
          'recipients.user_ids': ['One or more selected people are not members of this company.'],
        },
      },
      422,
    )

    await expect(
      sendCompanyMessage(settings, 'acme', {
        title: 'Hi',
        recipients: { type: 'users', user_ids: [99] },
      }),
    ).rejects.toMatchObject({
      status: 422,
      message: 'One or more selected people are not members of this company.',
    })
  })
})

describe('company invitations', () => {
  const settings = {
    companies: [{ id: 1, name: 'Acme', slug: 'acme', is_company_admin: true }],
    activeCompanySlug: 'acme',
    companySlug: 'acme',
    companyName: 'Acme',
    accessToken: 'token-123',
    userId: 1,
    userName: 'Anele',
    userEmail: 'anele@example.com',
    userPhone: '+27821234567',
    isCompanyAdmin: true,
    soundEnabled: true,
    deviceName: 'iPad',
    inboxCompanyFilter: '',
  }

  const invitation = {
    id: 7,
    user_id: 12,
    name: 'Thandi',
    email: 'thandi@example.com',
    phone: '+27825550001',
    is_company_admin: false,
    invited_by: 'Anele',
    expires_at: '2026-10-07T10:00:00+00:00',
    is_expired: false,
    created_at: '2026-09-30T10:00:00+00:00',
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubJson(body: unknown, status = 200) {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: status < 400,
      status,
      json: async () => body,
    })

    vi.stubGlobal('fetch', fetchMock)

    return fetchMock
  }

  test('invites a new member with a normalised phone number', async () => {
    const fetchMock = stubJson(
      {
        data: {
          status: 'invited',
          member: { id: 12, name: 'Thandi', email: 'thandi@example.com', phone: '+27825550001', is_company_admin: true },
        },
      },
      201,
    )

    const result = await inviteNewMember(settings, {
      name: ' Thandi ',
      email: ' thandi@example.com ',
      phone: '+27 82 555 0001',
      is_company_admin: true,
    })

    expect(result.status).toBe('invited')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/v1\/acme\/invitations$/)
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer token-123')
    expect(JSON.parse(init.body)).toEqual({
      name: 'Thandi',
      email: 'thandi@example.com',
      phone: '+27825550001',
      is_company_admin: true,
    })
  })

  test('surfaces the server message when an invite is rejected', async () => {
    stubJson({ message: 'Only company admins can manage invitations.' }, 403)

    await expect(
      inviteNewMember(settings, {
        name: 'Thandi',
        email: 'thandi@example.com',
        phone: '+27825550001',
        is_company_admin: false,
      }),
    ).rejects.toMatchObject({ status: 403, message: 'Only company admins can manage invitations.' })
  })

  test('lists pending invitations', async () => {
    const fetchMock = stubJson({ data: [invitation] })

    await expect(fetchInvitations(settings)).resolves.toEqual([invitation])
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/acme\/invitations$/)
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
  })

  test('resends an invitation', async () => {
    const fetchMock = stubJson({ data: invitation })

    await expect(resendInvitation(settings, 7)).resolves.toEqual(invitation)
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/acme\/invitations\/7\/resend$/)
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
  })

  test('revokes an invitation', async () => {
    const fetchMock = stubJson(null, 204)

    await expect(revokeInvitation(settings, 7)).resolves.toBeUndefined()
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/acme\/invitations\/7$/)
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
  })
})

describe('normalizePhoneInput', () => {
  test('strips spaces, dashes, and brackets but keeps the leading plus', () => {
    expect(normalizePhoneInput(' +27 (82) 123-4567 ')).toBe('+27821234567')
  })
})
