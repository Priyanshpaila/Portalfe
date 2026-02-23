// src/services/connections.api.ts
import ApiService from '@/services/ApiService'

export type ConnectionStatus =
    | 'pending'
    | 'active'
    | 'rejected'
    | 'cancelled'
    | 'expired'
    | 'blocked'
    | string

export type FirmLite = {
    _id?: string
    name?: string
    username?: string
    firmCode?: string
    pincode?: string
    address?: string
}

export type VendorLite = {
    vendorCode?: string
    name?: string
    username?: string
    phone?: string
    email?: string
}

export type LinkItem = {
    _id: string
    firmId?: any // populated doc may exist
    vendorCode?: string

    status?: ConnectionStatus
    requestedBy?: 'vendor' | 'firm'
    requestedByUserId?: string
    approvedByUserId?: string
    message?: string

    startAt?: string | null
    endAt?: string | null
    subscriptionId?: string | null

    createdAt?: string
    updatedAt?: string

    firm?: FirmLite | null
    vendor?: VendorLite | null
}

export type LinksResponse = { ok: boolean; items: LinkItem[] }
export type IncomingResponse = { ok: boolean; items: LinkItem[] }

export type FirmSearchItem = {
    _id: string
    name?: string
    username?: string
    firmCode?: string
    pincode?: string
    address?: string
}
export type VendorSearchItem = {
    vendorCode?: string
    name?: string
    username?: string
    phone?: string
    email?: string
}

export type SearchResponse<T> = { ok: boolean; items: T[] }

export const ConnectionsService = {
    getLinks(params?: { status?: string }) {
        const qs = new URLSearchParams()
        if (params?.status) qs.set('status', params.status)
        const url = qs.toString() ? `/connections/links?${qs.toString()}` : `/connections/links`
        return ApiService.fetchData<LinksResponse>({ method: 'get', url })
    },

    getIncoming() {
        return ApiService.fetchData<IncomingResponse>({ method: 'get', url: '/connections/requests/incoming' })
    },

    // vendor → firms
    searchFirms(q: string, limit = 25) {
        const qs = new URLSearchParams()
        qs.set('q', q)
        qs.set('limit', String(limit))
        return ApiService.fetchData<SearchResponse<FirmSearchItem>>({
            method: 'get',
            url: `/connections/firms/search?${qs.toString()}`,
        })
    },

    // firm → vendors
    searchVendors(q: string, limit = 25) {
        const qs = new URLSearchParams()
        qs.set('q', q)
        qs.set('limit', String(limit))
        return ApiService.fetchData<SearchResponse<VendorSearchItem>>({
            method: 'get',
            url: `/connections/vendors/search?${qs.toString()}`,
        })
    },

    // vendor → request
    requestLink(payload: { firmId: string; message?: string }) {
        return ApiService.fetchData({ method: 'post', url: '/connections/links/request', data: payload })
    },

    // firm → invite
    inviteVendor(payload: { vendorCode: string; message?: string }) {
        return ApiService.fetchData({ method: 'post', url: '/connections/links/invite', data: payload })
    },

    accept(linkId: string) {
        return ApiService.fetchData({ method: 'post', url: `/connections/links/${linkId}/accept` })
    },
    reject(linkId: string) {
        return ApiService.fetchData({ method: 'post', url: `/connections/links/${linkId}/reject` })
    },
    cancel(linkId: string) {
        return ApiService.fetchData({ method: 'post', url: `/connections/links/${linkId}/cancel` })
    },
    disconnect(linkId: string) {
        return ApiService.fetchData({ method: 'post', url: `/connections/links/${linkId}/disconnect` })
    },
}

export default ConnectionsService