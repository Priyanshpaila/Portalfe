import { ChargesType } from '@/@types/app'
import ApiService from '@/services/ApiService'

export const getIndentID = (values: { indentNumber?: string; itemCode?: string }) => values.indentNumber + ':' + values.itemCode

export const divisons = [{ label: '', value: '' }]

/* =============================
 * ✅ Company list from /user/me-or-all
 * ============================= */

export type CompanyRow = {
    plantCode: string // Select value (we will keep this = companyName)
    alias: string
    companyName: string

    // optional debug/meta
    firmRootUserId?: string
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

/** vendor if vendorCode exists */
function isVendorUser(u: any) {
    return Boolean(safeString(u?.vendorCode))
}

/** firm employee if firmId exists and vendorCode is null */
function isFirmEmployee(u: any) {
    return !isVendorUser(u) && Boolean(u?.firmId)
}

/** firm root if firmId null and vendorCode null */
function isFirmRoot(u: any) {
    return !isVendorUser(u) && !u?.firmId
}

function normCompany(s: any) {
    return String(s || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
}

function pickToken(obj: any): string | null {
    const token = obj?.token || obj?.accessToken || obj?.session?.token || obj?.session?.accessToken || obj?.auth?.token || obj?.auth?.session?.token
    return token ? safeString(token) : null
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
        return payload?.userId ? String(payload.userId) : null
    } catch {
        return null
    }
}

/**
 * ✅ Extract token using your same localStorage scanning
 */
export function getAuthFromLocalStorage(): {
    token: string | null
    roleId: string | null
    userId: string | null
    localUser: any | null
} {
    try {
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

            if (typeof outer?.auth === 'string') {
                const authObj = safeJsonParse<any>(outer.auth)
                const token = pickToken(authObj)
                const localUser = authObj?.user ?? null
                if (token) {
                    return {
                        token,
                        roleId: safeString(localUser?.role) || null,
                        userId: decodeUserIdFromJwt(token),
                        localUser,
                    }
                }
            }

            const token = pickToken(outer) || pickToken(outer?.user)
            if (token) {
                const localUser = outer?.user ?? null
                return {
                    token,
                    roleId: safeString(localUser?.role) || safeString(outer?.role) || null,
                    userId: decodeUserIdFromJwt(token),
                    localUser,
                }
            }
        }

        return { token: null, roleId: null, userId: null, localUser: null }
    } catch {
        return { token: null, roleId: null, userId: null, localUser: null }
    }
}

function userToCompany(u: any): CompanyRow | null {
    if (!u) return null
    if (isVendorUser(u)) return null // ✅ exclude vendors

    const companyName = safeString(u?.company?.name)
    if (!companyName) return null

    // ✅ PO.company is a string => best is to keep select value = companyName
    return {
        plantCode: companyName,
        alias: companyName,
        companyName,
        firmRootUserId: isFirmRoot(u) ? safeString(u?._id) : isFirmEmployee(u) ? safeString(u?.firmId) : undefined,
    }
}

/** ✅ Deduplicate by companyName, prefer firm root users when available */
function dedupeCompanies(users: any[]): CompanyRow[] {
    const map = new Map<string, { row: CompanyRow; weight: number }>()

    for (const u of users || []) {
        const row = userToCompany(u)
        if (!row) continue

        const key = normCompany(row.companyName)

        // weight: firm_root highest, firm_employee next, others lowest
        const weight = isFirmRoot(u) ? 3 : isFirmEmployee(u) ? 2 : 1

        const prev = map.get(key)
        if (!prev || weight > prev.weight) {
            map.set(key, { row, weight })
        }
    }

    return Array.from(map.values())
        .map((x) => x.row)
        .sort((a, b) => a.companyName.localeCompare(b.companyName))
}

/**
 * ✅ getCompanies():
 * Calls backend resolver:
 * GET /user/me-or-all
 * - superadmin/admin: returns all users
 * - non-admin: returns [self] with resolved company object
 */
export async function getCompanies(force = false): Promise<CompanyRow[]> {
    if (force) {
        COMPANIES_CACHE = null
        COMPANIES_INFLIGHT = null
    }
    if (!force && COMPANIES_CACHE) return COMPANIES_CACHE
    if (!force && COMPANIES_INFLIGHT) return COMPANIES_INFLIGHT

    COMPANIES_INFLIGHT = (async () => {
        const { token } = getAuthFromLocalStorage()

        if (!token) {
            console.warn('[getCompanies] token missing')
            COMPANIES_CACHE = []
            return []
        }

        try {
            const resp = await ApiService.fetchData<any[]>({
                method: 'get',
                url: '/user/me-or-all',
                headers: { Authorization: `Bearer ${token}` },
            })

            const users = Array.isArray(resp?.data) ? resp.data : []

            // ✅ admin/superadmin => many users => dedupe companies
            // ✅ non-admin => usually single user => still works
            const list = dedupeCompanies(users)

            COMPANIES_CACHE = list
            return list
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

/**
 * ✅ IMPORTANT:
 * Many old screens import `companies` directly.
 * Keep it exported, but now it will be populated by getCompanies() in screens.
 */
export const companies: CompanyRow[] = []

/* =============================
 * rest of your constants unchanged
 * ============================= */

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
