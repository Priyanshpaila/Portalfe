import { ChargesType } from '@/@types/app'
import ApiService from '@/services/ApiService'

export const getIndentID = (values: { indentNumber?: string; itemCode?: string }) =>
    values.indentNumber + ':' + values.itemCode

export const divisons = [{ label: 'RR Group', value: 'RR Group' }]

// -----------------------------
// ✅ Companies now come from API (Users)
// - Admin: show all users
// - Non-admin: show only self
// - Admin check is done by calling GET /role/:id
// - Local storage parsing matches your snippet pattern
// -----------------------------

export type CompanyRow = {
    plantCode: string // used as Select value
    alias: string
    companyName: string

    userId?: string
    username?: string
    email?: string
    roleId?: string
    roleName?: string
}

let COMPANIES_CACHE: CompanyRow[] | null = null
let COMPANIES_INFLIGHT: Promise<CompanyRow[]> | null = null

function safeJsonParse<T>(raw: string): T | null {
    try {
        return JSON.parse(raw) as T
    } catch {
        return null
    }
}

function safeString(x: any) {
    return String(x ?? '').trim()
}

function pickName(obj: any): string {
    const name = obj?.name || obj?.fullName || obj?.username || obj?.email || ''
    return safeString(name)
}

function pickToken(obj: any): string | null {
    const token =
        obj?.token ||
        obj?.accessToken ||
        obj?.session?.token ||
        obj?.session?.accessToken ||
        obj?.auth?.token ||
        obj?.auth?.session?.token
    return token ? safeString(token) : null
}

function pickRoleId(obj: any): string | null {
    const role = obj?.role || obj?.user?.role || obj?.auth?.user?.role
    return role ? safeString(role) : null
}

function b64UrlDecode(input: string) {
    const pad = '='.repeat((4 - (input.length % 4)) % 4)
    const base64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/')
    return atob(base64)
}

function decodeUserIdFromJwt(token: string): string | null {
    try {
        const parts = token.split('.')
        if (parts.length < 2) return null
        const payload = JSON.parse(b64UrlDecode(parts[1]))
        // your JWT payload has: { userId: "..." }
        return payload?.userId ? String(payload.userId) : null
    } catch {
        return null
    }
}

/**
 * ✅ EXACT same localStorage scanning style you asked for
 */
export function getLoggedInUserLabel() {
    try {
        const candidates = ['admin', 'user', 'userDetails', 'auth_user']
        for (const key of candidates) {
            const raw = localStorage.getItem(key)
            if (!raw) continue
            const outer = safeJsonParse<any>(raw)
            if (!outer) continue

            const direct = pickName(outer)
            if (direct) return direct

            if (typeof outer?.auth === 'string') {
                const authObj = safeJsonParse<any>(outer.auth)
                const fromAuthUser = pickName(authObj?.user)
                if (fromAuthUser) return fromAuthUser
            }

            const fromOuterUser = pickName(outer?.user)
            if (fromOuterUser) return fromOuterUser
        }
        return ''
    } catch {
        return ''
    }
}

/**
 * ✅ Extract token + roleId + userId using the same candidate scan
 */
export function getAuthFromLocalStorage(): {
    token: string | null
    roleId: string | null
    userId: string | null
    localUser: any | null
} {
    try {
        // optional direct session_token support
        const directToken = localStorage.getItem('session_token')
        if (directToken) {
            const token = safeString(directToken)
            return {
                token,
                roleId: null,
                userId: decodeUserIdFromJwt(token),
                localUser: null,
            }
        }

        const candidates = ['admin', 'user', 'userDetails', 'auth_user']
        for (const key of candidates) {
            const raw = localStorage.getItem(key)
            if (!raw) continue

            const outer = safeJsonParse<any>(raw)
            if (!outer) continue

            // Case A: auth is a STRING (your case)
            if (typeof outer?.auth === 'string') {
                const authObj = safeJsonParse<any>(outer.auth)
                const token = pickToken(authObj)
                const roleId = pickRoleId(authObj?.user)
                const localUser = authObj?.user ?? null
                if (token) {
                    return {
                        token,
                        roleId: roleId || null,
                        userId: decodeUserIdFromJwt(token),
                        localUser,
                    }
                }
            }

            // Case B: token directly present
            const token = pickToken(outer)
            if (token) {
                const roleId = pickRoleId(outer?.user || outer)
                const localUser = outer?.user ?? null
                return {
                    token,
                    roleId: roleId || null,
                    userId: decodeUserIdFromJwt(token),
                    localUser,
                }
            }

            // Case C: token inside outer.user
            const token2 = pickToken(outer?.user)
            if (token2) {
                const roleId2 = pickRoleId(outer?.user)
                const localUser2 = outer?.user ?? null
                return {
                    token: token2,
                    roleId: roleId2 || null,
                    userId: decodeUserIdFromJwt(token2),
                    localUser: localUser2,
                }
            }
        }

        return { token: null, roleId: null, userId: null, localUser: null }
    } catch {
        return { token: null, roleId: null, userId: null, localUser: null }
    }
}

