import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BillingService, { BillingPlan } from '@/services/BillingService'
import loadRazorpay from '@/utils/loadRazorpay'
import { Button, Spinner } from '@/components/ui'
import Avatar from '@/components/ui/Avatar'
import { ConfirmDialog } from '@/components/shared' // ✅ same as your dropdown usage (adjust if path differs)
import useAuth from '@/utils/hooks/useAuth'
import { useAppSelector } from '@/store'
import { HiOutlineLogout, HiOutlineUser } from 'react-icons/hi'
import {
    CheckCircle2,
    ShieldCheck,
    Clock,
    Zap,
    CreditCard,
    Sparkles,
    HelpCircle,
    ArrowLeft,
    BadgeCheck,
    Lock,
} from 'lucide-react'

type Props = {
    onSuccess?: () => void
}

function formatINR(paise: number) {
    const rupees = Math.round(paise / 100)
    return new Intl.NumberFormat('en-IN').format(rupees)
}

function getPeriodLabel(plan: BillingPlan) {
    const p = String(plan.plan || '').toLowerCase()
    if (p.includes('year')) return 'year'
    if (p.includes('month')) return 'month'
    if (plan.days >= 300) return 'year'
    if (plan.days >= 25 && plan.days <= 35) return 'month'
    return `${plan.days} days`
}

function getPlanMeta(p: BillingPlan) {
    const key = String(p.plan || '').toLowerCase()
    const isYearly = key.includes('year') || p.days >= 300

    return {
        isYearly,
        badge: isYearly ? 'Best Value' : 'Most Popular',
        tagline: isYearly ? 'Save more with annual billing' : 'Perfect to get started',
        accent: isYearly
            ? 'from-emerald-500/18 via-teal-500/12 to-sky-500/12'
            : 'from-indigo-500/18 via-fuchsia-500/10 to-sky-500/12',
        ring: isYearly ? 'ring-1 ring-emerald-500/25' : 'ring-1 ring-indigo-500/25',
        cta: isYearly ? 'Upgrade Yearly' : 'Start Monthly',
        pill: isYearly
            ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
            : 'border-indigo-200/70 bg-indigo-50 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-200',
    }
}

