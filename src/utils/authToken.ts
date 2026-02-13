type AnyObj = Record<string, any>

function safeJsonParse<T = any>(v: any): T | null {
    try {
        if (typeof v !== 'string') return null
        return JSON.parse(v) as T
    } catch {
        return null
    }
}

function extractTokenFromObject(obj: AnyObj | null | undefined): string {
    if (!obj) return ''

    // common direct shapes
    const direct =
        obj?.token ||
        obj?.accessToken ||
        obj?.session_token ||
        obj?.sessionToken ||
        obj?.session?.token ||
        obj?.auth?.token ||
        obj?.auth?.session?.token

    if (typeof direct === 'string' && direct.trim()) return direct.trim()

    // your "admin" structure: { auth: "stringified json" }
    if (typeof obj?.auth === 'string') {
        const authObj = safeJsonParse<AnyObj>(obj.auth)
        const token = authObj?.session?.token
        if (typeof token === 'string' && token.trim()) return token.trim()
    }

    // sometimes auth can be object
    if (typeof obj?.auth === 'object' && obj?.auth) {
        const token = obj.auth?.session?.token || obj.auth?.token
        if (typeof token === 'string' && token.trim()) return token.trim()
    }

    return ''
}

export function getAuthToken(): string {
    if (typeof window === 'undefined') return ''

    // ✅ keep backwards compatibility
    const directKeys = ['session_token', 'token', 'authToken']
    for (const k of directKeys) {
        const raw = localStorage.getItem(k)
        if (raw && raw.trim()) return raw.trim()
    }

    // ✅ your redux-persist key
    const candidates = ['admin', 'user', 'userDetails', 'auth_user']
    for (const key of candidates) {
        const raw = localStorage.getItem(key)
        if (!raw) continue

        // raw is outer JSON
        const outer = safeJsonParse<AnyObj>(raw) || ({} as AnyObj)

        // attempt token extraction from outer object
        const token1 = extractTokenFromObject(outer)
        if (token1) return token1

        // if outer.auth exists as string, extractTokenFromObject already handles
        // but also check nested user/session patterns just in case:
        const token2 = extractTokenFromObject(outer?.session)
        if (token2) return token2

        const token3 = extractTokenFromObject(outer?.user)
        if (token3) return token3
    }

    return ''
}

export function isLoggedIn(): boolean {
    return Boolean(getAuthToken())
}