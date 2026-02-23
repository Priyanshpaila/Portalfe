// src/pages/ProfilePage.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import {
    HiOutlineUser,
    HiOutlineLockClosed,
    HiOutlineOfficeBuilding,
    HiOutlineMail,
    HiOutlineAtSymbol,
    HiOutlineBadgeCheck,
    HiOutlineRefresh,
    HiOutlineClipboardCopy,
    HiOutlineIdentification,
    HiOutlineLocationMarker,
    HiOutlineGlobeAlt,
    HiOutlinePhone,
    HiOutlineKey,
    HiOutlineEye,
    HiOutlineEyeOff,
    HiOutlinePlus,
    HiOutlineTrash,
    HiOutlineShieldCheck,
    HiOutlineChevronRight,
} from 'react-icons/hi'

import Avatar from '@/components/ui/Avatar'
import { Button } from '@/components/ui'
import ApiService from '@/services/ApiService'
import { useAppSelector } from '@/store'
import FirmEmployeesManager from '@/components/profile/FirmEmployeesManager'

type VendorContactPerson = {
    name?: string
    email?: string
    mobilePhoneIndicator?: string
    fullPhoneNumber?: string
    callerPhoneNumber?: string
}

type Company = {
    name: string
    industry: string
    gstin: string
    pan: string
    phone: string
    website: string
    addressLine1: string
    addressLine2: string
    city: string
    state: string
    pincode: string
}

type VendorProfile = {
    vendorCode?: string
    countryKey?: string
    name?: string
    name1?: string
    name2?: string
    name3?: string
    name4?: string
    city?: string
    district?: string
    poBox?: string
    poBoxPostalCode?: string
    postalCode?: string
    creationDate?: string
    sortField?: string
    streetHouseNumber?: string
    panNumber?: string
    msme?: string
    gstin?: string
    orgName1?: string
    orgName2?: string
    companyCode?: string
    cityPostalCode?: string
    street?: string
    street2?: string
    street3?: string
    street4?: string
    street5?: string
    languageKey?: string
    region?: string
    contactPerson?: VendorContactPerson[]
}

type Subscription = {
    _id?: string
    userId?: string
    plan?: string
    status?: string
    seats?: number
    firmLimit?: number
    startAt?: string
    endAt?: string
    orderId?: string
    paymentId?: string
    signature?: any
    amount?: number
    currency?: string
    notes?: any
    createdAt?: string
    updatedAt?: string
}

type UserMe = {
    _id?: string
    name?: string
    username?: string
    email?: string
    vendorCode?: string | null
    firmId?: string | null
    company?: Partial<Company>
    vendorProfile?: VendorProfile | null

    // (legacy/root vendor fields) keep optional for backward compatibility
    countryKey?: string
    city?: string
    district?: string
    poBox?: string
    poBoxPostalCode?: string
    postalCode?: string
    streetHouseNumber?: string
    panNumber?: string
    msme?: string
    gstin?: string
    orgName1?: string
    orgName2?: string
    companyCode?: string
    street?: string
    street2?: string
    street3?: string
    street4?: string
    street5?: string
    languageKey?: string
    region?: string
    contactPerson?: VendorContactPerson[]
}

type ProfilePayload = {
    ok?: boolean
    type?: 'vendor' | 'firm_employee' | 'firm_root'
    profile?: UserMe
    firmRoot?: any
    subscription?: Subscription | any
    stats?: any
}

type RootStateLike = {
    auth?: {
        user?: {
            name?: string
            username?: string
            vendorCode?: string | null
            firmId?: string | null
        }
    }
}

type ViewerType = 'vendor' | 'firm' | 'employee' | 'user'
type TabKey = 'profile' | 'business' | 'security'

const initialVendor = {
    countryKey: '',
    city: '',
    district: '',
    poBox: '',
    poBoxPostalCode: '',
    postalCode: '',
    streetHouseNumber: '',
    panNumber: '',
    msme: '',
    gstin: '',
    orgName1: '',
    orgName2: '',
    companyCode: '',
    street: '',
    street2: '',
    street3: '',
    street4: '',
    street5: '',
    languageKey: '',
    region: '',
    contactPerson: [] as VendorContactPerson[],
}

const initialCompany: Company = {
    name: '',
    industry: '',
    gstin: '',
    pan: '',
    phone: '',
    website: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
}

type ProfileFormState = {
    name: string
    email: string
    username: string
    vendorCode: string
    firmId: string | null
    company: Company
    vendor: typeof initialVendor
}

function isVendorUser(u?: { vendorCode?: string | null }) {
    return !!(u?.vendorCode && String(u.vendorCode).trim())
}
function isFirmEmployee(u?: { vendorCode?: string | null; firmId?: string | null }) {
    return !isVendorUser(u) && !!u?.firmId
}
function isFirmRoot(u?: { vendorCode?: string | null; firmId?: string | null }) {
    return !isVendorUser(u) && !u?.firmId
}

function clsx(...arr: Array<string | false | undefined | null>) {
    return arr.filter(Boolean).join(' ')
}

function InputRow({
    icon,
    label,
    value,
    onChange,
    placeholder,
    disabled,
    type = 'text',
    right,
}: {
    icon?: React.ReactNode
    label: string
    value: string
    onChange?: (v: string) => void
    placeholder?: string
    disabled?: boolean
    type?: string
    right?: React.ReactNode
}) {
    return (
        <div>
            <label className='text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2'>
                <span className='text-gray-500 dark:text-gray-400'>{icon}</span>
                <span>{label}</span>
            </label>

            <div className='mt-1 relative'>
                <input
                    type={type}
                    className={clsx(
                        'w-full rounded-xl border px-3 py-2.5 pr-10 transition',
                        'border-gray-200 dark:border-gray-700',
                        disabled
                            ? 'bg-slate-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                            : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
                        'focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-gray-700',
                    )}
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                />
                {right ? <div className='absolute right-2 top-1/2 -translate-y-1/2'>{right}</div> : null}
            </div>
        </div>
    )
}

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className='rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60 px-3 py-2'>
            <div className='text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5'>
                <span className='text-gray-500 dark:text-gray-400'>{icon}</span>
                <span className='font-semibold'>{label}</span>
            </div>
            <div className='mt-0.5 text-sm font-bold text-gray-900 dark:text-gray-100 truncate'>{value || '—'}</div>
        </div>
    )
}

/**
 * Tries both mount paths:
 * - /users (as per your router comments)
 * - /user  (your logs show /api/user/...)
 *
 * NOTE: you currently use only /user. Keep it as-is.
 */
const USER_BASES = ['/user'] as const

async function userApiFetch<T = any>(opts: { path: string; method: 'get' | 'post' | 'patch' | 'put' | 'delete'; data?: any }) {
    const { path, method, data } = opts
    let lastErr: any = null

    for (const base of USER_BASES) {
        try {
            const res = await ApiService.fetchData({
                url: `${base}${path}`,
                method,
                data,
            })
            return res as T
        } catch (e: any) {
            lastErr = e
            const status = e?.response?.status
            if (status === 404) continue
            throw e
        }
    }
    throw lastErr
}

