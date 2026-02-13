import ApiService from '@/services/ApiService'

export type BillingPlan = {
    plan: 'monthly' | 'yearly'
    amount: number // paise
    currency: string
    days: number
}

export type BillingPlansResponse = {
    ok: boolean
    keyId: string
    plans: BillingPlan[]
}

export type BillingStatusResponse = {
    ok: boolean
    active: boolean
    serverTime: string
    subscription: any | null
}

export type CreateOrderResponse = {
    ok: boolean
    keyId: string
    order: {
        id: string
        amount: number
        currency: string
        receipt: string
    }
    subscriptionId: string
    plan: string
    days: number
}

export type VerifyResponse = {
    ok: boolean
    message: string
    active: boolean
    subscription: any
}

const BillingService = {
    getPlans() {
        return ApiService.fetchData<BillingPlansResponse>({
            method: 'get',
            url: '/billing/plans',
        })
    },

    getStatus() {
        return ApiService.fetchData<BillingStatusResponse>({
            method: 'get',
            url: '/billing/status',
        })
    },

    createOrder(plan: 'monthly' | 'yearly') {
        return ApiService.fetchData<CreateOrderResponse>({
            method: 'post',
            url: '/billing/order',
            data: { plan },
        })
    },

    verifyPayment(payload: { orderId: string; paymentId: string; signature: string }) {
        return ApiService.fetchData<VerifyResponse>({
            method: 'post',
            url: '/billing/verify',
            data: payload,
        })
    },
}

export default BillingService