export default function SubscribeView({ onSuccess }: Props) {
    const navigate = useNavigate()
    const { signOut } = useAuth()

    const user = useAppSelector((state) => state?.auth?.user)
    const [signOutPrompt, setSignOutPrompt] = useState(false)

    const [loading, setLoading] = useState(true)
    const [buyingPlan, setBuyingPlan] = useState<null | 'monthly' | 'yearly'>(null)
    const [plans, setPlans] = useState<BillingPlan[]>([])
    const [keyId, setKeyId] = useState('')
    const [error, setError] = useState<string>('')

    const inFlightRef = useRef(false)

    useEffect(() => {
        ;(async () => {
            try {
                setLoading(true)
                setError('')
                const res = await BillingService.getPlans()
                setPlans(res.data.plans || [])
                setKeyId(res.data.keyId || '')
            } catch (e: any) {
                console.error(e)
                setError(e?.response?.data?.message || e?.message || 'Failed to load plans')
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    const sortedPlans = useMemo(() => [...plans].sort((a, b) => a.amount - b.amount), [plans])

    const monthly = useMemo(() => {
        const m = sortedPlans.find((p) => String(p.plan).toLowerCase().includes('month'))
        return m || null
    }, [sortedPlans])

    const yearly = useMemo(() => {
        const y = sortedPlans.find((p) => String(p.plan).toLowerCase().includes('year'))
        return y || null
    }, [sortedPlans])

    const savingsText = useMemo(() => {
        if (!monthly || !yearly) return ''
        const m12 = monthly.amount * 12
        const diff = m12 - yearly.amount
        if (diff <= 0) return ''
        const pct = Math.round((diff / m12) * 100)
        return `Save ${pct}% vs monthly`
    }, [monthly, yearly])

    const handleBuy = async (plan: 'monthly' | 'yearly') => {
        if (inFlightRef.current) return
        inFlightRef.current = true
        setBuyingPlan(plan)
        setError('')

        try {
            const ok = await loadRazorpay()
            if (!ok) {
                setError('Razorpay SDK failed to load. Check internet or adblock.')
                return
            }

            const orderRes = await BillingService.createOrder(plan)
            const { order, keyId: serverKeyId } = orderRes.data

            const options: any = {
                key: serverKeyId || keyId,
                amount: order.amount,
                currency: order.currency,
                name: 'PurchaseQ',
                description: `Subscription (${plan})`,
                order_id: order.id,

                retry: { enabled: true, max_count: 2 },

                notes: { plan, app: 'PurchaseQ', receipt: order.receipt || '' },

                modal: {
                    escape: false,
                    backdropclose: false,
                    confirm_close: true,
                    animation: true,
                    ondismiss: () => {},
                },

                theme: { color: '#2563EB' },

                handler: async (rsp: any) => {
                    try {
                        const verifyRes = await BillingService.verifyPayment({
                            orderId: rsp.razorpay_order_id,
                            paymentId: rsp.razorpay_payment_id,
                            signature: rsp.razorpay_signature,
                        })

                        if (verifyRes.data.ok) onSuccess?.()
                        else setError('Payment captured but verification failed.')
                    } catch (e: any) {
                        setError(
                            e?.response?.data?.message ||
                                e?.message ||
                                'Verification failed. Please contact support.',
                        )
                    }
                },
            }

            const rzp = new (window as any).Razorpay(options)
            rzp.on('payment.failed', (resp: any) => {
                console.error('payment.failed:', resp)
                setError(resp?.error?.description || 'Payment failed')
            })
            rzp.open()
        } catch (e: any) {
            console.error(e)
            setError(e?.response?.data?.message || e?.message || 'Failed to start payment')
        } finally {
            inFlightRef.current = false
            setBuyingPlan(null)
        }
    }

    if (loading) {
        return (
            <div className="min-h-[75vh] w-full flex items-center justify-center p-6">
                <div className="flex items-center gap-2 rounded-2xl border bg-white/70 dark:bg-gray-900/40 px-5 py-4 shadow-sm">
                    <Spinner />
                    <span className="text-sm">Loading subscription plans...</span>
                </div>
            </div>
        )
    }

    const isAnyBuying = buyingPlan !== null

    return (
        <div className="relative min-h-screen w-full overflow-hidden">
            {/* Background */}
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-50 via-white to-white dark:from-gray-950 dark:via-gray-950 dark:to-gray-950" />
                <div className="absolute -top-28 left-1/2 h-[26rem] w-[44rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-300/35 via-fuchsia-300/20 to-sky-300/25 blur-3xl dark:from-indigo-600/18 dark:via-fuchsia-600/12 dark:to-sky-600/12" />
                <div className="absolute -bottom-28 left-1/2 h-[22rem] w-[40rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-300/20 via-teal-300/15 to-indigo-300/15 blur-3xl dark:from-emerald-600/10 dark:via-teal-600/10 dark:to-indigo-600/10" />
            </div>

            {/* ✅ Top bar: Back + User + Logout */}
            <div className="mx-auto max-w-6xl px-4 md:px-8 pt-5">
                <div className="flex items-center justify-between">
                        <div className="hidden md:flex items-center gap-2 rounded-full border bg-white/70 dark:bg-gray-900/40 px-4 py-2">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-xs opacity-80">Secure payments via Razorpay</span>
                        </div>

                    <div className="flex items-center gap-2">


                        {/* ✅ SAME logout UI as header */}
                        <div className="flex items-center gap-1 group">
                            <div className="py-2 px-3 flex items-center gap-2 min-w-34 rounded-full border bg-white/70 dark:bg-gray-900/40">
                                <Avatar shape="circle" icon={<HiOutlineUser />} />
                                <div className="leading-tight">
                                    <div className="font-bold text-gray-900 dark:text-gray-100">
                                        {user?.name || 'User'}
                                    </div>
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

            {/* Confirm dialog */}
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
                Are you sure you want to sign out? You will be redirected to sign in page.
            </ConfirmDialog>

            {/* Centered content */}
            <div className="mx-auto max-w-6xl px-4 md:px-8 py-8 min-h-[calc(100vh-84px)] flex flex-col">
                <div className="flex-1 flex flex-col justify-center">
                    {/* Header */}
                    <div className="text-center max-w-2xl mx-auto">
                        <div className="inline-flex items-center gap-2 rounded-full border bg-white/70 dark:bg-gray-900/40 px-4 py-2 text-xs">
                            <Sparkles className="h-4 w-4" />
                            <span>Subscription required</span>
                            <span className="mx-1 opacity-50">•</span>
                            <Lock className="h-4 w-4" />
                            <span className="opacity-80">Access locked</span>
                        </div>

                        <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
                            Choose a plan to continue
                        </h1>
                        <p className="mt-3 text-sm md:text-base opacity-80">
                            Your access is currently inactive/expired. Purchase a plan to unlock the full app.
                            <br className="hidden md:block" />
                            No auto-pay — renew manually when you want.
                        </p>
                    </div>

                    {/* Error banner */}
                    {error ? (
                        <div className="mt-6 max-w-2xl mx-auto rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
                            {error}
                        </div>
                    ) : null}

                    {/* Pricing */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
                        {sortedPlans.map((p) => {
                            const meta = getPlanMeta(p)
                            const isThisBuying = buyingPlan === (p.plan as any)
                            const period = getPeriodLabel(p)
                            const perDay = p.days > 0 ? p.amount / p.days : p.amount
                            const showSavings = meta.isYearly && savingsText

                            return (
                                <div
                                    key={p.plan}
                                    className={`group relative overflow-hidden rounded-3xl border bg-white/75 dark:bg-gray-900/45 shadow-sm ${meta.ring}`}
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${meta.accent}`} />
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(800px_circle_at_50%_0%,rgba(255,255,255,0.55),transparent_55%)] dark:bg-[radial-gradient(800px_circle_at_50%_0%,rgba(255,255,255,0.12),transparent_55%)]" />

                                    <div className="relative p-6 md:p-7">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-xl font-semibold capitalize">{p.plan}</div>
                                                    <span
                                                        className={`text-[11px] rounded-full border px-2 py-0.5 ${meta.pill}`}
                                                    >
                                                        {meta.badge}
                                                    </span>
                                                    {showSavings ? (
                                                        <span className="text-[11px] rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                                                            {savingsText}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div className="mt-1 text-xs opacity-80">{meta.tagline}</div>
                                            </div>

                                            <div className="rounded-2xl border bg-white/70 dark:bg-gray-950/30 px-4 py-3 text-right">
                                                <div className="text-2xl font-bold">₹{formatINR(p.amount)}</div>
                                                <div className="text-[11px] opacity-80">/ {period}</div>
                                            </div>
                                        </div>

                                        <div className="mt-5 h-px w-full bg-black/5 dark:bg-white/10" />

                                        <div className="mt-5 space-y-3 text-sm">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 opacity-90" />
                                                <span>Full access to all modules</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 opacity-90" />
                                                <span>{p.days} days validity (manual renewal)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Zap className="h-4 w-4 opacity-90" />
                                                <span>Priority performance & updates</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4 opacity-90" />
                                                <span>Secure checkout via Razorpay</span>
                                            </div>
                                        </div>

                                        <div className="mt-5 flex items-center justify-between rounded-2xl border bg-white/70 dark:bg-gray-950/30 px-4 py-3 text-xs">
                                            <span className="opacity-80">Approx. per day</span>
                                            <span className="font-semibold">₹{formatINR(perDay)} / day</span>
                                        </div>

                                        <div className="mt-5">
                                            <Button
                                                type="button"
                                                variant="solid"
                                                className="w-full rounded-xl"
                                                disabled={isAnyBuying}
                                                onClick={() => handleBuy(p.plan as any)}
                                            >
                                                {isThisBuying ? (
                                                    <span className="inline-flex items-center gap-2">
                                                        <Spinner />
                                                        Processing...
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-2">
                                                        <CreditCard className="h-4 w-4" />
                                                        {meta.cta}
                                                    </span>
                                                )}
                                            </Button>

                                            <div className="mt-3 text-[11px] opacity-70 text-center">
                                                By continuing, you agree to the payment terms. No auto-pay.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Trust */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
                        <div className="rounded-2xl border bg-white/70 dark:bg-gray-900/40 p-4 text-left">
                            <div className="flex items-center gap-2 font-semibold">
                                <HelpCircle className="h-4 w-4" />
                                Manual renewal
                            </div>
                            <p className="mt-1 text-xs opacity-80">
                                No auto-pay for now. When your plan ends, you can renew anytime from here.
                            </p>
                        </div>

                        <div className="rounded-2xl border bg-white/70 dark:bg-gray-900/40 p-4 text-left">
                            <div className="flex items-center gap-2 font-semibold">
                                <BadgeCheck className="h-4 w-4" />
                                Secure payments
                            </div>
                            <p className="mt-1 text-xs opacity-80">
                                Payments are handled by Razorpay. Your card details never touch our servers.
                            </p>
                        </div>

                        <div className="rounded-2xl border bg-white/70 dark:bg-gray-900/40 p-4 text-left">
                            <div className="flex items-center gap-2 font-semibold">
                                <Clock className="h-4 w-4" />
                                Instant access
                            </div>
                            <p className="mt-1 text-xs opacity-80">
                                After successful payment, your subscription activates immediately.
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 text-center text-xs opacity-60">
                        Need help? Contact your admin/support.
                    </div>
                </div>
            </div>
        </div>
    )
}