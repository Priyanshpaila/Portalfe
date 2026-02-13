import React, { useEffect, useMemo, useRef, useState } from 'react'
import BillingService, { BillingPlan } from '@/services/BillingService'
import loadRazorpay from '@/utils/loadRazorpay'
import { Button, Spinner } from '@/components/ui'

type Props = { onSuccess?: () => void }

export default function SubscribeView({ onSuccess }: Props) {
    const [loading, setLoading] = useState(true)
    const [buyingPlan, setBuyingPlan] = useState<null | 'monthly' | 'yearly'>(null)
    const [plans, setPlans] = useState<BillingPlan[]>([])
    const [keyId, setKeyId] = useState('')

    // hard guard against double click / double open
    const inFlightRef = useRef(false)

    useEffect(() => {
        ;(async () => {
            try {
                setLoading(true)
                const res = await BillingService.getPlans()
                setPlans(res.data.plans || [])
                setKeyId(res.data.keyId || '')
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    const sortedPlans = useMemo(() => [...plans].sort((a, b) => a.amount - b.amount), [plans])

    const handleBuy = async (plan: 'monthly' | 'yearly') => {
        if (inFlightRef.current) return // ✅ prevent double click
        inFlightRef.current = true
        setBuyingPlan(plan)

        try {
            const ok = await loadRazorpay()
            if (!ok) {
                alert('Razorpay SDK failed to load. Check internet or adblock.')
                return
            }

            const orderRes = await BillingService.createOrder(plan)
            const { order, keyId: serverKeyId } = orderRes.data

            const options: any = {
                key: serverKeyId || keyId,
                amount: order.amount,
                currency: order.currency,
                name: 'Your App',
                description: `Subscription (${plan})`,
                order_id: order.id,

                handler: async (rsp: any) => {
                    const verifyRes = await BillingService.verifyPayment({
                        orderId: rsp.razorpay_order_id,
                        paymentId: rsp.razorpay_payment_id,
                        signature: rsp.razorpay_signature,
                    })

                    if (verifyRes.data.ok) onSuccess?.()
                    else alert('Payment captured but verification failed.')
                },

                modal: {
                    ondismiss: () => {
                        // user closed without paying
                    },
                },
            }

            const rzp = new (window as any).Razorpay(options)

            rzp.on('payment.failed', (resp: any) => {
                console.error('payment.failed:', resp)
                alert(resp?.error?.description || 'Payment failed')
            })

            rzp.open()
        } catch (e: any) {
            console.error(e)
            alert(e?.response?.data?.message || e?.message || 'Failed to start payment')
        } finally {
            inFlightRef.current = false
            setBuyingPlan(null)
        }
    }

    if (loading) {
        return (
            <div className="p-6 flex items-center gap-2">
                <Spinner />
                <span>Loading plans...</span>
            </div>
        )
    }

    return (
        <div className="p-6">
            <div className="mb-4">
                <h3 className="text-lg font-semibold">Subscription Required</h3>
                <p className="text-sm opacity-80">
                    Your subscription is inactive/expired. Please purchase to continue.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sortedPlans.map((p) => {
                    const isThisBuying = buyingPlan === p.plan
                    const isAnyBuying = buyingPlan !== null

                    return (
                        <div key={p.plan} className="border rounded-md p-4">
                            <div className="flex items-center justify-between">
                                <div className="font-semibold capitalize">{p.plan}</div>
                                <div className="text-sm opacity-80">
                                    ₹{(p.amount / 100).toFixed(0)} / {p.days} days
                                </div>
                            </div>

                            <div className="mt-3">
                                <Button
                                    type="button"
                                    variant="solid"
                                    disabled={isAnyBuying}
                                    onClick={() => handleBuy(p.plan)}
                                >
                                    {isThisBuying ? 'Processing...' : 'Buy Now'}
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}