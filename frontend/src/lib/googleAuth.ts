/**
 * Google Identity Services & OAuth2 Client Handler for LocalFix
 */

export interface GoogleUserProfile {
  email: string
  given_name?: string
  family_name?: string
  name?: string
  picture?: string
  sub?: string
}

const STORAGE_KEY = 'LOCALFIX_GOOGLE_CLIENT_ID'
export const OFFICIAL_GOOGLE_CLIENT_ID = '589519175794-4ue3d2mdr4i2hk84qkljkdosf4ftbdf3.apps.googleusercontent.com'

export function getGoogleClientId(): string {
  // Check Vite env variable
  const envVal = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (envVal && envVal.trim() && !envVal.includes('placeholder')) return envVal.trim()

  // Check localStorage (override if any)
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && stored.trim()) return stored.trim()

  return OFFICIAL_GOOGLE_CLIENT_ID
}

export function setGoogleClientId(clientId: string): void {
  if (clientId && clientId.trim()) {
    localStorage.setItem(STORAGE_KEY, clientId.trim())
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

/**
 * Decode JWT token returned by Google GIS without external dependency
 */
export function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (e) {
    return null
  }
}

/**
 * Initializes and triggers Google OAuth2 Token Client popup flow
 */
export async function launchGoogleOAuthPopup(
  clientId: string,
  onSuccess: (tokenData: { access_token?: string; profile?: GoogleUserProfile }) => void,
  onError: (errorMsg: string) => void
): Promise<void> {
  const g = (window as any).google
  if (!g || !g.accounts || !g.accounts.oauth2) {
    onError('Google Identity Services SDK is not loaded yet. Please check your internet connection or disable ad-blockers.')
    return
  }

  try {
    let hasResolved = false

    // Safety timeout: if popup is closed or blocked by browser, abort after 15s
    const timer = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true
        onError('Google popup was closed or timed out. Please choose or enter your Google email directly.')
      }
    }, 15000)

    const client = g.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'email profile openid',
      error_callback: (err: any) => {
        if (!hasResolved) {
          hasResolved = true
          clearTimeout(timer)
          onError(err?.message || 'Google OAuth request was cancelled or blocked.')
        }
      },
      callback: async (response: any) => {
        if (hasResolved) return
        hasResolved = true
        clearTimeout(timer)

        if (response.error) {
          onError(response.error_description || response.error || 'Google sign-in was cancelled or encountered an error.')
          return
        }

        if (response.access_token) {
          try {
            // Fetch real Google user info from Google's userinfo API
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` },
            })
            if (res.ok) {
              const profile: GoogleUserProfile = await res.json()
              onSuccess({ access_token: response.access_token, profile })
            } else {
              onSuccess({ access_token: response.access_token })
            }
          } catch {
            onSuccess({ access_token: response.access_token })
          }
        } else {
          onError('No access token received from Google.')
        }
      },
    })

    client.requestAccessToken({ prompt: 'select_account' })
  } catch (err: any) {
    onError(err?.message || 'Failed to initialize Google OAuth popup.')
  }
}
