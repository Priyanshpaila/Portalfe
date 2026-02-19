import ApiService from '@/services/ApiService'

export type BillingPlan = {
    plan: string
    duration?: 'monthly' | 'yearly'
    amount: number // paise
    currency: string
    days: number

    // ✅ optional pricing metadata (comes from backend getPlans())
    includedSeats?: number
    includedFirms?: number
    addonSeat?: number
    addonFirm?: number
}

export type BillingPlansResponse = {
    ok: boolean
    keyId: string
    plans: BillingPlan[]
    pricing?: {
        currency?: string
        addon?: any
        included?: any
        limits?: { maxSeats?: number; maxFirms?: number }
        tiers?: number[]
    }
}

export type BillingStatusResponse = {
    ok: boolean
    active: boolean
    serverTime: string
    subscriptionOwnerId?: string
    subscription: any | null
}

export type RazorpayOrder = {
    id: string
    amount: number
    currency: string
    receipt: string
}

export type CreateOrderPayload = {
    plan: string
    seats?: number
    firms?: number
    connections?: number
    clientRequestId?: string
}

export type CreateOrderResponse = {
    ok: boolean
    keyId: string
    order: RazorpayOrder
    subscriptionId?: string
    plan?: string
    days?: number
    seats?: number
    firms?: number
    breakdown?: {
        baseAmount?: number
        addonsAmount?: number
        finalAmount?: number
    }
    deduped?: boolean
}

export type VerifyPayload = { orderId: string; paymentId: string; signature: string }

export type VerifyResponse = {
    ok: boolean
    message: string
    active?: boolean
    subscription?: any
}

export type UpgradeSeatsOrderPayload = { addSeats: number; clientRequestId?: string }
export type UpgradeSeatsOrderResponse = {
    ok: boolean
    keyId: string
    order: RazorpayOrder
    upgrade?: { addSeats: number; targetSeats: number; remainingDays?: number }
    breakdown?: any
    deduped?: boolean
}

export type UpgradeConnectionsOrderPayload = {
    linkId?: string
    firmId?: string
    addConnections?: number
    clientRequestId?: string
}
export type UpgradeConnectionsOrderResponse = {
    ok: boolean
    keyId?: string
    order?: RazorpayOrder
    noPaymentRequired?: boolean
    message?: string
    upgrade?: any
    breakdown?: any
    linkId?: string
    deduped?: boolean
    stats?: any
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

    // ✅ subscription purchase (supports custom seats/firms)
    createOrder(payload: CreateOrderPayload) {
        return ApiService.fetchData<CreateOrderResponse>({
            method: 'post',
            url: '/billing/order',
            data: payload,
        })
    },

    verifyPayment(payload: VerifyPayload) {
        return ApiService.fetchData<VerifyResponse>({
            method: 'post',
            url: '/billing/verify',
            data: payload,
        })
    },

    // ✅ firm add seats
    firmAddSeatsOrder(payload: UpgradeSeatsOrderPayload) {
        return ApiService.fetchData<UpgradeSeatsOrderResponse>({
            method: 'post',
            url: '/billing/firm/add-seats/order',
            data: payload,
        })
    },

    firmAddSeatsVerify(payload: VerifyPayload) {
        return ApiService.fetchData<VerifyResponse>({
            method: 'post',
            url: '/billing/firm/add-seats/verify',
            data: payload,
        })
    },

    // ✅ vendor add connections
    vendorAddConnectionsOrder(payload: UpgradeConnectionsOrderPayload) {
        return ApiService.fetchData<UpgradeConnectionsOrderResponse>({
            method: 'post',
            url: '/billing/vendor/add-connections/order',
            data: payload,
        })
    },

    vendorAddConnectionsVerify(payload: VerifyPayload) {
        return ApiService.fetchData<VerifyResponse>({
            method: 'post',
            url: '/billing/vendor/add-connections/verify',
            data: payload,
        })
    },
}

export default BillingService