import React, { useEffect, useMemo, useRef, useState } from 'react'
import BillingService from '@/services/BillingService'
import type { BillingPlan as BillingPlanBase } from '@/services/BillingService'
import loadRazorpay from '@/utils/loadRazorpay'
import { Button, Spinner } from '@/components/ui'
import Avatar from '@/components/ui/Avatar'
import { ConfirmDialog } from '@/components/shared'
import useAuth from '@/utils/hooks/useAuth'
import { useAppSelector } from '@/store'
import { HiOutlineLogout, HiOutlineUser } from 'react-icons/hi'
import {
    ShieldCheck,
    CreditCard,
    Sparkles,
    BadgeCheck,
    Lock,
    Users,
    Building2,
    Handshake,
    CheckCircle2,
    Info,
    ChevronDown,
    ChevronUp,
} from 'lucide-react'

type Props = { onSuccess?: () => void }

type BillingPlan = BillingPlanBase & {
    duration?: 'monthly' | 'yearly'
    includedSeats?: number
    includedFirms?: number
    addonSeat?: number
    addonFirm?: number
}

type Mode = 'vendor' | 'firm'

function formatINR(paise: number) {
    const rupees = Math.round(Number(paise || 0) / 100)
    return new Intl.NumberFormat('en-IN').format(rupees)
}

function makeClientRequestId() {
    const c: any = globalThis.crypto
    if (c?.randomUUID) return c.randomUUID()
    return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n))
}

function parseTier(planId: string) {
    const m = String(planId || '').match(/_tier_(\d+)/i)
    return m ? Number(m[1]) : null
}

function getDuration(p: BillingPlan): 'monthly' | 'yearly' {
    const key = String(p.duration || p.plan || '').toLowerCase()
    if (key.includes('year')) return 'yearly'
    if (Number(p.days) >= 300) return 'yearly'
    return 'monthly'
}

function getPeriodLabel(p: BillingPlan) {
    return getDuration(p) === 'yearly' ? 'year' : 'month'
}

function displayTitle(p: BillingPlan) {
    const id = String(p.plan).toLowerCase()
    const tier = parseTier(p.plan)
    if (id === 'monthly') return 'Monthly'
    if (id === 'yearly') return 'Yearly'
    if (tier) return `Tier ${tier}`
    return getDuration(p) === 'yearly' ? 'Yearly Plan' : 'Monthly Plan'
}

function displaySubtitle(p: BillingPlan) {
    const dur = getDuration(p)
    const tier = parseTier(p.plan)
    if (tier) return `${tier} seats • ${dur === 'yearly' ? 'annual' : 'monthly'}`
    return dur === 'yearly' ? 'Annual billing' : 'Monthly billing'
}

// ✅ dedupe by duration + amount + features
function normalizePlans(plans: BillingPlan[]) {
    const safe = (plans || [])
        .filter((p) => p && p.plan && Number(p.amount || 0) > 0 && Number(p.days || 0) > 0)
        .map((p) => ({ ...p, duration: p.duration || getDuration(p) }))

    const keyOf = (p: BillingPlan) =>
        [
            getDuration(p),
            String(p.currency || 'INR'),
            String(p.amount || 0),
            String(p.days || 0),
            String(p.includedSeats ?? ''),
            String(p.includedFirms ?? ''),
        ].join('|')

    const prefer = (a: BillingPlan, b: BillingPlan) => {
        const aId = String(a.plan).toLowerCase()
        const bId = String(b.plan).toLowerCase()
        if (aId === 'monthly' || aId === 'yearly') return a
        if (bId === 'monthly' || bId === 'yearly') return b
        const ta = parseTier(a.plan)
        const tb = parseTier(b.plan)
        if (ta !== null && tb !== null) return ta <= tb ? a : b
        if (ta !== null) return a
        if (tb !== null) return b
        return aId.length <= bId.length ? a : b
    }

    const map = new Map<string, BillingPlan>()
    for (const p of safe) {
        const k = keyOf(p)
        const ex = map.get(k)
        map.set(k, ex ? prefer(ex, p) : p)
    }

    const out = Array.from(map.values())
    out.sort((a, b) => {
        const da = getDuration(a)
        const db = getDuration(b)
        if (da !== db) return da === 'monthly' ? -1 : 1

        const aBase = ['monthly', 'yearly'].includes(String(a.plan).toLowerCase()) ? 0 : 1
        const bBase = ['monthly', 'yearly'].includes(String(b.plan).toLowerCase()) ? 0 : 1
        if (aBase !== bBase) return aBase - bBase

        const ta = parseTier(a.plan) ?? 999999
        const tb = parseTier(b.plan) ?? 999999
        if (ta !== tb) return ta - tb

        return Number(a.amount || 0) - Number(b.amount || 0)
    })

    return out
}

