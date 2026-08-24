import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  ApiError,
  REQUEST_TIMEOUT_MS,
  describeRequestFailure,
  loginWithPassword,
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
})