export default function ProfilePage() {
    const authUser = useAppSelector((state: RootStateLike) => state?.auth?.user)

    const [loading, setLoading] = useState<boolean>(true)
    const [saving, setSaving] = useState<boolean>(false)
    const [pwdLoading, setPwdLoading] = useState<boolean>(false)

    const [me, setMe] = useState<UserMe | null>(null)
    const [profileMeta, setProfileMeta] = useState<ProfilePayload | null>(null)
    const [tab, setTab] = useState<TabKey>('profile')

    const [form, setForm] = useState<ProfileFormState>({
        name: '',
        email: '',
        username: '',
        vendorCode: '',
        firmId: null,
        company: { ...initialCompany },
        vendor: { ...initialVendor },
    })

    const [pwd, setPwd] = useState<{ oldPassword: string; newPassword: string; confirm: string }>({
        oldPassword: '',
        newPassword: '',
        confirm: '',
    })

    const [showPwd, setShowPwd] = useState<{ old: boolean; next: boolean; confirm: boolean }>({
        old: false,
        next: false,
        confirm: false,
    })

    const viewerType: ViewerType = useMemo(() => {
        const apiType = profileMeta?.type
        if (apiType === 'vendor') return 'vendor'
        if (apiType === 'firm_root') return 'firm'
        if (apiType === 'firm_employee') return 'employee'

        const u = (me || (authUser as any)) as any
        if (!u) return 'user'
        if (isVendorUser(u)) return 'vendor'
        if (isFirmEmployee(u)) return 'employee'
        if (isFirmRoot(u)) return 'firm'
        return 'user'
    }, [me, authUser, profileMeta])

    const typeLabel = useMemo(() => {
        if (viewerType === 'vendor') return 'Vendor'
        if (viewerType === 'firm') return 'Firm'
        if (viewerType === 'employee') return 'Firm Employee'
        return 'User'
    }, [viewerType])

    const canEditCompany = viewerType === 'firm'
    const canEditVendor = viewerType === 'vendor'

    const subscription: Subscription | null = useMemo(() => {
        const sub = (profileMeta?.subscription ?? null) as any
        return sub && typeof sub === 'object' ? (sub as Subscription) : null
    }, [profileMeta])

    function cap(s?: string | null) {
        const v = String(s || '').trim()
        if (!v) return ''
        return v.charAt(0).toUpperCase() + v.slice(1)
    }

    function fmtDate(iso?: string | null) {
        if (!iso) return '—'
        const d = new Date(iso)
        if (Number.isNaN(d.getTime())) return '—'
        return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
    }

    function daysLeft(endAt?: string | null) {
        if (!endAt) return null
        const end = new Date(endAt).getTime()
        if (!Number.isFinite(end)) return null
        const diff = end - Date.now()
        return Math.ceil(diff / (1000 * 60 * 60 * 24))
    }

    function money(amount?: number, currency?: string) {
        if (amount == null || !Number.isFinite(Number(amount))) return '—'
        const cur = String(currency || '').toUpperCase() || 'INR'

        // Razorpay amounts are typically in smallest unit (paise for INR)
        const isLikelyMinorUnit = cur === 'INR' || cur === 'USD' || cur === 'EUR' || cur === 'GBP'
        const value = isLikelyMinorUnit ? Number(amount) / 100 : Number(amount)

        try {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: cur,
                maximumFractionDigits: 2,
            }).format(value)
        } catch {
            return `${value} ${cur}`
        }
    }

    const subscriptionPillValue = useMemo(() => {
        if (!subscription) return '—'
        const p = cap(subscription.plan)
        const st = cap(subscription.status)
        const d = daysLeft(subscription.endAt)
        const left = typeof d === 'number' ? (d < 0 ? 'Expired' : `${d}d left`) : ''
        return [p || 'Plan', st || 'Status', left].filter(Boolean).join(' • ')
    }, [subscription])

    async function copyText(label: string, value?: string) {
        const v = String(value || '').trim()
        if (!v) return toast.error('Nothing to copy')
        try {
            await navigator.clipboard.writeText(v)
            toast.success(`${label} copied`)
        } catch {
            toast.error('Copy failed')
        }
    }

    function unwrapResponse(res: any) {
        return res?.data ?? res
    }

    // ✅ get vendor data from profile.vendorProfile (fallback to root if ever needed)
    function getVendorSrc(user?: UserMe | null): VendorProfile & UserMe {
        const vp = user?.vendorProfile
        if (vp && typeof vp === 'object') return vp as any
        return (user || {}) as any
    }

    async function loadMe() {
        setLoading(true)
        try {
            const res = await userApiFetch({ path: '/profile', method: 'get' })
            const raw = unwrapResponse(res)
            const payload: ProfilePayload = raw?.data ?? raw

            const user: UserMe = payload?.profile ?? (payload as any)?.user ?? (payload as any)?.data ?? (payload as any)

            setProfileMeta(payload || null)
            setMe(user || null)

            const vsrc = getVendorSrc(user)
            const contactPerson = Array.isArray((vsrc as any)?.contactPerson) ? ((vsrc as any).contactPerson as any[]) : []

            setForm({
                name: user?.name || '',
                email: user?.email || '',
                username: user?.username || '',
                vendorCode: (user?.vendorCode as any) || '',
                firmId: (user?.firmId as any) || null,
                company: { ...initialCompany, ...(user?.company || {}) },

                // ✅ IMPORTANT: use vsrc.* (vendorProfile) not user.* (root)
                vendor: {
                    ...initialVendor,
                    countryKey: (vsrc as any)?.countryKey || '',
                    city: (vsrc as any)?.city || '',
                    district: (vsrc as any)?.district || '',
                    poBox: (vsrc as any)?.poBox || '',
                    poBoxPostalCode: (vsrc as any)?.poBoxPostalCode || '',
                    postalCode: (vsrc as any)?.postalCode || '',
                    streetHouseNumber: (vsrc as any)?.streetHouseNumber || '',
                    panNumber: (vsrc as any)?.panNumber || '',
                    msme: (vsrc as any)?.msme || '',
                    gstin: (vsrc as any)?.gstin || '',
                    orgName1: (vsrc as any)?.orgName1 || '',
                    orgName2: (vsrc as any)?.orgName2 || '',
                    companyCode: (vsrc as any)?.companyCode || '',
                    street: (vsrc as any)?.street || '',
                    street2: (vsrc as any)?.street2 || '',
                    street3: (vsrc as any)?.street3 || '',
                    street4: (vsrc as any)?.street4 || '',
                    street5: (vsrc as any)?.street5 || '',
                    languageKey: (vsrc as any)?.languageKey || '',
                    region: (vsrc as any)?.region || '',
                    contactPerson: contactPerson as VendorContactPerson[],
                },
            })
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Failed to load profile')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadMe()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function saveProfile() {
        setSaving(true)
        try {
            const payload: Record<string, any> = {
                name: form.name,
                email: form.email,
            }

            if (canEditCompany) payload.company = form.company

            if (canEditVendor) {
                payload.vendorProfile = {
                    countryKey: form.vendor.countryKey,
                    city: form.vendor.city,
                    district: form.vendor.district,
                    poBox: form.vendor.poBox,
                    poBoxPostalCode: form.vendor.poBoxPostalCode,
                    postalCode: form.vendor.postalCode,
                    streetHouseNumber: form.vendor.streetHouseNumber,
                    panNumber: form.vendor.panNumber,
                    msme: form.vendor.msme,
                    gstin: form.vendor.gstin,
                    orgName1: form.vendor.orgName1,
                    orgName2: form.vendor.orgName2,
                    companyCode: form.vendor.companyCode,
                    street: form.vendor.street,
                    street2: form.vendor.street2,
                    street3: form.vendor.street3,
                    street4: form.vendor.street4,
                    street5: form.vendor.street5,
                    languageKey: form.vendor.languageKey,
                    region: form.vendor.region,
                    contactPerson: Array.isArray(form.vendor.contactPerson) ? form.vendor.contactPerson : [],
                }
            }

            const res = await userApiFetch({
                path: '/profile',
                method: 'patch',
                data: payload,
            })

            const raw = unwrapResponse(res)
            const out = raw?.data ?? raw
            const updated: UserMe = out?.profile ?? out?.user ?? out

            toast.success('Profile updated')
            setMe(updated)
            loadMe()
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Failed to update profile')
        } finally {
            setSaving(false)
        }
    }

    async function changePassword() {
        const oldPassword = String(pwd.oldPassword || '')
        const newPassword = String(pwd.newPassword || '')
        const confirm = String(pwd.confirm || '')

        if (!oldPassword || !newPassword) return toast.error('Old password and new password are required')
        if (newPassword.length < 6) return toast.error('New password must be at least 6 characters')
        if (newPassword !== confirm) return toast.error('New password and confirm password do not match')

        setPwdLoading(true)
        try {
            await userApiFetch({
                path: '/profile/change-password',
                method: 'post',
                data: { currentPassword: oldPassword, newPassword },
            })

            toast.success('Password changed successfully')
            setPwd({ oldPassword: '', newPassword: '', confirm: '' })
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Failed to change password')
        } finally {
            setPwdLoading(false)
        }
    }

    function addContactPerson() {
        setForm((p) => ({
            ...p,
            vendor: {
                ...p.vendor,
                contactPerson: [
                    ...(p.vendor.contactPerson || []),
                    { name: '', email: '', mobilePhoneIndicator: '', fullPhoneNumber: '', callerPhoneNumber: '' },
                ],
            },
        }))
    }

    function removeContactPerson(idx: number) {
        setForm((p) => ({
            ...p,
            vendor: {
                ...p.vendor,
                contactPerson: (p.vendor.contactPerson || []).filter((_, i) => i !== idx),
            },
        }))
    }

    const headerSubtitle = useMemo(() => {
        if (viewerType === 'vendor') return 'Manage your vendor profile, contact persons & security.'
        if (viewerType === 'firm') return 'Manage your firm identity, business details & account security.'
        if (viewerType === 'employee') return 'Update your personal details and account security.'
        return 'Manage your profile & security.'
    }, [viewerType])

    const tabBtn = (active: boolean) =>
        clsx(
            'group inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition',
            active
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-gray-900 dark:border-white'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-800',
        )

    if (loading) {
        return (
            <div className='p-4 sm:p-6'>
                <div className='max-w-6xl mx-auto'>
                    <div className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden'>
                        <div className='p-6 animate-pulse'>
                            <div className='flex items-center gap-3'>
                                <div className='h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-800' />
                                <div className='flex-1'>
                                    <div className='h-4 w-44 rounded bg-gray-200 dark:bg-gray-800 mb-2' />
                                    <div className='h-3 w-64 rounded bg-gray-200 dark:bg-gray-800' />
                                </div>
                            </div>
                            <div className='mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3'>
                                <div className='h-16 rounded-xl bg-gray-200 dark:bg-gray-800' />
                                <div className='h-16 rounded-xl bg-gray-200 dark:bg-gray-800' />
                                <div className='h-16 rounded-xl bg-gray-200 dark:bg-gray-800' />
                            </div>
                            <div className='mt-6 h-56 rounded-2xl bg-gray-200 dark:bg-gray-800' />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className='p-4 sm:p-6'>
            <div className='max-w-6xl mx-auto space-y-4'>
                {/* HERO / HEADER */}
                <div className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden'>
                    <div className='relative p-5 sm:p-6'>
                        {/* decorative gradient */}
                        <div className='absolute inset-0 opacity-60 pointer-events-none'>
                            <div className='absolute -top-24 -right-24 h-56 w-56 rounded-full bg-slate-100 dark:bg-gray-800 blur-2xl' />
                            <div className='absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-emerald-50 dark:bg-emerald-900/20 blur-2xl' />
                        </div>

                        <div className='relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4'>
                            <div className='flex items-start gap-3'>
                                <Avatar shape='circle' size={56 as any} icon={<HiOutlineUser />} />
                                <div className='min-w-0'>
                                    <div className='flex flex-wrap items-center gap-2'>
                                        <div className='text-xl font-extrabold text-gray-900 dark:text-gray-100 truncate'>{form.name || '—'}</div>

                                        <span className='inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'>
                                            <HiOutlineBadgeCheck className='text-base' />
                                            {typeLabel}
                                        </span>

                                        {subscription?.status ? (
                                            <span
                                                className={clsx(
                                                    'inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full',
                                                    String(subscription.status).toLowerCase() === 'active'
                                                        ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200'
                                                        : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
                                                )}>
                                                <HiOutlineBadgeCheck className='text-base' />
                                                {cap(subscription.status) || 'Status'}
                                            </span>
                                        ) : null}
                                    </div>

                                    <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600 dark:text-gray-300'>
                                        <span className='inline-flex items-center gap-1'>
                                            <HiOutlineAtSymbol className='text-base' />
                                            <span className='font-semibold'>{form.username || '—'}</span>
                                        </span>

                                        {form.email ? (
                                            <span className='inline-flex items-center gap-1'>
                                                <HiOutlineMail className='text-base' />
                                                <span className='truncate max-w-[240px] sm:max-w-[360px]'>{form.email}</span>
                                            </span>
                                        ) : null}
                                    </div>

                                    <div className='mt-2 text-sm text-gray-600 dark:text-gray-300'>{headerSubtitle}</div>
                                </div>
                            </div>

                            <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3'>
                                <Button
                                    icon={<HiOutlineRefresh />}
                                    variant='plain'
                                    className='hover:bg-slate-100 dark:hover:bg-gray-800'
                                    onClick={loadMe as any}>
                                    Refresh
                                </Button>

                                <Button loading={saving as any} variant='solid' onClick={saveProfile as any} className='w-full sm:w-auto'>
                                    Save Changes
                                </Button>
                            </div>
                        </div>

                        <div className='relative mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3'>
                            <StatPill icon={<HiOutlineKey className='text-base' />} label='Username' value={form.username || '—'} />
                            <StatPill
                                icon={<HiOutlineBadgeCheck className='text-base' />}
                                label={viewerType === 'vendor' ? 'Vendor Code' : 'Account Type'}
                                value={viewerType === 'vendor' ? form.vendorCode || '—' : typeLabel}
                            />
                            <StatPill icon={<HiOutlineBadgeCheck className='text-base' />} label='Subscription' value={subscriptionPillValue || '—'} />
                        </div>

                        {/* QUICK ACTIONS */}
                        <div className='relative mt-3 flex flex-wrap gap-2'>
                            <Button
                                size='sm'
                                variant='plain'
                                icon={<HiOutlineClipboardCopy />}
                                className='hover:bg-slate-100 dark:hover:bg-gray-800'
                                onClick={() => copyText('Username', form.username)}>
                                Copy Username
                            </Button>

                            {form.vendorCode ? (
                                <Button
                                    size='sm'
                                    variant='plain'
                                    icon={<HiOutlineClipboardCopy />}
                                    className='hover:bg-slate-100 dark:hover:bg-gray-800'
                                    onClick={() => copyText('Vendor Code', form.vendorCode)}>
                                    Copy Vendor Code
                                </Button>
                            ) : null}

                            {subscription?.orderId ? (
                                <Button
                                    size='sm'
                                    variant='plain'
                                    icon={<HiOutlineClipboardCopy />}
                                    className='hover:bg-slate-100 dark:hover:bg-gray-800'
                                    onClick={() => copyText('Order ID', subscription.orderId)}>
                                    Copy Order ID
                                </Button>
                            ) : null}

                            {subscription?.paymentId ? (
                                <Button
                                    size='sm'
                                    variant='plain'
                                    icon={<HiOutlineClipboardCopy />}
                                    className='hover:bg-slate-100 dark:hover:bg-gray-800'
                                    onClick={() => copyText('Payment ID', subscription.paymentId)}>
                                    Copy Payment ID
                                </Button>
                            ) : null}
                        </div>

                        {/* TABS */}
                        <div className='relative mt-5 flex flex-wrap gap-2'>
                            <button className={tabBtn(tab === 'profile')} onClick={() => setTab('profile')} type='button'>
                                <HiOutlineUser className='text-base' />
                                Profile
                                <HiOutlineChevronRight
                                    className={clsx('text-base opacity-0 group-hover:opacity-100 transition', tab === 'profile' && 'opacity-100')}
                                />
                            </button>

                            <button className={tabBtn(tab === 'business')} onClick={() => setTab('business')} type='button'>
                                <HiOutlineOfficeBuilding className='text-base' />
                                Business
                                <HiOutlineChevronRight
                                    className={clsx('text-base opacity-0 group-hover:opacity-100 transition', tab === 'business' && 'opacity-100')}
                                />
                            </button>

                            <button className={tabBtn(tab === 'security')} onClick={() => setTab('security')} type='button'>
                                <HiOutlineShieldCheck className='text-base' />
                                Security
                                <HiOutlineChevronRight
                                    className={clsx('text-base opacity-0 group-hover:opacity-100 transition', tab === 'security' && 'opacity-100')}
                                />
                            </button>
                        </div>
                    </div>
                </div>

                {/* CONTENT */}
                {tab === 'profile' ? (
                    <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
                        {/* Account Card */}
                        <div className='lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6'>
                            <div className='flex items-center justify-between gap-3 mb-4'>
                                <div>
                                    <div className='text-lg font-extrabold text-gray-900 dark:text-gray-100'>Account Details</div>
                                    <div className='text-sm text-gray-600 dark:text-gray-300'>Update your basic information (name & email).</div>
                                </div>
                            </div>

                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                <InputRow
                                    icon={<HiOutlineUser className='text-base' />}
                                    label='Full Name'
                                    value={form.name}
                                    onChange={(v) => setForm((p) => ({ ...p, name: v }))}
                                    placeholder='Enter your name'
                                />

                                <InputRow
                                    icon={<HiOutlineMail className='text-base' />}
                                    label='Email'
                                    value={form.email}
                                    onChange={(v) => setForm((p) => ({ ...p, email: v }))}
                                    placeholder='name@company.com'
                                />

                                <InputRow
                                    icon={<HiOutlineAtSymbol className='text-base' />}
                                    label='Username'
                                    value={form.username}
                                    disabled
                                    right={
                                        <button
                                            type='button'
                                            className='p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800'
                                            onClick={() => copyText('Username', form.username)}
                                            title='Copy'>
                                            <HiOutlineClipboardCopy className='text-gray-500 dark:text-gray-400' />
                                        </button>
                                    }
                                />

                                {form.vendorCode ? (
                                    <InputRow
                                        icon={<HiOutlineBadgeCheck className='text-base' />}
                                        label='Vendor Code'
                                        value={form.vendorCode}
                                        disabled
                                        right={
                                            <button
                                                type='button'
                                                className='p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800'
                                                onClick={() => copyText('Vendor Code', form.vendorCode)}
                                                title='Copy'>
                                                <HiOutlineClipboardCopy className='text-gray-500 dark:text-gray-400' />
                                            </button>
                                        }
                                    />
                                ) : null}
                            </div>

                            <div className='mt-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/40 p-4'>
                                <div className='text-sm font-bold text-gray-900 dark:text-gray-100'>Tips</div>
                                <ul className='mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300'>
                                    <li>• Username and vendor code are fixed (read-only).</li>
                                    <li>
                                        • Use the <span className='font-semibold'>Business</span> tab for firm/vendor details.
                                    </li>
                                    <li>
                                        • Use the <span className='font-semibold'>Security</span> tab to change your password.
                                    </li>
                                    <li>
                                        • Subscription details are shown in <span className='font-semibold'>Summary</span>.
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Side Summary */}
                        <div className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6'>
                            <div className='text-lg font-extrabold text-gray-900 dark:text-gray-100'>Summary</div>
                            <div className='mt-1 text-sm text-gray-600 dark:text-gray-300'>Quick view of your account context.</div>

                            <div className='mt-4 space-y-3'>
                                <div className='rounded-2xl border border-gray-200 dark:border-gray-700 p-4'>
                                    <div className='text-xs font-semibold text-gray-500 dark:text-gray-400'>Account Type</div>
                                    <div className='mt-1 text-sm font-extrabold text-gray-900 dark:text-gray-100'>{typeLabel}</div>
                                </div>

                                {/* ✅ Subscription Details */}
                                <div className='rounded-2xl border border-gray-200 dark:border-gray-700 p-4'>
                                    <div className='flex items-start justify-between gap-2'>
                                        <div>
                                            <div className='text-xs font-semibold text-gray-500 dark:text-gray-400'>Subscription</div>
                                            <div className='mt-1 text-sm font-extrabold text-gray-900 dark:text-gray-100'>
                                                {subscription?.plan ? cap(subscription.plan) : '—'}
                                            </div>
                                        </div>

                                        {subscription?.status ? (
                                            <span
                                                className={clsx(
                                                    'text-xs font-semibold px-3 py-1 rounded-full',
                                                    String(subscription.status).toLowerCase() === 'active'
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                                                        : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
                                                )}>
                                                {cap(subscription.status)}
                                            </span>
                                        ) : null}
                                    </div>

                                    <div className='mt-3 grid grid-cols-1 gap-2 text-sm'>
                                        <div className='flex items-center justify-between gap-2'>
                                            <span className='text-gray-600 dark:text-gray-300'>Amount</span>
                                            <span className='font-extrabold text-gray-900 dark:text-gray-100'>
                                                {money(subscription?.amount, subscription?.currency)}
                                            </span>
                                        </div>

                                        <div className='flex items-center justify-between gap-2'>
                                            <span className='text-gray-600 dark:text-gray-300'>Start</span>
                                            <span className='font-semibold text-gray-900 dark:text-gray-100'>{fmtDate(subscription?.startAt)}</span>
                                        </div>

                                        <div className='flex items-center justify-between gap-2'>
                                            <span className='text-gray-600 dark:text-gray-300'>End</span>
                                            <span className='font-semibold text-gray-900 dark:text-gray-100'>{fmtDate(subscription?.endAt)}</span>
                                        </div>

                                        {typeof daysLeft(subscription?.endAt) === 'number' ? (
                                            <div className='flex items-center justify-between gap-2'>
                                                <span className='text-gray-600 dark:text-gray-300'>Remaining</span>
                                                <span
                                                    className={clsx(
                                                        'font-extrabold',
                                                        (daysLeft(subscription?.endAt) as number) < 0
                                                            ? 'text-red-600 dark:text-red-400'
                                                            : 'text-gray-900 dark:text-gray-100',
                                                    )}>
                                                    {(daysLeft(subscription?.endAt) as number) < 0 ? 'Expired' : `${daysLeft(subscription?.endAt)} days`}
                                                </span>
                                            </div>
                                        ) : null}

                                        {subscription?.seats != null || subscription?.firmLimit != null ? (
                                            <div className='pt-2 mt-1 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-2'>
                                                <div className='rounded-xl border border-gray-200 dark:border-gray-700 p-2'>
                                                    <div className='text-[11px] font-semibold text-gray-500 dark:text-gray-400'>Seats</div>
                                                    <div className='text-sm font-extrabold text-gray-900 dark:text-gray-100'>
                                                        {String(subscription?.seats ?? '—')}
                                                    </div>
                                                </div>
                                                <div className='rounded-xl border border-gray-200 dark:border-gray-700 p-2'>
                                                    <div className='text-[11px] font-semibold text-gray-500 dark:text-gray-400'>Firm Limit</div>
                                                    <div className='text-sm font-extrabold text-gray-900 dark:text-gray-100'>
                                                        {String(subscription?.firmLimit ?? '—')}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}

                                        {subscription?.orderId ? (
                                            <div className='pt-2 mt-1 border-t border-gray-200 dark:border-gray-700'>
                                                <div className='flex items-center justify-between gap-2'>
                                                    <span className='text-gray-600 dark:text-gray-300'>Order ID</span>
                                                    <button
                                                        type='button'
                                                        className='inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-gray-200 hover:underline'
                                                        onClick={() => copyText('Order ID', subscription.orderId)}>
                                                        <HiOutlineClipboardCopy className='text-base' />
                                                        Copy
                                                    </button>
                                                </div>
                                                <div className='mt-1 text-xs font-mono text-gray-700 dark:text-gray-200 break-all'>{subscription.orderId}</div>
                                            </div>
                                        ) : null}

                                        {subscription?.paymentId ? (
                                            <div className='pt-2 mt-1 border-t border-gray-200 dark:border-gray-700'>
                                                <div className='flex items-center justify-between gap-2'>
                                                    <span className='text-gray-600 dark:text-gray-300'>Payment ID</span>
                                                    <button
                                                        type='button'
                                                        className='inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-gray-200 hover:underline'
                                                        onClick={() => copyText('Payment ID', subscription.paymentId)}>
                                                        <HiOutlineClipboardCopy className='text-base' />
                                                        Copy
                                                    </button>
                                                </div>
                                                <div className='mt-1 text-xs font-mono text-gray-700 dark:text-gray-200 break-all'>
                                                    {subscription.paymentId}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                {viewerType === 'firm' ? (
                                    <div className='rounded-2xl border border-gray-200 dark:border-gray-700 p-4'>
                                        <div className='text-xs font-semibold text-gray-500 dark:text-gray-400'>Company</div>
                                        <div className='mt-1 text-sm font-extrabold text-gray-900 dark:text-gray-100'>{form.company?.name || '—'}</div>
                                        <div className='mt-1 text-sm text-gray-600 dark:text-gray-300'>{form.company?.industry || '—'}</div>
                                    </div>
                                ) : null}

                                {viewerType === 'vendor' ? (
                                    <div className='rounded-2xl border border-gray-200 dark:border-gray-700 p-4'>
                                        <div className='text-xs font-semibold text-gray-500 dark:text-gray-400'>Location</div>
                                        <div className='mt-1 text-sm font-extrabold text-gray-900 dark:text-gray-100'>{form.vendor.city || '—'}</div>
                                        <div className='mt-1 text-sm text-gray-600 dark:text-gray-300'>
                                            {form.vendor.region || form.vendor.countryKey || '—'}
                                        </div>
                                    </div>
                                ) : null}

                                <div className='rounded-2xl border border-gray-200 dark:border-gray-700 p-4'>
                                    <div className='text-xs font-semibold text-gray-500 dark:text-gray-400'>Actions</div>
                                    <div className='mt-3 flex flex-col gap-2'>
                                        <Button
                                            variant='plain'
                                            className='hover:bg-slate-100 dark:hover:bg-gray-800 justify-start'
                                            icon={<HiOutlineRefresh />}
                                            onClick={loadMe as any}>
                                            Refresh data
                                        </Button>
                                        <Button
                                            variant='plain'
                                            className='hover:bg-slate-100 dark:hover:bg-gray-800 justify-start'
                                            icon={<HiOutlineLockClosed />}
                                            onClick={() => setTab('security')}>
                                            Go to security
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {tab === 'business' ? (
                    <div className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6'>
                        <div className='flex items-start justify-between gap-3 mb-4'>
                            <div className='flex items-center gap-2'>
                                <HiOutlineOfficeBuilding className='text-xl text-gray-600 dark:text-gray-300' />
                                <div>
                                    <div className='text-lg font-extrabold text-gray-900 dark:text-gray-100'>Business Details</div>
                                    <div className='text-sm text-gray-600 dark:text-gray-300'>
                                        {viewerType === 'firm'
                                            ? 'Manage your firm information.'
                                            : viewerType === 'vendor'
                                              ? 'Manage your vendor master information.'
                                              : 'Business details are managed by firm root.'}
                                    </div>
                                </div>
                            </div>

                            {!canEditCompany ? (
                                <span className='text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'>
                                    Read only
                                </span>
                            ) : null}
                        </div>

                        {/* FIRM */}
                        {viewerType === 'firm' ? (
                            <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                                <div className='rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5'>
                                    <div className='text-sm font-extrabold text-gray-900 dark:text-gray-100 mb-3'>Company Identity</div>
                                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                        <InputRow
                                            icon={<HiOutlineOfficeBuilding className='text-base' />}
                                            label='Company Name'
                                            value={form.company.name}
                                            onChange={(v) => setForm((p) => ({ ...p, company: { ...p.company, name: v } }))}
                                            disabled={!canEditCompany}
                                            placeholder='Your company name'
                                        />
                                        <InputRow
                                            icon={<HiOutlineBadgeCheck className='text-base' />}
                                            label='Industry'
                                            value={form.company.industry}
                                            onChange={(v) => setForm((p) => ({ ...p, company: { ...p.company, industry: v } }))}
                                            disabled={!canEditCompany}
                                            placeholder='Steel / Logistics / Manufacturing...'
                                        />
                                        <InputRow
                                            icon={<HiOutlineIdentification className='text-base' />}
                                            label='GSTIN'
                                            value={form.company.gstin}
                                            onChange={(v) => setForm((p) => ({ ...p, company: { ...p.company, gstin: v } }))}
                                            disabled={!canEditCompany}
                                            placeholder='GSTIN'
                                        />
                                        <InputRow
                                            icon={<HiOutlineIdentification className='text-base' />}
                                            label='PAN'
                                            value={form.company.pan}
                                            onChange={(v) => setForm((p) => ({ ...p, company: { ...p.company, pan: v } }))}
                                            disabled={!canEditCompany}
                                            placeholder='PAN'
                                        />
                                    </div>
                                </div>

                                <div className='rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5'>
                                    <div className='text-sm font-extrabold text-gray-900 dark:text-gray-100 mb-3'>Contact & Address</div>
                                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                        <InputRow
                                            icon={<HiOutlinePhone className='text-base' />}
                                            label='Phone'
                                            value={form.company.phone}
                                            onChange={(v) => setForm((p) => ({ ...p, company: { ...p.company, phone: v } }))}
                                            disabled={!canEditCompany}
                                            placeholder='+91...'
                                        />
                                        <InputRow
                                            icon={<HiOutlineGlobeAlt className='text-base' />}
                                            label='Website'
                                            value={form.company.website}
                                            onChange={(v) => setForm((p) => ({ ...p, company: { ...p.company, website: v } }))}
                                            disabled={!canEditCompany}
                                            placeholder='https://...'
                                        />

                                        <InputRow
                                            icon={<HiOutlineLocationMarker className='text-base' />}
                                            label='Address Line 1'
                                            value={form.company.addressLine1}
                                            onChange={(v) => setForm((p) => ({ ...p, company: { ...p.company, addressLine1: v } }))}
                                            disabled={!canEditCompany}
                                            placeholder='Street / Building'
                                        />
                                        <InputRow
                                            icon={<HiOutlineLocationMarker className='text-base' />}
                                            label='Address Line 2'
                                            value={form.company.addressLine2}
                                            onChange={(v) => setForm((p) => ({ ...p, company: { ...p.company, addressLine2: v } }))}
                                            disabled={!canEditCompany}
                                            placeholder='Area / Landmark'
                                        />

                                        <InputRow
                                            icon={<HiOutlineLocationMarker className='text-base' />}
                                            label='City'
                                            value={form.company.city}
                                            onChange={(v) => setForm((p) => ({ ...p, company: { ...p.company, city: v } }))}
                                            disabled={!canEditCompany}
                                        />
                                        <InputRow
                                            icon={<HiOutlineLocationMarker className='text-base' />}
                                            label='State'
                                            value={form.company.state}
                                            onChange={(v) => setForm((p) => ({ ...p, company: { ...p.company, state: v } }))}
                                            disabled={!canEditCompany}
                                        />
                                        <InputRow
                                            icon={<HiOutlineLocationMarker className='text-base' />}
                                            label='Pincode'
                                            value={form.company.pincode}
                                            onChange={(v) => setForm((p) => ({ ...p, company: { ...p.company, pincode: v } }))}
                                            disabled={!canEditCompany}
                                        />
                                        <div />
                                    </div>
                                </div>
                                <div className='lg:col-span-2'>
                                    <FirmEmployeesManager
                                        seatsAllowed={Number(subscription?.seats ?? 0) || null}
                                        onChanged={() => {
                                            // refresh profile + subscription + stats after employee creation
                                            loadMe()
                                        }}
                                    />
                                </div>
                            </div>
                        ) : null}

                        {/* EMPLOYEE */}
                        {viewerType === 'employee' ? (
                            <div className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/40 p-4'>
                                <div className='text-sm font-extrabold text-gray-900 dark:text-gray-100'>Limited access</div>
                                <div className='mt-1 text-sm text-gray-600 dark:text-gray-300'>
                                    Firm employees can edit only basic profile fields (name/email). Company details are managed by firm root.
                                </div>
                            </div>
                        ) : null}

                        {/* VENDOR */}
                        {viewerType === 'vendor' ? (
                            <div className='space-y-4'>
                                {/* Compliance */}
                                <div className='rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5'>
                                    <div className='text-sm font-extrabold text-gray-900 dark:text-gray-100 mb-3'>Compliance & Identity</div>
                                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                                        <InputRow
                                            icon={<HiOutlineIdentification className='text-base' />}
                                            label='GSTIN'
                                            value={form.vendor.gstin}
                                            onChange={(v) => setForm((p) => ({ ...p, vendor: { ...p.vendor, gstin: v } }))}
                                            placeholder='GSTIN'
                                        />
                                        <InputRow
                                            icon={<HiOutlineIdentification className='text-base' />}
                                            label='PAN'
                                            value={form.vendor.panNumber}
                                            onChange={(v) => setForm((p) => ({ ...p, vendor: { ...p.vendor, panNumber: v } }))}
                                            placeholder='PAN'
                                        />
                                        <InputRow
                                            icon={<HiOutlineBadgeCheck className='text-base' />}
                                            label='MSME'
                                            value={form.vendor.msme}
                                            onChange={(v) => setForm((p) => ({ ...p, vendor: { ...p.vendor, msme: v } }))}
                                            placeholder='MSME (optional)'
                                        />
                                        <InputRow
                                            icon={<HiOutlineBadgeCheck className='text-base' />}
                                            label='Company Code'
                                            value={form.vendor.companyCode}
                                            disabled
                                            right={
                                                <button
                                                    type='button'
                                                    className='p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800'
                                                    onClick={() => copyText('Company Code', form.vendor.companyCode)}
                                                    title='Copy'>
                                                    <HiOutlineClipboardCopy className='text-gray-500 dark:text-gray-400' />
                                                </button>
                                            }
                                        />
                                        <InputRow
                                            icon={<HiOutlineOfficeBuilding className='text-base' />}
                                            label='Org Name 1'
                                            value={form.vendor.orgName1}
                                            onChange={(v) => setForm((p) => ({ ...p, vendor: { ...p.vendor, orgName1: v } }))}
                                        />
                                        <InputRow
                                            icon={<HiOutlineOfficeBuilding className='text-base' />}
                                            label='Org Name 2'
                                            value={form.vendor.orgName2}
                                            onChange={(v) => setForm((p) => ({ ...p, vendor: { ...p.vendor, orgName2: v } }))}
                                        />
                                    </div>
                                </div>

                                {/* Location */}
                                <div className='rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5'>
                                    <div className='text-sm font-extrabold text-gray-900 dark:text-gray-100 mb-3'>Location</div>
                                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                                        <InputRow
                                            icon={<HiOutlineGlobeAlt className='text-base' />}
                                            label='Country Key'
                                            value={form.vendor.countryKey}
                                            onChange={(v) => setForm((p) => ({ ...p, vendor: { ...p.vendor, countryKey: v } }))}
                                        />
                                        <InputRow
                                            icon={<HiOutlineLocationMarker className='text-base' />}
                                            label='Region'
                                            value={form.vendor.region}
                                            onChange={(v) => setForm((p) => ({ ...p, vendor: { ...p.vendor, region: v } }))}
                                        />
                                        <InputRow
                                            icon={<HiOutlineLocationMarker className='text-base' />}
                                            label='City'
                                            value={form.vendor.city}
                                            onChange={(v) => setForm((p) => ({ ...p, vendor: { ...p.vendor, city: v } }))}
                                        />
                                        <InputRow
                                            icon={<HiOutlineLocationMarker className='text-base' />}
                                            label='District'
                                            value={form.vendor.district}
                                            onChange={(v) => setForm((p) => ({ ...p, vendor: { ...p.vendor, district: v } }))}
                                        />
                                        <InputRow
                                            icon={<HiOutlineLocationMarker className='text-base' />}
                                            label='Postal Code'
                                            value={form.vendor.postalCode}
                                            onChange={(v) => setForm((p) => ({ ...p, vendor: { ...p.vendor, postalCode: v } }))}
                                        />
                                        <InputRow
                                            icon={<HiOutlineLocationMarker className='text-base' />}
                                            label='PO Box'
                                            value={form.vendor.poBox}
                                            onChange={(v) => setForm((p) => ({ ...p, vendor: { ...p.vendor, poBox: v } }))}
                                        />
                                        <InputRow
                                            icon={<HiOutlineLocationMarker className='text-base' />}
                                            label='PO Box Postal Code'
                                            value={form.vendor.poBoxPostalCode}
                                            onChange={(v) => setForm((p) => ({ ...p, vendor: { ...p.vendor, poBoxPostalCode: v } }))}
                                        />
                                        <InputRow
                                            icon={<HiOutlineLocationMarker className='text-base' />}
                                            label='Street / House No.'
                                            value={form.vendor.streetHouseNumber}
                                            onChange={(v) => setForm((p) => ({ ...p, vendor: { ...p.vendor, streetHouseNumber: v } }))}
                                        />
                                        <InputRow
                                            icon={<HiOutlineBadgeCheck className='text-base' />}
                                            label='Language Key'
                                            value={form.vendor.languageKey}
                                            onChange={(v) => setForm((p) => ({ ...p, vendor: { ...p.vendor, languageKey: v } }))}
                                        />
                                    </div>
                                </div>

                                {/* Address lines */}
                                <div className='rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5'>
                                    <div className='text-sm font-extrabold text-gray-900 dark:text-gray-100 mb-3'>Address Lines</div>
                                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                        <InputRow
                                            icon={<HiOutlineLocationMarker className='text-base' />}
                                            label='Street 1'
                                            value={form.vendor.street}
                                            onChange={(v) => setForm((p) => ({ ...p, vendor: { ...p.vendor, street: v } }))}
                                        />
                                        <InputRow
                                            icon={<HiOutlineLocationMarker className='text-base' />}
                                            label='Street 2'
                                            value={form.vendor.street2}
                                            onChange={(v) => setForm((p) => ({ ...p, vendor: { ...p.vendor, street2: v } }))}
                                        />
                                        <InputRow
                                            icon={<HiOutlineLocationMarker className='text-base' />}
                                            label='Street 3'
                                            value={form.vendor.street3}
                                            onChange={(v) => setForm((p) => ({ ...p, vendor: { ...p.vendor, street3: v } }))}
                                        />
                                        <InputRow
                                            icon={<HiOutlineLocationMarker className='text-base' />}
                                            label='Street 4'
                                            value={form.vendor.street4}
                                            onChange={(v) => setForm((p) => ({ ...p, vendor: { ...p.vendor, street4: v } }))}
                                        />
                                        <InputRow
                                            icon={<HiOutlineLocationMarker className='text-base' />}
                                            label='Street 5'
                                            value={form.vendor.street5}
                                            onChange={(v) => setForm((p) => ({ ...p, vendor: { ...p.vendor, street5: v } }))}
                                        />
                                        <div />
                                    </div>
                                </div>

                                {/* Contact Persons */}
                                <div className='rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5'>
                                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3'>
                                        <div>
                                            <div className='text-sm font-extrabold text-gray-900 dark:text-gray-100'>Contact Persons</div>
                                            <div className='text-sm text-gray-600 dark:text-gray-300'>Add vendor contact persons for RFQ communications.</div>
                                        </div>
                                        <Button size='sm' variant='solid' icon={<HiOutlinePlus />} onClick={addContactPerson as any}>
                                            Add Contact
                                        </Button>
                                    </div>

                                    {(form.vendor.contactPerson || []).length === 0 ? (
                                        <div className='rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300'>
                                            No contact persons added yet.
                                        </div>
                                    ) : null}

                                    <div className='mt-3 space-y-3'>
                                        {(form.vendor.contactPerson || []).map((cp, idx) => (
                                            <div
                                                key={idx}
                                                className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/40 p-4'>
                                                <div className='flex items-center justify-between gap-2 mb-3'>
                                                    <div className='text-sm font-extrabold text-gray-900 dark:text-gray-100'>Contact #{idx + 1}</div>
                                                    <Button
                                                        size='sm'
                                                        variant='plain'
                                                        className='text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                        icon={<HiOutlineTrash />}
                                                        onClick={() => removeContactPerson(idx)}>
                                                        Remove
                                                    </Button>
                                                </div>

                                                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                                                    <InputRow
                                                        icon={<HiOutlineUser className='text-base' />}
                                                        label='Name'
                                                        value={cp?.name || ''}
                                                        onChange={(v) => {
                                                            setForm((p) => {
                                                                const list = [...(p.vendor.contactPerson || [])]
                                                                list[idx] = { ...(list[idx] || {}), name: v }
                                                                return { ...p, vendor: { ...p.vendor, contactPerson: list } }
                                                            })
                                                        }}
                                                        placeholder='Person name'
                                                    />
                                                    <InputRow
                                                        icon={<HiOutlineMail className='text-base' />}
                                                        label='Email'
                                                        value={cp?.email || ''}
                                                        onChange={(v) => {
                                                            setForm((p) => {
                                                                const list = [...(p.vendor.contactPerson || [])]
                                                                list[idx] = { ...(list[idx] || {}), email: v }
                                                                return { ...p, vendor: { ...p.vendor, contactPerson: list } }
                                                            })
                                                        }}
                                                        placeholder='name@company.com'
                                                    />
                                                    <InputRow
                                                        icon={<HiOutlinePhone className='text-base' />}
                                                        label='Full Phone'
                                                        value={cp?.fullPhoneNumber || ''}
                                                        onChange={(v) => {
                                                            setForm((p) => {
                                                                const list = [...(p.vendor.contactPerson || [])]
                                                                list[idx] = { ...(list[idx] || {}), fullPhoneNumber: v }
                                                                return { ...p, vendor: { ...p.vendor, contactPerson: list } }
                                                            })
                                                        }}
                                                        placeholder='+91...'
                                                    />

                                                    <InputRow
                                                        icon={<HiOutlinePhone className='text-base' />}
                                                        label='Mobile Indicator'
                                                        value={cp?.mobilePhoneIndicator || ''}
                                                        onChange={(v) => {
                                                            setForm((p) => {
                                                                const list = [...(p.vendor.contactPerson || [])]
                                                                list[idx] = { ...(list[idx] || {}), mobilePhoneIndicator: v }
                                                                return { ...p, vendor: { ...p.vendor, contactPerson: list } }
                                                            })
                                                        }}
                                                        placeholder='e.g. Y/N'
                                                    />
                                                    <InputRow
                                                        icon={<HiOutlinePhone className='text-base' />}
                                                        label='Caller Phone'
                                                        value={cp?.callerPhoneNumber || ''}
                                                        onChange={(v) => {
                                                            setForm((p) => {
                                                                const list = [...(p.vendor.contactPerson || [])]
                                                                list[idx] = { ...(list[idx] || {}), callerPhoneNumber: v }
                                                                return { ...p, vendor: { ...p.vendor, contactPerson: list } }
                                                            })
                                                        }}
                                                        placeholder='Caller phone'
                                                    />
                                                    <div />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {tab === 'security' ? (
                    <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
                        <div className='lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6'>
                            <div className='flex items-start justify-between gap-3 mb-4'>
                                <div className='flex items-center gap-2'>
                                    <HiOutlineLockClosed className='text-xl text-gray-600 dark:text-gray-300' />
                                    <div>
                                        <div className='text-lg font-extrabold text-gray-900 dark:text-gray-100'>Change Password</div>
                                        <div className='text-sm text-gray-600 dark:text-gray-300'>
                                            Keep your account secure by updating your password regularly.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                <InputRow
                                    icon={<HiOutlineKey className='text-base' />}
                                    label='Old Password'
                                    value={pwd.oldPassword}
                                    onChange={(v) => setPwd((p) => ({ ...p, oldPassword: v }))}
                                    type={showPwd.old ? 'text' : 'password'}
                                    right={
                                        <button
                                            type='button'
                                            className='p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800'
                                            onClick={() => setShowPwd((p) => ({ ...p, old: !p.old }))}
                                            title={showPwd.old ? 'Hide' : 'Show'}>
                                            {showPwd.old ? (
                                                <HiOutlineEyeOff className='text-gray-500 dark:text-gray-400' />
                                            ) : (
                                                <HiOutlineEye className='text-gray-500 dark:text-gray-400' />
                                            )}
                                        </button>
                                    }
                                />

                                <div />

                                <InputRow
                                    icon={<HiOutlineKey className='text-base' />}
                                    label='New Password'
                                    value={pwd.newPassword}
                                    onChange={(v) => setPwd((p) => ({ ...p, newPassword: v }))}
                                    type={showPwd.next ? 'text' : 'password'}
                                    right={
                                        <button
                                            type='button'
                                            className='p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800'
                                            onClick={() => setShowPwd((p) => ({ ...p, next: !p.next }))}
                                            title={showPwd.next ? 'Hide' : 'Show'}>
                                            {showPwd.next ? (
                                                <HiOutlineEyeOff className='text-gray-500 dark:text-gray-400' />
                                            ) : (
                                                <HiOutlineEye className='text-gray-500 dark:text-gray-400' />
                                            )}
                                        </button>
                                    }
                                />

                                <InputRow
                                    icon={<HiOutlineKey className='text-base' />}
                                    label='Confirm Password'
                                    value={pwd.confirm}
                                    onChange={(v) => setPwd((p) => ({ ...p, confirm: v }))}
                                    type={showPwd.confirm ? 'text' : 'password'}
                                    right={
                                        <button
                                            type='button'
                                            className='p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800'
                                            onClick={() => setShowPwd((p) => ({ ...p, confirm: !p.confirm }))}
                                            title={showPwd.confirm ? 'Hide' : 'Show'}>
                                            {showPwd.confirm ? (
                                                <HiOutlineEyeOff className='text-gray-500 dark:text-gray-400' />
                                            ) : (
                                                <HiOutlineEye className='text-gray-500 dark:text-gray-400' />
                                            )}
                                        </button>
                                    }
                                />
                            </div>

                            <div className='mt-5 flex justify-end'>
                                <Button
                                    type='button'
                                    loading={pwdLoading as any}
                                    disabled={pwdLoading as any}
                                    variant='solid'
                                    onClick={(e: any) => {
                                        e?.preventDefault?.()
                                        e?.stopPropagation?.()
                                        void changePassword()
                                    }}>
                                    Change Password
                                </Button>
                            </div>
                        </div>

                        <div className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6'>
                            <div className='text-lg font-extrabold text-gray-900 dark:text-gray-100'>Password rules</div>
                            <div className='mt-1 text-sm text-gray-600 dark:text-gray-300'>For best security:</div>

                            <div className='mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-200'>
                                <div className='rounded-xl border border-gray-200 dark:border-gray-700 p-3'>
                                    • Minimum <span className='font-bold'>6 characters</span>
                                </div>
                                <div className='rounded-xl border border-gray-200 dark:border-gray-700 p-3'>• Avoid sharing your password with anyone</div>
                                <div className='rounded-xl border border-gray-200 dark:border-gray-700 p-3'>• Use a mix of letters & numbers if possible</div>
                            </div>

                            <div className='mt-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/20 p-4'>
                                <div className='text-sm font-extrabold text-emerald-900 dark:text-emerald-100'>Tip</div>
                                <div className='mt-1 text-sm text-emerald-800 dark:text-emerald-200'>
                                    After changing password, log out and log in once to ensure everything is updated across devices.
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Mobile sticky action bar */}
                <div className='sm:hidden sticky bottom-3 z-10'>
                    <div className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur p-3 shadow-lg'>
                        <div className='flex items-center gap-2'>
                            <Button
                                icon={<HiOutlineRefresh />}
                                variant='plain'
                                className='flex-1 hover:bg-slate-100 dark:hover:bg-gray-800'
                                onClick={loadMe as any}>
                                Refresh
                            </Button>
                            <Button loading={saving as any} variant='solid' className='flex-1' onClick={saveProfile as any}>
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