function estimateSeatsPrice(basePlan: BillingPlan, seats: number) {
    const includedSeats = Number(basePlan.includedSeats ?? 1)
    const addonSeat = Number(basePlan.addonSeat ?? 0)

    const extraSeats = Math.max(0, seats - includedSeats)
    const addons = extraSeats * addonSeat
    const final = Number(basePlan.amount || 0) + addons

    const perDay = basePlan.days ? final / Number(basePlan.days) : final
    return { includedSeats, addonSeat, extraSeats, addons, final, perDay }
}

function Pill({
    children,
    tone = 'neutral',
}: {
    children: React.ReactNode
    tone?: 'neutral' | 'primary' | 'success' | 'warning'
}) {
    const cls =
        tone === 'primary'
            ? 'border-indigo-200/70 bg-indigo-50 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-200'
            : tone === 'success'
              ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
              : tone === 'warning'
                ? 'border-amber-200/70 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200'
                : 'border-slate-200/70 bg-white/60 text-slate-700 dark:border-gray-800/60 dark:bg-gray-950/30 dark:text-gray-200'

    return <span className={`text-[11px] rounded-full border px-2 py-0.5 ${cls}`}>{children}</span>
}

function Stepper({
    label,
    icon,
    value,
    min,
    max,
    helper,
    onChange,
}: {
    label: string
    icon?: React.ReactNode
    value: number
    min: number
    max: number
    helper?: string
    onChange: (v: number) => void
}) {
    return (
        <div className="rounded-2xl border bg-white/60 dark:bg-gray-950/20 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                        {icon}
                        <span className="font-semibold">{label}</span>
                    </div>
                    {helper ? <div className="mt-1 text-[11px] opacity-70">{helper}</div> : null}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="h-9 w-9 rounded-xl border bg-white/70 dark:bg-gray-900/40 hover:bg-white disabled:opacity-50"
                        onClick={() => onChange(clamp(value - 1, min, max))}
                        disabled={value <= min}
                        aria-label="Decrease"
                    >
                        −
                    </button>

                    <input
                        className="h-9 w-16 rounded-xl border bg-white/70 dark:bg-gray-900/40 text-center text-sm font-semibold outline-none"
                        value={value}
                        onChange={(e) => {
                            const n = Number(e.target.value || 0)
                            if (!Number.isFinite(n)) return
                            onChange(clamp(Math.trunc(n), min, max))
                        }}
                        inputMode="numeric"
                    />

                    <button
                        type="button"
                        className="h-9 w-9 rounded-xl border bg-white/70 dark:bg-gray-900/40 hover:bg-white disabled:opacity-50"
                        onClick={() => onChange(clamp(value + 1, min, max))}
                        disabled={value >= max}
                        aria-label="Increase"
                    >
                        +
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function SubscribeView({ onSuccess }: Props) {
    const { signOut } = useAuth()
    const user = useAppSelector((state) => state?.auth?.user)

    // ✅ mode detection from logged-in user (no backend changes required)
    const mode: Mode = useMemo(() => {
        const v = (user as any)?.vendorCode
        return v ? 'vendor' : 'firm'
    }, [user])

    const [signOutPrompt, setSignOutPrompt] = useState(false)
    const [loading, setLoading] = useState(true)

    const [buyingPlan, setBuyingPlan] = useState<string | null>(null)
    const [plans, setPlans] = useState<BillingPlan[]>([])
    const [keyId, setKeyId] = useState('')
    const [error, setError] = useState('')

    const [durationTab, setDurationTab] = useState<'monthly' | 'yearly'>('monthly')

    // Firm custom builder
    const [customSeats, setCustomSeats] = useState(1)
    const [limits, setLimits] = useState({ maxSeats: 500, maxFirms: 500 })
    const [showCustom, setShowCustom] = useState(true)

    const inFlightRef = useRef(false)

    useEffect(() => {
        ;(async () => {
            try {
                setLoading(true)
                setError('')
                const res = await BillingService.getPlans()
                setPlans((res.data?.plans || []) as BillingPlan[])
                setKeyId(res.data?.keyId || '')

                const lim = (res.data as any)?.pricing?.limits
                if (lim?.maxSeats || lim?.maxFirms) {
                    setLimits({
                        maxSeats: Number(lim?.maxSeats || 500),
                        maxFirms: Number(lim?.maxFirms || 500),
                    })
                }
            } catch (e: any) {
                console.error(e)
                setError(e?.response?.data?.message || e?.message || 'Failed to load plans')
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    const normalized = useMemo(() => normalizePlans(plans), [plans])

    // Base plans
    const baseMonthly = useMemo(
        () => normalized.find((p) => String(p.plan).toLowerCase() === 'monthly') || null,
        [normalized],
    )
    const baseYearly = useMemo(
        () => normalized.find((p) => String(p.plan).toLowerCase() === 'yearly') || null,
        [normalized],
    )

    // Tier packs (firm only)
    const packsMonthly = useMemo(() => {
        return normalized
            .filter((p) => getDuration(p) === 'monthly' && String(p.plan).toLowerCase().includes('_tier_'))
            .filter((p) => (parseTier(p.plan) || 0) > 1) // hide tier_1
            .sort((a, b) => (parseTier(a.plan) || 0) - (parseTier(b.plan) || 0))
    }, [normalized])

    const packsYearly = useMemo(() => {
        return normalized
            .filter((p) => getDuration(p) === 'yearly' && String(p.plan).toLowerCase().includes('_tier_'))
            .filter((p) => (parseTier(p.plan) || 0) > 1)
            .sort((a, b) => (parseTier(a.plan) || 0) - (parseTier(b.plan) || 0))
    }, [normalized])

    // Vendor sees ONLY base monthly/yearly
    const vendorShownPlans = useMemo(() => {
        const arr: BillingPlan[] = []
        if (baseMonthly) arr.push(baseMonthly)
        if (baseYearly) arr.push(baseYearly)
        return arr
    }, [baseMonthly, baseYearly])

    // Firm shown packs for selected duration
    const firmPacks = useMemo(() => {
        return durationTab === 'monthly' ? packsMonthly : packsYearly
    }, [durationTab, packsMonthly, packsYearly])

    // Tabs available?
    const showTabs = useMemo(() => {
        if (mode === 'vendor') return Boolean(baseMonthly && baseYearly)
        return Boolean((packsMonthly.length || baseMonthly) && (packsYearly.length || baseYearly))
    }, [mode, baseMonthly, baseYearly, packsMonthly.length, packsYearly.length])

    // Savings label (optional)
    const savingsText = useMemo(() => {
        if (!baseMonthly || !baseYearly) return ''
        const m12 = (baseMonthly.amount || 0) * 12
        const diff = m12 - (baseYearly.amount || 0)
        if (diff <= 0) return ''
        const pct = Math.round((diff / m12) * 100)
        return `Save ${pct}%`
    }, [baseMonthly, baseYearly])

    // Firm custom estimate uses base plan for selected duration
    const baseForCustom = useMemo(() => {
        if (mode !== 'firm') return null
        return durationTab === 'monthly' ? baseMonthly : baseYearly
    }, [mode, durationTab, baseMonthly, baseYearly])

    useEffect(() => {
        if (!baseForCustom) return
        const defSeats = clamp(Number(baseForCustom.includedSeats ?? 1), 1, limits.maxSeats)
        setCustomSeats(defSeats)
    }, [baseForCustom?.plan, limits.maxSeats])

    const customEstimate = useMemo(() => {
        if (!baseForCustom) return null
        const seats = clamp(customSeats, 1, limits.maxSeats)
        const calc = estimateSeatsPrice(baseForCustom, seats)
        return { ...calc, seats, planId: String(baseForCustom.plan) }
    }, [baseForCustom, customSeats, limits.maxSeats])

    const endFlow = () => {
        inFlightRef.current = false
        setBuyingPlan(null)
    }

    const handleBuy = async (args: { planId: string; seats?: number }) => {
        const { planId, seats } = args
        if (inFlightRef.current) return

        inFlightRef.current = true
        setBuyingPlan(planId)
        setError('')

        const clientRequestId = makeClientRequestId()

        try {
            const ok = await loadRazorpay()
            if (!ok) {
                setError('Razorpay SDK failed to load. Please check internet or disable ad-block for checkout.')
                endFlow()
                return
            }

            // ✅ vendor: send only plan (no seats)
            // ✅ firm: send seats only when using custom builder
            const orderRes = await BillingService.createOrder({
                plan: planId,
                ...(mode === 'firm' && typeof seats === 'number' ? { seats } : {}),
                clientRequestId,
            })

            const { order, keyId: serverKeyId } = orderRes.data || {}
            if (!order?.id) {
                setError('Unable to create payment order. Please try again.')
                endFlow()
                return
            }

            const rpKey = serverKeyId || keyId
            if (!rpKey) {
                setError('Payment configuration missing. Please contact support.')
                endFlow()
                return
            }

            const options: any = {
                key: rpKey,
                amount: order.amount,
                currency: order.currency,
                name: 'PurchaseQ',
                description: `Subscription (${planId})`,
                order_id: order.id,
                retry: { enabled: true, max_count: 2 },
                notes: {
                    plan: planId,
                    mode,
                    seats: mode === 'firm' && seats ? String(seats) : '',
                    clientRequestId,
                },
                modal: {
                    escape: false,
                    backdropclose: false,
                    confirm_close: true,
                    animation: true,
                    ondismiss: () => endFlow(),
                },
                theme: { color: '#2563EB' },
                handler: async (rsp: any) => {
                    try {
                        const verifyRes = await BillingService.verifyPayment({
                            orderId: rsp.razorpay_order_id,
                            paymentId: rsp.razorpay_payment_id,
                            signature: rsp.razorpay_signature,
                        })
                        if (verifyRes?.data?.ok) onSuccess?.()
                        else setError('Payment captured but verification failed. Please contact support.')
                    } catch (e: any) {
                        setError(e?.response?.data?.message || e?.message || 'Verification failed. Please contact support.')
                    } finally {
                        endFlow()
                    }
                },
            }

            const RazorpayCtor = (window as any)?.Razorpay
            if (!RazorpayCtor) {
                setError('Checkout could not be initialized. Please refresh and try again.')
                endFlow()
                return
            }

            const rzp = new RazorpayCtor(options)
            rzp.on('payment.failed', (resp: any) => {
                console.error('payment.failed:', resp)
                setError(resp?.error?.description || 'Payment failed. Please try another method.')
                endFlow()
            })

            rzp.open()
        } catch (e: any) {
            console.error(e)
            setError(e?.response?.data?.message || e?.message || 'Failed to start payment')
            endFlow()
        }
    }

    if (loading) {
        return (
            <div className="min-h-[75vh] w-full flex items-center justify-center p-6">
                <div className="flex items-center gap-2 rounded-2xl border bg-white/70 dark:bg-gray-900/40 px-5 py-4 shadow-sm">
                    <Spinner />
                    <span className="text-sm">Loading subscription options...</span>
                </div>
            </div>
        )
    }

    const isAnyBuying = buyingPlan !== null

    const headerTitle = mode === 'vendor' ? 'Activate vendor access' : 'Activate your firm subscription'
    const headerSubtitle =
        mode === 'vendor'
            ? 'Start with base access. You will purchase connections only after you connect with firms.'
            : 'Firms pay only for seats. Vendor connections are billed on the vendor side.'

    return (
        <div className="relative min-h-screen w-full overflow-hidden">
            {/* Background */}
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-50 via-white to-white dark:from-gray-950 dark:via-gray-950 dark:to-gray-950" />
                <div className="absolute -top-28 left-1/2 h-[22rem] w-[42rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-300/35 via-fuchsia-300/20 to-sky-300/25 blur-3xl dark:from-indigo-600/18 dark:via-fuchsia-600/12 dark:to-sky-600/12" />
                <div className="absolute -bottom-28 left-1/2 h-[18rem] w-[38rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-300/18 via-teal-300/12 to-indigo-300/12 blur-3xl dark:from-emerald-600/10 dark:via-teal-600/10 dark:to-indigo-600/10" />
            </div>

            {/* Top bar */}
            <div className="mx-auto max-w-6xl px-4 md:px-8 pt-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="hidden md:flex items-center gap-2 rounded-full border bg-white/70 dark:bg-gray-900/40 px-4 py-2">
                        <ShieldCheck className="h-4 w-4" />
                        <span className="text-xs opacity-80">Secure payments via Razorpay</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            <div className="py-2 px-3 flex items-center gap-2 min-w-34 rounded-full border bg-white/70 dark:bg-gray-900/40">
                                <Avatar shape="circle" icon={<HiOutlineUser />} />
                                <div className="leading-tight">
                                    <div className="font-bold text-gray-900 dark:text-gray-100">{user?.name || 'User'}</div>
                                    <div className="text-xs opacity-80">{user?.username || ''}</div>
                                </div>
                            </div>

                            <Button
                                icon={<HiOutlineLogout />}
                                type="button"
                                variant="plain"
                                className="rounded-full hover:bg-slate-100 hover:shadow-md"
                                onClick={() => setSignOutPrompt(true)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={signOutPrompt}
                closable={false}
                type="danger"
                title="Sign Out"
                confirmText="Sign out"
                cancelText="Cancel"
                confirmButtonColor="red"
                onCancel={() => setSignOutPrompt(false)}
                onConfirm={signOut}
            >
                Are you sure you want to sign out? You will be redirected to the sign-in page.
            </ConfirmDialog>

            <div className="mx-auto max-w-6xl px-4 md:px-8 py-8">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-2 rounded-full border bg-white/70 dark:bg-gray-900/40 px-4 py-2 text-xs">
                        <Sparkles className="h-4 w-4" />
                        <span>Subscription required</span>
                        <span className="mx-1 opacity-50">•</span>
                        <Lock className="h-4 w-4" />
                        <span className="opacity-80">Access protected</span>
                        <span className="mx-1 opacity-50">•</span>
                        <Pill tone={mode === 'vendor' ? 'warning' : 'primary'}>
                            {mode === 'vendor' ? 'Vendor' : 'Firm'}
                        </Pill>
                    </div>

                    <h1 className="mt-4 text-2xl md:text-3xl font-bold tracking-tight">{headerTitle}</h1>
                    <p className="mt-2 text-sm opacity-80">{headerSubtitle}</p>

                    {showTabs ? (
                        <div className="mt-5 inline-flex rounded-full border bg-white/70 dark:bg-gray-900/40 p-1">
                            <button
                                type="button"
                                onClick={() => setDurationTab('monthly')}
                                className={`px-4 py-1.5 text-xs rounded-full transition ${
                                    durationTab === 'monthly' ? 'bg-white shadow-sm dark:bg-gray-950/60' : 'opacity-70 hover:opacity-100'
                                }`}
                            >
                                Monthly
                            </button>
                            <button
                                type="button"
                                onClick={() => setDurationTab('yearly')}
                                className={`px-4 py-1.5 text-xs rounded-full transition ${
                                    durationTab === 'yearly' ? 'bg-white shadow-sm dark:bg-gray-950/60' : 'opacity-70 hover:opacity-100'
                                }`}
                            >
                                Yearly {savingsText ? <span className="ml-2 opacity-80">({savingsText})</span> : null}
                            </button>
                        </div>
                    ) : null}
                </div>

                {error ? (
                    <div className="mt-6 max-w-2xl mx-auto rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
                        {error}
                    </div>
                ) : null}

                {/* CONTENT */}
                <div className="mt-7 max-w-5xl mx-auto">
                    {/* Vendor: only base plans */}
                    {mode === 'vendor' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {vendorShownPlans.map((p) => {
                                const planId = String(p.plan)
                                const isBuying = buyingPlan === planId
                                const perDay = Number(p.days) > 0 ? (p.amount || 0) / Number(p.days) : p.amount || 0

                                return (
                                    <div key={planId} className="relative overflow-hidden rounded-2xl border bg-white/78 dark:bg-gray-900/45 shadow-sm">
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/5 to-sky-500/10" />
                                        <div className="relative p-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <div className="text-lg font-semibold">{displayTitle(p)}</div>
                                                        {String(p.plan).toLowerCase() === 'yearly' && savingsText ? (
                                                            <Pill tone="success">{savingsText}</Pill>
                                                        ) : null}
                                                    </div>
                                                    <div className="mt-1 text-xs opacity-75">{displaySubtitle(p)}</div>
                                                </div>

                                                <div className="shrink-0 rounded-xl border bg-white/70 dark:bg-gray-950/30 px-3 py-2 text-right">
                                                    <div className="text-lg font-bold">₹{formatINR(p.amount || 0)}</div>
                                                    <div className="text-[11px] opacity-70">/ {getPeriodLabel(p)}</div>
                                                </div>
                                            </div>

                                            <div className="mt-4 grid grid-cols-1 gap-2">
                                                <div className="rounded-xl border bg-white/60 dark:bg-gray-950/20 px-3 py-2 text-[11px]">
                                                    <div className="font-semibold inline-flex items-center gap-2">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        Base access included
                                                    </div>
                                                    <div className="mt-1 opacity-75">Use the app fully as a vendor (bidding, quotations, workflows).</div>
                                                </div>

                                                <div className="rounded-xl border bg-white/60 dark:bg-gray-950/20 px-3 py-2 text-[11px]">
                                                    <div className="font-semibold inline-flex items-center gap-2">
                                                        <Handshake className="h-4 w-4" />
                                                        Connections billed later
                                                    </div>
                                                    <div className="mt-1 opacity-75">
                                                        You pay for connections only when you connect to firms (post-connection purchase).
                                                    </div>
                                                </div>

                                                <div className="rounded-xl border bg-white/60 dark:bg-gray-950/20 px-3 py-2 text-[11px] flex items-center justify-between">
                                                    <span className="opacity-75">Approx. / day</span>
                                                    <span className="font-semibold">₹{formatINR(perDay)} / day</span>
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <Button
                                                    type="button"
                                                    variant="solid"
                                                    className="w-full rounded-xl h-10 text-sm"
                                                    disabled={isAnyBuying}
                                                    onClick={() => handleBuy({ planId })}
                                                >
                                                    {isBuying ? (
                                                        <span className="inline-flex items-center gap-2">
                                                            <Spinner />
                                                            Processing...
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-2">
                                                            <CreditCard className="h-4 w-4" />
                                                            Proceed to checkout
                                                        </span>
                                                    )}
                                                </Button>
                                            </div>

                                            <div className="mt-3 text-[11px] opacity-70 inline-flex items-center gap-2">
                                                <ShieldCheck className="h-3.5 w-3.5" />
                                                Secure Razorpay checkout
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <>
                            {/* Firm: packs */}
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-left">
                                    <div className="text-lg font-semibold inline-flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        Seat bundles
                                    </div>
                                    <div className="text-xs opacity-75 mt-1">
                                        Firms pay only for seats. Vendor connections are not billed to firms.
                                    </div>
                                </div>

                                <Pill tone="success">Connections: not billed</Pill>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                {firmPacks.slice(0, 6).map((p) => {
                                    const planId = String(p.plan)
                                    const isBuying = buyingPlan === planId
                                    const tierSeats = Number(p.includedSeats ?? parseTier(planId) ?? 1)
                                    const perDay = Number(p.days) > 0 ? (p.amount || 0) / Number(p.days) : p.amount || 0

                                    const tier = parseTier(planId) || tierSeats
                                    const badge =
                                        tier === 5 ? 'Most popular' : tier === 10 ? 'Growing teams' : tier >= 25 ? 'Large teams' : 'Bundle'

                                    return (
                                        <div key={planId} className="relative overflow-hidden rounded-2xl border bg-white/78 dark:bg-gray-900/45 shadow-sm">
                                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/5 to-sky-500/10" />
                                            <div className="relative p-5">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <div className="text-base font-semibold">{displayTitle(p)}</div>
                                                            <Pill tone={tier === 5 ? 'primary' : tier >= 25 ? 'success' : 'neutral'}>{badge}</Pill>
                                                        </div>
                                                        <div className="mt-1 text-xs opacity-75">{displaySubtitle(p)}</div>
                                                    </div>

                                                    <div className="shrink-0 rounded-xl border bg-white/70 dark:bg-gray-950/30 px-3 py-2 text-right">
                                                        <div className="text-lg font-bold">₹{formatINR(p.amount || 0)}</div>
                                                        <div className="text-[11px] opacity-70">/ {getPeriodLabel(p)}</div>
                                                    </div>
                                                </div>

                                                <div className="mt-4 grid grid-cols-1 gap-2">
                                                    <div className="rounded-xl border bg-white/60 dark:bg-gray-950/20 px-3 py-2 text-[11px] flex items-center justify-between">
                                                        <span className="opacity-75 inline-flex items-center gap-2">
                                                            <Users className="h-4 w-4" /> Seats included
                                                        </span>
                                                        <span className="font-semibold">{tierSeats}</span>
                                                    </div>

                                                    <div className="rounded-xl border bg-white/60 dark:bg-gray-950/20 px-3 py-2 text-[11px] flex items-center justify-between">
                                                        <span className="opacity-75">Approx. / day</span>
                                                        <span className="font-semibold">₹{formatINR(perDay)} / day</span>
                                                    </div>
                                                </div>

                                                <div className="mt-4">
                                                    <Button
                                                        type="button"
                                                        variant="solid"
                                                        className="w-full rounded-xl h-10 text-sm"
                                                        disabled={isAnyBuying}
                                                        onClick={() => handleBuy({ planId })}
                                                    >
                                                        {isBuying ? (
                                                            <span className="inline-flex items-center gap-2">
                                                                <Spinner />
                                                                Processing...
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-2">
                                                                <CreditCard className="h-4 w-4" />
                                                                Choose bundle
                                                            </span>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Firm: custom seats */}
                            {baseForCustom && customEstimate ? (
                                <div className="mt-6 relative overflow-hidden rounded-2xl border bg-white/78 dark:bg-gray-900/45 shadow-sm">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-sky-500/10" />
                                    <div className="relative p-5">
                                        <button
                                            type="button"
                                            onClick={() => setShowCustom((s) => !s)}
                                            className="w-full flex items-center justify-between gap-3"
                                        >
                                            <div className="text-left">
                                                <div className="text-base font-semibold inline-flex items-center gap-2">
                                                    <Users className="h-5 w-5" />
                                                    Custom seats
                                                    <Pill tone="success">Seats only</Pill>
                                                </div>
                                                <div className="text-xs opacity-75 mt-1">
                                                    If bundles don’t fit, build exactly what your team needs.
                                                </div>
                                            </div>

                                            <div className="inline-flex items-center gap-2 text-xs opacity-80">
                                                {showCustom ? (
                                                    <>
                                                        Hide <ChevronUp className="h-4 w-4" />
                                                    </>
                                                ) : (
                                                    <>
                                                        Show <ChevronDown className="h-4 w-4" />
                                                    </>
                                                )}
                                            </div>
                                        </button>

                                        {showCustom ? (
                                            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                                                <div className="lg:col-span-2">
                                                    <Stepper
                                                        label="Seats"
                                                        icon={<Users className="h-4 w-4 opacity-80" />}
                                                        value={customEstimate.seats}
                                                        min={1}
                                                        max={limits.maxSeats}
                                                        helper={`Included: ${customEstimate.includedSeats} • Add-on per seat: ₹${formatINR(customEstimate.addonSeat)}`}
                                                        onChange={setCustomSeats}
                                                    />

                                                    <div className="mt-3 rounded-2xl border bg-white/60 dark:bg-gray-950/20 p-4 text-[11px]">
                                                        <div className="font-semibold inline-flex items-start gap-2">
                                                            <Info className="h-4 w-4 mt-0.5 opacity-80" />
                                                            Billing note
                                                        </div>
                                                        <div className="mt-1 opacity-75">
                                                            This purchase covers seats only. Vendor connections are billed separately on the vendor side after they connect.
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="rounded-2xl border bg-white/70 dark:bg-gray-950/30 px-4 py-4 text-right">
                                                    <div className="text-[11px] opacity-70">Estimated total</div>
                                                    <div className="text-2xl font-bold">₹{formatINR(customEstimate.final)}</div>
                                                    <div className="text-[11px] opacity-70">/ {getPeriodLabel(baseForCustom)}</div>
                                                    <div className="mt-2 text-[11px] opacity-80">
                                                        Approx. ₹{formatINR(customEstimate.perDay)} / day
                                                    </div>

                                                    <div className="mt-4">
                                                        <Button
                                                            type="button"
                                                            variant="solid"
                                                            className="w-full rounded-xl h-10 text-sm"
                                                            disabled={isAnyBuying}
                                                            onClick={() => handleBuy({ planId: customEstimate.planId, seats: customEstimate.seats })}
                                                        >
                                                            {buyingPlan === customEstimate.planId ? (
                                                                <span className="inline-flex items-center gap-2">
                                                                    <Spinner />
                                                                    Processing...
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-2">
                                                                    <CreditCard className="h-4 w-4" />
                                                                    Proceed to checkout
                                                                </span>
                                                            )}
                                                        </Button>
                                                    </div>

                                                    <div className="mt-3 text-[11px] opacity-70 inline-flex items-center justify-end gap-2">
                                                        <ShieldCheck className="h-3.5 w-3.5" />
                                                        Secure Razorpay checkout
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ) : null}
                        </>
                    )}

                    {/* Footer trust strip */}
                    <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-2xl border bg-white/70 dark:bg-gray-900/40 p-4 text-left">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <BadgeCheck className="h-4 w-4" />
                                Manual renewal
                            </div>
                            <p className="mt-1 text-xs opacity-80">No auto-pay. Renew when you want.</p>
                        </div>

                        <div className="rounded-2xl border bg-white/70 dark:bg-gray-900/40 p-4 text-left">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <ShieldCheck className="h-4 w-4" />
                                Secure payments
                            </div>
                            <p className="mt-1 text-xs opacity-80">Razorpay handles payment processing securely.</p>
                        </div>

                        <div className="rounded-2xl border bg-white/70 dark:bg-gray-900/40 p-4 text-left">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <CheckCircle2 className="h-4 w-4" />
                                Instant activation
                            </div>
                            <p className="mt-1 text-xs opacity-80">Access unlocks after payment verification.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}