function mapUserToCompany(u: any, roleName?: string): CompanyRow {
    const userId = safeString(u?._id || u?.id)
    const username = safeString(u?.username)
    const name = safeString(u?.name || u?.fullName || username || u?.email || 'Unknown User')
    const email = safeString(u?.email)
    const roleId = safeString(typeof u?.role === 'string' ? u.role : u?.role?._id || u?.role?.id)

    return {
        plantCode: userId || username || name, // Select value
        alias: username || name,
        companyName: name, // shown in dropdown
        userId,
        username,
        email,
        roleId: roleId || undefined,
        roleName: roleName || undefined,
    }
}

/**
 * ✅ Admin check via GET /role/:id (as you requested)
 */
async function getRoleNameById(roleId: string, token: string): Promise<string> {
    try {
        const resp = await ApiService.fetchData<any>({
            method: 'get',
            url: `/role/${roleId}`,
            headers: { Authorization: `Bearer ${token}` },
        })
        return safeString(resp?.data?.name)
    } catch (e) {
        console.error('[getRoleNameById] failed:', e)
        return ''
    }
}

/**
 * ✅ Fetch "companies" (actually USERS) from backend
 * - Admin => GET /user (all users)
 * - Non-admin => GET /user/:userId (self)
 *
 * IMPORTANT:
 * - NO HARDCODED fallback now.
 * - If API fails, it returns [] so your UI won't show old hardcoded list.
 */
export async function getCompanies(force = false): Promise<CompanyRow[]> {
    if (force) {
        COMPANIES_CACHE = null
        COMPANIES_INFLIGHT = null
    }

    if (!force && COMPANIES_CACHE) return COMPANIES_CACHE
    if (!force && COMPANIES_INFLIGHT) return COMPANIES_INFLIGHT

    COMPANIES_INFLIGHT = (async () => {
        const { token, roleId, userId, localUser } = getAuthFromLocalStorage()

        if (!token) {
            console.warn('[getCompanies] token missing in localStorage')
            COMPANIES_CACHE = []
            return []
        }

        // ✅ Determine admin by calling role API
        const roleName = roleId ? await getRoleNameById(roleId, token) : ''
        const isAdmin = roleName.toLowerCase() === 'admin'

        try {
            if (isAdmin) {
                const resp = await ApiService.fetchData<any[]>({
                    method: 'get',
                    url: '/user',
                    headers: { Authorization: `Bearer ${token}` },
                })
                const users = resp?.data || []
                const mapped = users.map((u) => mapUserToCompany(u, roleName))
                COMPANIES_CACHE = mapped
                return mapped
            }

            // non-admin => self
            if (userId) {
                const meResp = await ApiService.fetchData<any>({
                    method: 'get',
                    url: `/user/${userId}`,
                    headers: { Authorization: `Bearer ${token}` },
                })
                const me = meResp?.data
                const list = me ? [mapUserToCompany(me, roleName)] : []
                COMPANIES_CACHE = list
                return list
            }

            // fallback: use localUser if available (still no hardcoded)
            if (localUser) {
                const list = [mapUserToCompany({ ...localUser, _id: localUser?._id || localUser?.id || '' }, roleName)]
                COMPANIES_CACHE = list
                return list
            }

            COMPANIES_CACHE = []
            return []
        } catch (err) {
            console.error('[getCompanies] failed:', err)
            COMPANIES_CACHE = []
            return []
        } finally {
            COMPANIES_INFLIGHT = null
        }
    })()

    return COMPANIES_INFLIGHT
}

