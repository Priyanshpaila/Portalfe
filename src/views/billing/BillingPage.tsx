// src/pages/BillingPage.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { useLocation, useNavigate } from 'react-router-dom'
import {
    HiOutlineBadgeCheck,
    HiOutlineClipboardCopy,
    HiOutlineCreditCard,
    HiOutlineExclamationCircle,
    HiOutlineKey,
    HiOutlineLockClosed,
    HiOutlineRefresh,
    HiOutlineShieldCheck,
    HiOutlineLink,
} from 'react-icons/hi'

import { Button } from '@/components/ui'
import Avatar from '@/components/ui/Avatar'
import BillingService, {
    type BillingPlan,
    type BillingPlansResponse,
    type BillingStatusResponse,
    type CreateOrderResponse,
    type UpgradeSeatsOrderResponse,
    type VerifyResponse,
} from '@/services/BillingService' // ✅ adjust if your file path/name differs
import { UserApi } from '@/services/user.api'
import ConnectionsService, { type LinkItem } from '@/services/connections.api'

/* ---------------- Razorpay typing ---------------- */
declare global {
    interface Window {
        Razorpay?: any
    }
}

/* ---------------- Helpers ---------------- */

function clsx(...arr: Array<string | false | undefined | null>) {
    return arr.filter(Boolean).join(' ')
}

function unwrapResponse<T = any>(res: any): T {
    return (res?.data ?? res) as T
}