export function clearCompaniesCache() {
    COMPANIES_CACHE = null
    COMPANIES_INFLIGHT = null
}

// ⚠️ Keep export to avoid breaking older imports.
// But it is intentionally empty now (no hardcoded list).
export const companies: CompanyRow[] = []

// -----------------------------
// rest of your constants remain same (unchanged)
// -----------------------------

export const termsConditionsOptions = [
    { value: 'payment-term', label: 'PAYMENT TERM' },
    { value: 'freight-delivery-term', label: 'FREIGHT (DELIVERY TERM)' },
    { value: 'warranty', label: 'WARRANTY' },
    { value: 'gurranty', label: 'GURRANTY' },
    { value: 'commissioning', label: 'COMMISSIONING' },
    { value: 'inspection', label: 'INSPECTION' },
    { value: 'packaging-forwarding', label: 'PACKAGING & FORWARDING' },
    { value: 'loading-unloading-charges', label: 'LOADING & UNLOADING CHARGES' },
    { value: 'ld-clause', label: 'LD CLAUSE' },
    { value: 'performance-guarantee', label: 'PERFORMANCE GUARANTEE' },
    { value: 'insurance', label: 'INSURANCE' },
    { value: 'documentation', label: 'DOCUMENTATION' },
]

export const CHARGE_TYPES: { label: string; value: keyof ChargesType }[] = [
    { label: 'OTHER CHARGES', value: 'otherCharges' },
    { label: 'PACKING & FORWARDING', value: 'packagingForwarding' },
]

export const refDocumentTypes = [
    { label: 'Quotation', value: 'quotation' },
    { label: 'Purchase Request', value: 'purchaseRequest' },
]

export const chargeNames = [
    { value: 'CGST @0%', label: 'CGST @0%' },
    { value: 'CGST @1.5%', label: 'CGST @1.5%' },
    { value: 'CGST @2.5%', label: 'CGST @2.5%' },
    { value: 'CGST @6%', label: 'CGST @6%' },
    { value: 'CGST @9%', label: 'CGST @9%' },
    { value: 'CGST @14%', label: 'CGST @14%' },

    { value: 'SGST @0%', label: 'SGST @0%' },
    { value: 'SGST @1.5%', label: 'SGST @1.5%' },
    { value: 'SGST @2.5%', label: 'SGST @2.5%' },
    { value: 'SGST @6%', label: 'SGST @6%' },
    { value: 'SGST @9%', label: 'SGST @9%' },
    { value: 'SGST @14%', label: 'SGST @14%' },

    { value: 'DISC', label: 'DISC' },

    { value: 'IGST @0%', label: 'IGST @0%' },
    { value: 'IGST @3%', label: 'IGST @3%' },
    { value: 'IGST @5%', label: 'IGST @5%' },
    { value: 'IGST @12%', label: 'IGST @12%' },
    { value: 'IGST @18', label: 'IGST @18' },
    { value: 'IGST @28', label: 'IGST @28' },

    { value: 'UTGST @0%', label: 'UTGST @0%' },
    { value: 'UTGST @2.5%', label: 'UTGST @2.5%' },
    { value: 'UTGST @6%', label: 'UTGST @6%' },
    { value: 'UTGST @9%', label: 'UTGST @9%' },
    { value: 'UTGST @14%', label: 'UTGST @14%' },
]

export const chargeTypes = [{ value: 'exclusive', label: 'Exclusive' }]
export const chargeNatures = [
    { value: 'percent', label: 'Percentage' },
    { value: 'amount', label: 'Amount' },
    { value: 'onUnit', label: 'On Unit' },
]
export const chargeOnOptions = [
    { value: 'base', label: 'Base' },
    { value: 'item', label: 'On Item' },
]