function cap(s?: any) {
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

function isFuture(iso?: string | null) {
    if (!iso) return false
    const t = new Date(iso).getTime()
    if (!Number.isFinite(t)) return false
    return t > Date.now()
}

function daysLeft(endAt?: string | null) {
    if (!endAt) return null
    const end = new Date(endAt).getTime()
    if (!Number.isFinite(end)) return null
    const diff = end - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function money(amountPaise?: number, currency?: string) {
    if (amountPaise == null || !Number.isFinite(Number(amountPaise))) return '—'
    const cur = String(currency || '').toUpperCase() || 'INR'
    const value = Number(amountPaise) / 100
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

async function loadRazorpayScript() {
    return new Promise<boolean>((resolve) => {
        if (window.Razorpay) return resolve(true)

        const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
        if (existing) {
            existing.addEventListener('load', () => resolve(true))
            existing.addEventListener('error', () => resolve(false))
            return
        }

        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.body.appendChild(script)
    })
}

type ProfileType = 'vendor' | 'firm_employee' | 'firm_root'

type ProfilePayload = {
    ok?: boolean
    type?: ProfileType
    profile?: {
        _id?: string
        name?: string
        email?: string
        username?: string
        vendorCode?: string | null
        firmId?: string | null
    }
}

/* ---------------- Page ---------------- */

export default function BillingPage() {
    const navigate = useNavigate()
    const location = useLocation() as any

    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)

    const [profileType, setProfileType] = useState<ProfileType | null>(null)
    const [me, setMe] = useState<ProfilePayload['profile'] | null>(null)

    const [plansRes, setPlansRes] = useState<BillingPlansResponse | null>(null)
    const [statusRes, setStatusRes] = useState<BillingStatusResponse | null>(null)

    // firm root: new subscription (upgrade/renew)
    const [upgradePlanId, setUpgradePlanId] = useState<string>('')
    const [upgradeSeats, setUpgradeSeats] = useState<number>(1)

    // firm root: add seats (prorated)
    const [addSeats, setAddSeats] = useState<number>(1)

    // ✅ vendor: active links (to detect uncovered + pay to cover)
    const [vendorLinksLoading, setVendorLinksLoading] = useState(false)
    const [vendorActiveLinks, setVendorActiveLinks] = useState<LinkItem[]>([])
    const [selectedUncoveredLinkId, setSelectedUncoveredLinkId] = useState<string>('')
    const [customAddConnections, setCustomAddConnections] = useState<number>(0)

    const plans: BillingPlan[] = useMemo(() => plansRes?.plans || [], [plansRes])
    const subscription = statusRes?.subscription || null

    const isVendor = profileType === 'vendor'
    const isFirmRoot = profileType === 'firm_root'
    const isFirmEmployee = profileType === 'firm_employee'

    const activeDaysLeft = useMemo(() => {
        const d = daysLeft(subscription?.endAt || null)
        return typeof d === 'number' ? d : null
    }, [subscription?.endAt])

    const canPurchase = useMemo(() => {
        return !isFirmEmployee
    }, [isFirmEmployee])

    const canVendorUpgradeToYearly = useMemo(() => {
        if (!isVendor) return false
        const status = String(subscription?.status || '').toLowerCase()
        const plan = String(subscription?.plan || '').toLowerCase()
        if (status !== 'active') return true
        return plan.startsWith('monthly')
    }, [isVendor, subscription?.plan, subscription?.status])

    const selectedUpgradePlan = useMemo(() => {
        const pid = String(upgradePlanId || '').trim()
        if (!pid) return null
        return plans.find((p) => p.plan === pid) || null
    }, [plans, upgradePlanId])

    // ✅ vendor coverage math
    const firmLimit = useMemo(() => Math.max(1, Number(subscription?.firmLimit || 1)), [subscription?.firmLimit])
    const activeLinksCount = useMemo(() => vendorActiveLinks.length, [vendorActiveLinks])

    const uncoveredActiveLinks = useMemo(() => {
        // uncovered = active link but no endAt in future
        return vendorActiveLinks.filter((x: any) => !(x?.endAt && isFuture(x.endAt)))
    }, [vendorActiveLinks])

    const uncoveredCount = useMemo(() => uncoveredActiveLinks.length, [uncoveredActiveLinks])

    const requiredExtraToCover = useMemo(() => {
        // backend uses activeLinksCount - firmLimit
        return Math.max(0, activeLinksCount - firmLimit)
    }, [activeLinksCount, firmLimit])

    // default selections after data load
    useEffect(() => {
        if (!plans.length) return

        // vendor: default to yearly (upgrade target)
        if (isVendor) {
            if (!upgradePlanId) setUpgradePlanId('yearly')
            return
        }

        // firm: try current plan else yearly
        if (isFirmRoot || isFirmEmployee) {
            if (!upgradePlanId) {
                const current = String(subscription?.plan || '').trim()
                const preferred =
                    (current && plans.some((p) => p.plan === current) && current) || (plans.some((p) => p.plan === 'yearly') && 'yearly') || plans[0].plan
                setUpgradePlanId(preferred)
            }

            const currSeats = Number(subscription?.seats || 1)
            if (Number.isFinite(currSeats) && currSeats > 0) setUpgradeSeats(currSeats)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plans.length, isVendor, isFirmRoot, isFirmEmployee])

    async function loadVendorActiveLinksIfNeeded(nextProfileType?: ProfileType | null) {
        const pt = nextProfileType ?? profileType
        if (pt !== 'vendor') return

        setVendorLinksLoading(true)
        try {
            const res = await ConnectionsService.getLinks({ status: 'active' })
            const raw = unwrapResponse<any>(res)
            const items = Array.isArray(raw?.items) ? raw.items : []
            setVendorActiveLinks(items)

            // Preselect uncovered link:
            // 1) from navigation state (ConnectionsPage)
            // 2) else first uncovered
            // 3) else first active
            const stateLinkId = String(location?.state?.linkId || '').trim()
            if (stateLinkId) {
                setSelectedUncoveredLinkId(stateLinkId)
            } else {
                const firstUncovered = items.find((x: any) => !(x?.endAt && isFuture(x.endAt)))
                const firstAny = items[0]
                setSelectedUncoveredLinkId(String(firstUncovered?._id || firstAny?._id || ''))
            }
        } catch (e: any) {
            setVendorActiveLinks([])
            toast.error(e?.response?.data?.message || e?.message || 'Failed to load vendor links')
        } finally {
            setVendorLinksLoading(false)
        }
    }

    async function loadAll() {
        setLoading(true)
        try {
            const profRes = await UserApi.getProfile()
            const prof = unwrapResponse<ProfilePayload>(profRes)

            const pt = (prof?.type as ProfileType) || null
            setProfileType(pt)
            setMe(prof?.profile || null)

            const [stRes, plRes] = await Promise.all([BillingService.getStatus(), BillingService.getPlans()])
            setStatusRes(unwrapResponse<BillingStatusResponse>(stRes))
            setPlansRes(unwrapResponse<BillingPlansResponse>(plRes))

            // ✅ load vendor links after we know vendor
            await loadVendorActiveLinksIfNeeded(pt)
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Failed to load billing data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadAll()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function openRazorpayAndVerify(opts: {
        keyId: string
        orderId: string
        amount: number
        currency: string
        description: string
        verifyFn: (payload: { orderId: string; paymentId: string; signature: string }) => Promise<any>
        onAfter?: () => void
    }) {
        const ok = await loadRazorpayScript()
        if (!ok) {
            toast.error('Failed to load Razorpay. Check network and try again.')
            return
        }

        return new Promise<void>((resolve) => {
            const rzp = new window.Razorpay({
                key: opts.keyId,
                amount: opts.amount,
                currency: opts.currency,
                name: 'Subscription Billing',
                description: opts.description,
                order_id: opts.orderId,
                prefill: {
                    name: me?.name || '',
                    email: me?.email || '',
                },
                theme: { color: '#0f172a' },
                handler: async (resp: any) => {
                    try {
                        const orderId = resp?.razorpay_order_id
                        const paymentId = resp?.razorpay_payment_id
                        const signature = resp?.razorpay_signature

                        if (!orderId || !paymentId || !signature) {
                            toast.error('Payment succeeded but response is incomplete.')
                            return resolve()
                        }

                        const vr = await opts.verifyFn({ orderId, paymentId, signature })
                        const vOut = unwrapResponse<VerifyResponse>(vr)
                        toast.success(vOut?.message || 'Payment verified')

                        opts.onAfter?.()
                        resolve()
                    } catch (e: any) {
                        toast.error(e?.response?.data?.message || e?.message || 'Payment verification failed')
                        resolve()
                    }
                },
                modal: {
                    ondismiss: () => resolve(),
                },
            })

            rzp.open()
        })
    }

    // ---------------- Actions ----------------

    async function buyOrUpgradeSubscription(planId: string, seats?: number) {
        if (!canPurchase) return toast.error('You cannot purchase/upgrade. Contact firm admin.')
        if (!planId) return toast.error('Select a plan')

        setBusy(true)
        try {
            const payload: any = { plan: planId }

            if (!isVendor) {
                const s = Number(seats || 1)
                payload.seats = Number.isFinite(s) && s > 0 ? Math.trunc(s) : 1
            }

            const orderRes = await BillingService.createOrder(payload)
            const out = unwrapResponse<CreateOrderResponse>(orderRes)

            if (!out?.ok || !out?.order?.id) {
                toast.error('Failed to create order')
                return
            }

            await openRazorpayAndVerify({
                keyId: out.keyId,
                orderId: out.order.id,
                amount: out.order.amount,
                currency: out.order.currency,
                description: `Subscription ${planId}`,
                verifyFn: BillingService.verifyPayment,
                onAfter: loadAll,
            })
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Failed to start purchase')
        } finally {
            setBusy(false)
        }
    }

    async function firmAddSeats() {
        if (!canPurchase) return toast.error('Only firm admin can upgrade seats.')
        if (!isFirmRoot) return toast.error('Only firm root can upgrade seats.')

        const delta = Math.trunc(Number(addSeats || 0))
        if (!delta || delta < 1) return toast.error('Enter seats to add (min 1).')

        setBusy(true)
        try {
            const orderRes = await BillingService.firmAddSeatsOrder({ addSeats: delta })
            const out = unwrapResponse<UpgradeSeatsOrderResponse>(orderRes)

            if (!out?.ok || !out?.order?.id) {
                toast.error('Failed to create seats upgrade order')
                return
            }

            await openRazorpayAndVerify({
                keyId: out.keyId,
                orderId: out.order.id,
                amount: out.order.amount,
                currency: out.order.currency,
                description: `Add ${delta} seat(s)`,
                verifyFn: BillingService.firmAddSeatsVerify,
                onAfter: loadAll,
            })
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Failed to start seats upgrade')
        } finally {
            setBusy(false)
        }
    }

    // ✅ vendor: pay to cover uncovered active links
    async function vendorBuyConnections(opts?: { useCustom?: boolean }) {
        if (!isVendor) return toast.error('Only vendors can buy connections.')
        if (!canPurchase) return toast.error('Purchases disabled.')
        if (!selectedUncoveredLinkId) return toast.error('Select an active/uncovered link first.')

        setBusy(true)
        try {
            const delta = opts?.useCustom ? Math.max(0, Math.trunc(Number(customAddConnections || 0))) : undefined
            const orderRes = await BillingService.vendorAddConnectionsOrder({
                linkId: selectedUncoveredLinkId,
                addConnections: delta, // undefined => backend auto computes requiredExtra
            } as any)

            const out: any = unwrapResponse(orderRes)

            if (out?.noPaymentRequired) {
                toast.success(out?.message || 'No payment required.')
                await loadAll()
                return
            }

            if (!out?.ok || !out?.order?.id || !out?.keyId) {
                toast.error('Failed to create connections upgrade order')
                return
            }

            await openRazorpayAndVerify({
                keyId: out.keyId,
                orderId: out.order.id,
                amount: out.order.amount,
                currency: out.order.currency,
                description: `Upgrade connections`,
                verifyFn: BillingService.vendorAddConnectionsVerify,
                onAfter: loadAll,
            })
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Failed to start connections upgrade')
        } finally {
            setBusy(false)
        }
    }

    // ---------------- UI ----------------

    const headerSubtitle = useMemo(() => {
        if (isVendor) return 'View your subscription, upgrade (monthly → yearly), and cover uncovered active links.'
        if (isFirmRoot) return 'Manage firm subscription, upgrade plan, and add seats.'
        if (isFirmEmployee) return 'View firm subscription. Only firm admin can upgrade.'
        return 'Subscription & Billing'
    }, [isVendor, isFirmRoot, isFirmEmployee])

    const pill = (label: string, value: string, icon?: React.ReactNode) => (
        <div className='rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60 px-3 py-2'>
            <div className='text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5'>
                <span className='text-gray-500 dark:text-gray-400'>{icon}</span>
                <span className='font-semibold'>{label}</span>
            </div>
            <div className='mt-0.5 text-sm font-bold text-gray-900 dark:text-gray-100 truncate'>{value || '—'}</div>
        </div>
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
                {/* HEADER */}
                <div className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden'>
                    <div className='relative p-5 sm:p-6'>
                        <div className='absolute inset-0 opacity-60 pointer-events-none'>
                            <div className='absolute -top-24 -right-24 h-56 w-56 rounded-full bg-slate-100 dark:bg-gray-800 blur-2xl' />
                            <div className='absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-emerald-50 dark:bg-emerald-900/20 blur-2xl' />
                        </div>

                        <div className='relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4'>
                            <div className='flex items-start gap-3'>
                                <Avatar shape='circle' size={56 as any} icon={<HiOutlineCreditCard />} />
                                <div className='min-w-0'>
                                    <div className='flex flex-wrap items-center gap-2'>
                                        <div className='text-xl font-extrabold text-gray-900 dark:text-gray-100 truncate'>Billing</div>

                                        <span className='inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'>
                                            <HiOutlineBadgeCheck className='text-base' />
                                            {isVendor ? 'Vendor' : isFirmRoot ? 'Firm Root' : isFirmEmployee ? 'Firm Employee' : 'User'}
                                        </span>

                                        {subscription?.status ? (
                                            <span
                                                className={clsx(
                                                    'inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full',
                                                    String(subscription.status).toLowerCase() === 'active'
                                                        ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200'
                                                        : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
                                                )}>
                                                <HiOutlineShieldCheck className='text-base' />
                                                {cap(subscription.status)}
                                            </span>
                                        ) : null}
                                    </div>

                                    <div className='mt-2 text-sm text-gray-600 dark:text-gray-300'>{headerSubtitle}</div>

                                    {isFirmEmployee ? (
                                        <div className='mt-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200 px-4 py-3 text-sm flex items-start gap-2'>
                                            <HiOutlineExclamationCircle className='text-lg mt-0.5' />
                                            <div>
                                                <div className='font-extrabold'>Read only</div>
                                                <div>Seat users cannot upgrade. Ask your firm admin (firm root) to upgrade seats/plan.</div>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3'>
                                <Button
                                    icon={<HiOutlineRefresh />}
                                    variant='plain'
                                    className='hover:bg-slate-100 dark:hover:bg-gray-800'
                                    onClick={loadAll as any}>
                                    Refresh
                                </Button>

                                <Button icon={<HiOutlineLink />} variant='solid' onClick={() => navigate('/connection')}>
                                    Connections
                                </Button>
                            </div>
                        </div>

                        <div className='relative mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3'>
                            {pill('Plan', cap(subscription?.plan) || '—', <HiOutlineBadgeCheck className='text-base' />)}
                            {pill('Valid Till', fmtDate(subscription?.endAt || null), <HiOutlineKey className='text-base' />)}
                            {pill(
                                'Remaining',
                                activeDaysLeft == null ? '—' : activeDaysLeft < 0 ? 'Expired' : `${activeDaysLeft} days`,
                                <HiOutlineShieldCheck className='text-base' />,
                            )}
                        </div>

                        <div className='relative mt-3 flex flex-wrap gap-2'>
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
                    </div>
                </div>

                {/* MAIN GRID */}
                <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
                    {/* Current subscription */}
                    <div className='lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6'>
                        <div className='flex items-start justify-between gap-3 mb-4'>
                            <div className='flex items-center gap-2'>
                                <HiOutlineCreditCard className='text-xl text-gray-600 dark:text-gray-300' />
                                <div>
                                    <div className='text-lg font-extrabold text-gray-900 dark:text-gray-100'>Current Subscription</div>
                                    <div className='text-sm text-gray-600 dark:text-gray-300'>Owner-based subscription (firm employees inherit firm root).</div>
                                </div>
                            </div>
                        </div>

                        {!subscription ? (
                            <div className='rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300'>
                                No subscription found.
                            </div>
                        ) : (
                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                <div className='rounded-2xl border border-gray-200 dark:border-gray-700 p-4'>
                                    <div className='text-xs font-semibold text-gray-500 dark:text-gray-400'>Plan</div>
                                    <div className='mt-1 text-sm font-extrabold text-gray-900 dark:text-gray-100'>{cap(subscription.plan) || '—'}</div>
                                    <div className='mt-2 text-sm text-gray-600 dark:text-gray-300'>
                                        Amount:{' '}
                                        <span className='font-extrabold text-gray-900 dark:text-gray-100'>
                                            {money(subscription.amount, subscription.currency)}
                                        </span>
                                    </div>
                                    <div className='mt-1 text-sm text-gray-600 dark:text-gray-300'>
                                        Status: <span className='font-semibold text-gray-900 dark:text-gray-100'>{cap(subscription.status) || '—'}</span>
                                    </div>
                                </div>

                                <div className='rounded-2xl border border-gray-200 dark:border-gray-700 p-4'>
                                    <div className='text-xs font-semibold text-gray-500 dark:text-gray-400'>Validity</div>
                                    <div className='mt-2 text-sm text-gray-600 dark:text-gray-300'>
                                        Start: <span className='font-semibold text-gray-900 dark:text-gray-100'>{fmtDate(subscription.startAt || null)}</span>
                                    </div>
                                    <div className='mt-1 text-sm text-gray-600 dark:text-gray-300'>
                                        End: <span className='font-semibold text-gray-900 dark:text-gray-100'>{fmtDate(subscription.endAt || null)}</span>
                                    </div>
                                    <div className='mt-1 text-sm text-gray-600 dark:text-gray-300'>
                                        Remaining:{' '}
                                        <span
                                            className={clsx(
                                                'font-extrabold',
                                                (activeDaysLeft ?? 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100',
                                            )}>
                                            {activeDaysLeft == null ? '—' : activeDaysLeft < 0 ? 'Expired' : `${activeDaysLeft} days`}
                                        </span>
                                    </div>
                                </div>

                                <div className='rounded-2xl border border-gray-200 dark:border-gray-700 p-4'>
                                    <div className='text-xs font-semibold text-gray-500 dark:text-gray-400'>Capacity</div>
                                    <div className='mt-2 text-sm text-gray-600 dark:text-gray-300'>
                                        Seats: <span className='font-extrabold text-gray-900 dark:text-gray-100'>{String(subscription.seats ?? '—')}</span>
                                    </div>
                                    <div className='mt-1 text-sm text-gray-600 dark:text-gray-300'>
                                        Firm Limit:{' '}
                                        <span className='font-extrabold text-gray-900 dark:text-gray-100'>{String(subscription.firmLimit ?? '—')}</span>
                                    </div>
                                </div>

                                <div className='rounded-2xl border border-gray-200 dark:border-gray-700 p-4'>
                                    <div className='text-xs font-semibold text-gray-500 dark:text-gray-400'>Owner</div>
                                    <div className='mt-2 text-sm text-gray-600 dark:text-gray-300'>
                                        Owner ID:{' '}
                                        <span className='font-mono text-xs text-gray-900 dark:text-gray-100 break-all'>
                                            {String(statusRes?.subscriptionOwnerId || subscription.userId || '—')}
                                        </span>
                                    </div>
                                    <div className='mt-2 flex flex-wrap gap-2'>
                                        <Button
                                            size='sm'
                                            variant='plain'
                                            className='hover:bg-slate-100 dark:hover:bg-gray-800'
                                            icon={<HiOutlineClipboardCopy />}
                                            onClick={() => copyText('Subscription ID', subscription._id)}>
                                            Copy Subscription ID
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6'>
                        <div className='flex items-start justify-between gap-3'>
                            <div>
                                <div className='text-lg font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2'>
                                    <HiOutlineShieldCheck className='text-xl text-gray-600 dark:text-gray-300' />
                                    Actions
                                </div>
                                <div className='mt-1 text-sm text-gray-600 dark:text-gray-300'>
                                    {isVendor
                                        ? 'Upgrade subscription and cover uncovered active links.'
                                        : isFirmRoot
                                          ? 'Firm admin can upgrade plan or buy more seats.'
                                          : isFirmEmployee
                                            ? 'Only firm admin can upgrade.'
                                            : '—'}
                                </div>
                            </div>
                        </div>

                        <div className='mt-4 space-y-4'>
                            {/* ✅ Vendor: upgrade to yearly */}
                            {isVendor ? (
                                <div className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/40 p-4'>
                                    <div className='text-sm font-extrabold text-gray-900 dark:text-gray-100'>Vendor Subscription</div>
                                    <div className='mt-1 text-sm text-gray-600 dark:text-gray-300'>
                                        {canVendorUpgradeToYearly ? 'You can upgrade to yearly.' : 'You are already on yearly (or non-monthly).'}
                                    </div>

                                    <div className='mt-3 flex items-center gap-2'>
                                        <Button
                                            size='sm'
                                            variant='solid'
                                            className='flex-1'
                                            disabled={!canPurchase || busy || !canVendorUpgradeToYearly}
                                            loading={busy as any}
                                            onClick={() => buyOrUpgradeSubscription('yearly')}>
                                            Upgrade to Yearly
                                        </Button>

                                        <Button
                                            size='sm'
                                            variant='twoTone'
                                            className='px-3 hover:bg-slate-100 dark:hover:bg-gray-800'
                                            disabled={busy as any}
                                            onClick={() => buyOrUpgradeSubscription('monthly')}>
                                            Buy Monthly
                                        </Button>
                                    </div>
                                </div>
                            ) : null}

                            {/* ✅ Vendor: cover uncovered active links (PAYMENT) */}
                            {isVendor ? (
                                <div className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/40 p-4'>
                                    <div className='flex items-start justify-between gap-2'>
                                        <div>
                                            <div className='text-sm font-extrabold text-gray-900 dark:text-gray-100'>Connections Coverage</div>
                                            <div className='mt-1 text-sm text-gray-600 dark:text-gray-300'>
                                                Pay only when you need to cover more active links than your firm limit.
                                            </div>
                                        </div>

                                        <Button
                                            size='sm'
                                            variant='plain'
                                            icon={<HiOutlineRefresh />}
                                            className='hover:bg-slate-100 dark:hover:bg-gray-800'
                                            loading={vendorLinksLoading as any}
                                            onClick={() => loadVendorActiveLinksIfNeeded('vendor')}>
                                            Refresh
                                        </Button>
                                    </div>

                                    {/* stats */}
                                    <div className='mt-3 grid grid-cols-3 gap-2'>
                                        <div className='rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3'>
                                            <div className='text-[11px] font-semibold text-gray-500 dark:text-gray-400'>Active</div>
                                            <div className='text-sm font-extrabold text-gray-900 dark:text-gray-100'>{activeLinksCount}</div>
                                        </div>

                                        <div className='rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3'>
                                            <div className='text-[11px] font-semibold text-gray-500 dark:text-gray-400'>Firm Limit</div>
                                            <div className='text-sm font-extrabold text-gray-900 dark:text-gray-100'>{firmLimit}</div>
                                        </div>

                                        <div
                                            className={clsx(
                                                'rounded-xl border bg-white dark:bg-gray-900 p-3',
                                                uncoveredCount > 0 ? 'border-amber-200 dark:border-amber-900/40' : 'border-gray-200 dark:border-gray-700',
                                            )}>
                                            <div className='text-[11px] font-semibold text-gray-500 dark:text-gray-400'>Uncovered</div>
                                            <div
                                                className={clsx(
                                                    'text-sm font-extrabold',
                                                    uncoveredCount > 0 ? 'text-amber-700 dark:text-amber-200' : 'text-gray-900 dark:text-gray-100',
                                                )}>
                                                {uncoveredCount}
                                            </div>
                                        </div>
                                    </div>

                                    {/* alert */}
                                    {requiredExtraToCover > 0 ? (
                                        <div className='mt-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200 px-3 py-2.5 text-sm flex items-start gap-2'>
                                            <HiOutlineExclamationCircle className='text-lg mt-0.5' />
                                            <div>
                                                <div className='font-extrabold'>Upgrade required</div>
                                                <div className='mt-0.5'>
                                                    You have <b>{activeLinksCount}</b> active link(s) but firm limit is <b>{firmLimit}</b>. Buy at least{' '}
                                                    <b>{requiredExtraToCover}</b> connection(s) to cover them.
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}

                                    {/* select */}
                                    <div className='mt-3'>
                                        <label className='text-sm font-semibold text-gray-700 dark:text-gray-200'>Select an uncovered link</label>

                                        <div className='mt-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5'>
                                            <select
                                                value={selectedUncoveredLinkId}
                                                onChange={(e) => setSelectedUncoveredLinkId(e.target.value)}
                                                className='w-full bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none'>
                                                <option value=''>Select...</option>
                                                {(uncoveredActiveLinks.length ? uncoveredActiveLinks : vendorActiveLinks).map((x: any) => {
                                                    const firmName = x?.firm?.name || x?.firmId?.name || 'Firm'
                                                    const covered = x?.endAt && isFuture(x.endAt)
                                                    return (
                                                        <option key={String(x?._id)} value={String(x?._id)}>
                                                            {firmName} {covered ? '' : '— NOT covered'}
                                                        </option>
                                                    )
                                                })}
                                            </select>
                                        </div>

                                        <div className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                                            Backend requires a linkId. It will calculate required payment based on all active links.
                                        </div>
                                    </div>

                                    {/* actions row (match screenshot alignment) */}
                                    <div className='mt-3 space-y-2'>
                                        {/* Row 1 */}
                                        <Button
                                            size='sm'
                                            variant='solid'
                                            className='w-full'
                                            disabled={!canPurchase || busy || !selectedUncoveredLinkId}
                                            loading={busy as any}
                                            onClick={() => vendorBuyConnections({ useCustom: false })}>
                                            Cover Uncovered
                                        </Button>

                                        {/* Row 2 */}
                                        <div className='flex items-center gap-2'>
                                            <input
                                                type='number'
                                                min={0}
                                                value={customAddConnections}
                                                onChange={(e) => setCustomAddConnections(Math.max(0, Math.trunc(Number(e.target.value || 0))))}
                                                className='w-24 rounded-xl border px-3 py-2.5 text-center bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-gray-700'
                                                placeholder='0'
                                            />

                                            <Button
                                                size='sm'
                                                variant='twoTone'
                                                className='flex-1 hover:bg-slate-100 dark:hover:bg-gray-800'
                                                disabled={!canPurchase || busy || !selectedUncoveredLinkId}
                                                loading={busy as any}
                                                onClick={() => vendorBuyConnections({ useCustom: true })}>
                                                Buy Custom
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {/* Firm root: upgrade/renew subscription */}
                            {isFirmRoot || isFirmEmployee ? (
                                <div className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/40 p-4'>
                                    <div className='text-sm font-extrabold text-gray-900 dark:text-gray-100'>Upgrade / Renew Plan</div>
                                    <div className='mt-1 text-sm text-gray-600 dark:text-gray-300'>
                                        Firm subscription can be upgraded only by firm root. (This creates a new subscription order)
                                    </div>

                                    <div className='mt-3 space-y-3'>
                                        <div>
                                            <label className='text-sm font-semibold text-gray-700 dark:text-gray-200'>Plan</label>
                                            <select
                                                value={upgradePlanId}
                                                onChange={(e) => setUpgradePlanId(e.target.value)}
                                                className='mt-1 w-full rounded-xl border px-3 py-2.5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-gray-700'>
                                                {plans.map((p) => (
                                                    <option key={p.plan} value={p.plan}>
                                                        {cap(p.plan)} • {money(p.amount, p.currency)} • inc seats {p.includedSeats ?? '—'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className='text-sm font-semibold text-gray-700 dark:text-gray-200'>Seats (total)</label>
                                            <input
                                                type='number'
                                                min={1}
                                                value={upgradeSeats}
                                                onChange={(e) => setUpgradeSeats(Math.max(1, Math.trunc(Number(e.target.value || 1))))}
                                                disabled={!isFirmRoot}
                                                className={clsx(
                                                    'mt-1 w-full rounded-xl border px-3 py-2.5 focus:outline-none focus:ring-2',
                                                    'border-gray-200 dark:border-gray-700',
                                                    !isFirmRoot
                                                        ? 'bg-slate-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                                                        : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
                                                    'focus:ring-slate-300 dark:focus:ring-gray-700',
                                                )}
                                            />
                                            {selectedUpgradePlan ? (
                                                <div className='mt-1 text-xs text-gray-600 dark:text-gray-300'>
                                                    Base: {money(selectedUpgradePlan.amount, selectedUpgradePlan.currency)} • Addon/seat:{' '}
                                                    {money(selectedUpgradePlan.addonSeat ?? 0, selectedUpgradePlan.currency)} • Included seats:{' '}
                                                    {selectedUpgradePlan.includedSeats ?? 1}
                                                </div>
                                            ) : null}
                                        </div>

                                        <Button
                                            size='sm'
                                            variant='solid'
                                            disabled={!canPurchase || busy || !isFirmRoot}
                                            loading={busy as any}
                                            onClick={() => buyOrUpgradeSubscription(upgradePlanId, upgradeSeats)}>
                                            Upgrade / Renew
                                        </Button>

                                        {!isFirmRoot ? (
                                            <div className='text-xs text-amber-700 dark:text-amber-200'>Only firm root can upgrade subscription.</div>
                                        ) : null}
                                    </div>
                                </div>
                            ) : null}

                            {/* Firm root: add seats */}
                            {isFirmRoot || isFirmEmployee ? (
                                <div className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/40 p-4'>
                                    <div className='text-sm font-extrabold text-gray-900 dark:text-gray-100'>Add Seats (Prorated)</div>
                                    <div className='mt-1 text-sm text-gray-600 dark:text-gray-300'>
                                        Adds seats to current active subscription (prorated until end date).
                                    </div>

                                    <div className='mt-3 flex items-center gap-2'>
                                        <input
                                            type='number'
                                            min={1}
                                            value={addSeats}
                                            onChange={(e) => setAddSeats(Math.max(1, Math.trunc(Number(e.target.value || 1))))}
                                            disabled={!isFirmRoot}
                                            className={clsx(
                                                'w-28 rounded-xl border px-3 py-2.5 focus:outline-none focus:ring-2',
                                                'border-gray-200 dark:border-gray-700',
                                                !isFirmRoot
                                                    ? 'bg-slate-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                                                    : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
                                                'focus:ring-slate-300 dark:focus:ring-gray-700',
                                            )}
                                        />
                                        <Button
                                            size='sm'
                                            variant='solid'
                                            className='flex-1'
                                            disabled={!canPurchase || busy || !isFirmRoot}
                                            loading={busy as any}
                                            onClick={firmAddSeats}>
                                            Buy Seats
                                        </Button>
                                    </div>

                                    {!isFirmRoot ? <div className='mt-2 text-xs text-amber-700 dark:text-amber-200'>Only firm root can buy seats.</div> : null}
                                </div>
                            ) : null}

                            {/* Read-only notice */}
                            {!canPurchase ? (
                                <div className='rounded-xl border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200 px-4 py-3 text-sm flex items-start gap-2'>
                                    <HiOutlineLockClosed className='text-lg mt-0.5' />
                                    <div>
                                        <div className='font-extrabold'>Purchases disabled</div>
                                        <div>Only firm root can upgrade. You can view subscription details only.</div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
