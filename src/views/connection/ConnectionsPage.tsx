// src/pages/ConnectionsPage.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import {
    HiOutlineLink,
    HiOutlineRefresh,
    HiOutlineSearch,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineClock,
    HiOutlinePaperAirplane,
    HiOutlineBan,
    HiOutlineExternalLink,
    HiOutlineExclamationCircle,
} from 'react-icons/hi'

import { Button } from '@/components/ui'
import { UserApi } from '@/services/user.api'
import ConnectionsService, { type LinkItem } from '@/services/connections.api'

type ViewerType = 'vendor' | 'firm_root' | 'firm_employee' | 'unknown'
type TabKey = 'links' | 'requests' | 'search'

type FirmListItem = {
    _id: string
    name?: string
    username?: string
    firmCode?: string
    pincode?: string
    address?: string
    email?: string
    company?: any
}

type VendorListItem = {
    vendorCode?: string
    name?: string
    username?: string
    phone?: string
    email?: string
}

function clsx(...arr: Array<string | false | undefined | null>) {
    return arr.filter(Boolean).join(' ')
}

function unwrap(res: any) {
    return res?.data ?? res
}

function cap(s?: string | null) {
    const v = String(s || '').trim()
    if (!v) return ''
    return v.charAt(0).toUpperCase() + v.slice(1)
}

function fmtDateTime(iso?: string | null) {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function isFuture(iso?: string | null) {
    if (!iso) return false
    const t = new Date(iso).getTime()
    if (!Number.isFinite(t)) return false
    return t > Date.now()
}

function statusPill(status?: string) {
    const s = String(status || '').toLowerCase()
    if (s === 'active') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
    if (s === 'pending') return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
    if (s === 'rejected' || s === 'cancelled') return 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200'
    if (s === 'expired') return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
    return 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-200'
}

function coveragePill(endAt?: string | null) {
    if (endAt && isFuture(endAt)) return 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200'
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
}

function norm(s: any) {
    return String(s || '')
        .trim()
        .toLowerCase()
}

export default function ConnectionsPage() {
    const navigate = useNavigate()

    const [loadingProfile, setLoadingProfile] = useState(true)
    const [viewerType, setViewerType] = useState<ViewerType>('unknown')
    const [vendorCode, setVendorCode] = useState<string>('')

    // subscription from profile (used only for messaging/hints)
    const [subscription, setSubscription] = useState<any>(null)

    const [tab, setTab] = useState<TabKey>('links')

    // links
    const [linksLoading, setLinksLoading] = useState(false)
    const [statusFilter, setStatusFilter] = useState<string>('') // '' => all
    const [links, setLinks] = useState<LinkItem[]>([])

    // ✅ keep unfiltered links for search exclusion + correct stats
    const [linksAll, setLinksAll] = useState<LinkItem[]>([])

    // requests
    const [incomingLoading, setIncomingLoading] = useState(false)
    const [incoming, setIncoming] = useState<LinkItem[]>([])
    const [pendingAll, setPendingAll] = useState<LinkItem[]>([])

    // search / discover
    const [searchQ, setSearchQ] = useState('')
    const [searchLoading, setSearchLoading] = useState(false)
    const [discoverLoaded, setDiscoverLoaded] = useState(false)

    const [allFirms, setAllFirms] = useState<FirmListItem[]>([])
    const [allVendors, setAllVendors] = useState<VendorListItem[]>([])

    // (optional) debounce for typing, but we only filter locally now
    const searchTimer = useRef<any>(null)

    const isVendor = viewerType === 'vendor'
    const isFirm = viewerType === 'firm_root' || viewerType === 'firm_employee'

    const tabBtn = (active: boolean) =>
        clsx(
            'group inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition',
            active
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-gray-900 dark:border-white'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-800',
        )

    async function loadProfile() {
        setLoadingProfile(true)
        try {
            const res = await UserApi.getProfile()
            const raw = unwrap(res)
            const payload = raw?.data ?? raw
            const type = String(payload?.type || '').trim() as ViewerType

            setViewerType((type as any) || 'unknown')
            setSubscription(payload?.subscription ?? null)

            const me = payload?.profile || null
            setVendorCode(String(me?.vendorCode || '').trim())
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Failed to load profile')
        } finally {
            setLoadingProfile(false)
        }
    }

    // ✅ always load all links once, then filter locally for UI
    async function loadLinks() {
        setLinksLoading(true)
        try {
            const res = await ConnectionsService.getLinks({ status: undefined })
            const raw = unwrap(res)
            const allItems: LinkItem[] = Array.isArray(raw?.items) ? raw.items : []

            setLinksAll(allItems)

            if (statusFilter) {
                const sf = String(statusFilter).toLowerCase()
                setLinks(allItems.filter((x: any) => String(x?.status || '').toLowerCase() === sf))
            } else {
                setLinks(allItems)
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Failed to load links')
        } finally {
            setLinksLoading(false)
        }
    }

    async function loadIncoming() {
        setIncomingLoading(true)
        try {
            const res = await ConnectionsService.getIncoming()
            const raw = unwrap(res)
            setIncoming(Array.isArray(raw?.items) ? raw.items : [])
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Failed to load incoming requests')
        } finally {
            setIncomingLoading(false)
        }
    }

    async function loadPendingAll() {
        try {
            const res = await ConnectionsService.getLinks({ status: 'pending' })
            const raw = unwrap(res)
            setPendingAll(Array.isArray(raw?.items) ? raw.items : [])
        } catch {
            setPendingAll([])
        }
    }

    async function refreshAll() {
        await Promise.all([loadLinks(), loadIncoming(), loadPendingAll(), loadProfile()])
    }

    useEffect(() => {
        loadProfile().then(() => {
            loadLinks()
            loadIncoming()
            loadPendingAll()
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ✅ Discover list (shows all vendors/firms by default)
    async function loadDiscover() {
        if (!isVendor && !isFirm) return

        setSearchLoading(true)
        try {
            const res = await UserApi.getDirectory({ discover: true })
            const payload: any = unwrap(res) // ✅ payload is { ok, viewerType, data }

            // ✅ directory always returns { data: [] }
            const list = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []

            if (isFirm) {
                const vendors: VendorListItem[] = list
                    .filter((x: any) => x?.type === 'vendor' && x?.vendor)
                    .map((x: any) => {
                        const v = x.vendor || {}
                        return {
                            vendorCode: v.vendorCode || '',
                            name: v.name || '',
                            username: v.username || '',
                            phone: v.phone || '',
                            email: v.email || '',
                        }
                    })

                vendors.sort((a, b) => String(a.vendorCode || '').localeCompare(String(b.vendorCode || '')))
                setAllVendors(vendors)
                setAllFirms([])
            } else if (isVendor) {
                const firms: FirmListItem[] = list
                    .filter((x: any) => x?.type === 'firm' && x?.firm)
                    .map((x: any) => {
                        const f = x.firm || {}
                        return {
                            _id: String(f._id || ''),
                            name: f.name || '',
                            username: f.username || '',
                            firmCode: f.firmCode || '',
                            pincode: f.pincode || '',
                            address: f.address || '',
                            email: f.email || '',
                            company: f.company || null,
                        }
                    })
                    .filter((f: any) => Boolean(f._id))

                firms.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
                setAllFirms(firms)
                setAllVendors([])
            }

            setDiscoverLoaded(true)
        } catch (e: any) {
            setAllFirms([])
            setAllVendors([])
            setDiscoverLoaded(true)
            toast.error(e?.response?.data?.message || e?.message || 'Failed to load directory')
        } finally {
            setSearchLoading(false)
        }
    }

    // Load discover list when user opens Search tab (first time)
    useEffect(() => {
        if (tab !== 'search') return
        if (discoverLoaded) return
        if (viewerType === 'unknown') return
        loadDiscover()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, discoverLoaded, viewerType])

    // ----- actions -----
    async function accept(linkId: string) {
        try {
            await ConnectionsService.accept(linkId)
            toast.success('Accepted')
            await Promise.all([loadLinks(), loadIncoming(), loadPendingAll(), loadProfile()])
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Accept failed')
        }
    }

    async function reject(linkId: string) {
        try {
            await ConnectionsService.reject(linkId)
            toast.success('Rejected')
            await Promise.all([loadLinks(), loadIncoming(), loadPendingAll()])
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Reject failed')
        }
    }

    async function cancel(linkId: string) {
        try {
            await ConnectionsService.cancel(linkId)
            toast.success('Cancelled')
            await Promise.all([loadLinks(), loadIncoming(), loadPendingAll()])
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Cancel failed')
        }
    }

    async function disconnect(linkId: string) {
        try {
            await ConnectionsService.disconnect(linkId)
            toast.success('Disconnected')
            await Promise.all([loadLinks(), loadIncoming(), loadPendingAll()])
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Disconnect failed')
        }
    }

    async function requestFirm(firmId: string, message?: string) {
        try {
            await ConnectionsService.requestLink({ firmId, message })
            toast.success('Request sent')
            await Promise.all([loadLinks(), loadIncoming(), loadPendingAll()])
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Request failed')
        }
    }

    async function inviteVendor(code: string, message?: string) {
        try {
            await ConnectionsService.inviteVendor({ vendorCode: code, message })
            toast.success('Invite sent')
            await Promise.all([loadLinks(), loadIncoming(), loadPendingAll()])
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Invite failed')
        }
    }

    // ----- derived lists -----
    const outgoingPending = useMemo(() => {
        if (!Array.isArray(pendingAll)) return []
        if (isVendor) return pendingAll.filter((x) => String(x?.requestedBy).toLowerCase() === 'vendor')
        if (isFirm) return pendingAll.filter((x) => String(x?.requestedBy).toLowerCase() === 'firm')
        return []
    }, [pendingAll, isVendor, isFirm])

    // ✅ IMPORTANT: stats should be based on all links, not filtered UI list
    const activeLinks = useMemo(() => {
        return (linksAll || []).filter((x: any) => String(x?.status || '').toLowerCase() === 'active')
    }, [linksAll])

    const uncoveredActive = useMemo(() => {
        return activeLinks.filter((x: any) => !(x?.endAt && isFuture(x.endAt)))
    }, [activeLinks])

    // ✅ build "already connected" sets (pending + active) to remove from search list
    const connectedFirmIds = useMemo(() => {
        const s = new Set<string>()
        ;(linksAll || []).forEach((x: any) => {
            const st = String(x?.status || '').toLowerCase()
            if (st !== 'active' && st !== 'pending') return
            const id = String(x?.firm?._id || x?.firmId?._id || x?.firmId || '').trim()
            if (id) s.add(id)
        })
        return s
    }, [linksAll])

    const connectedVendorCodes = useMemo(() => {
        const s = new Set<string>()
        ;(linksAll || []).forEach((x: any) => {
            const st = String(x?.status || '').toLowerCase()
            if (st !== 'active' && st !== 'pending') return
            const code = String(x?.vendor?.vendorCode || x?.vendorCode || '').trim()
            if (code) s.add(code)
        })
        return s
    }, [linksAll])

    // ✅ local filtering for Search tab + remove connected/pending ones
    const filteredVendors = useMemo(() => {
        if (!isFirm) return []
        const q = norm(searchQ)

        const base = q
            ? allVendors.filter((v) => {
                  return (
                      norm(v.vendorCode).includes(q) ||
                      norm(v.name).includes(q) ||
                      norm(v.username).includes(q) ||
                      norm(v.email).includes(q) ||
                      norm(v.phone).includes(q)
                  )
              })
            : allVendors

        // remove pending/active
        return base.filter((v) => {
            const code = String(v.vendorCode || '').trim()
            if (!code) return false
            return !connectedVendorCodes.has(code)
        })
    }, [isFirm, searchQ, allVendors, connectedVendorCodes])

    const filteredFirms = useMemo(() => {
        if (!isVendor) return []
        const q = norm(searchQ)

        const base = q
            ? allFirms.filter((f) => {
                  return (
                      norm(f.name).includes(q) ||
                      norm(f.username).includes(q) ||
                      norm(f.firmCode).includes(q) ||
                      norm(f.pincode).includes(q) ||
                      norm(f.address).includes(q) ||
                      norm(f.email).includes(q)
                  )
              })
            : allFirms

        // remove pending/active
        return base.filter((f) => {
            const id = String(f._id || '').trim()
            if (!id) return false
            return !connectedFirmIds.has(id)
        })
    }, [isVendor, searchQ, allFirms, connectedFirmIds])

    // mild debounce just for state smoothness (optional)
    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current)
        searchTimer.current = setTimeout(() => {
            // local filter only => nothing to do
        }, 150)
        return () => {
            if (searchTimer.current) clearTimeout(searchTimer.current)
        }
    }, [searchQ])

    function LinkCard({ item }: { item: LinkItem }) {
        const s = String(item?.status || '').toLowerCase()
        const requestedBy = String(item?.requestedBy || '').toLowerCase()

        const counterpartTitle = isVendor ? item?.firm?.name || (item as any)?.firmId?.name || 'Firm' : item?.vendor?.name || item?.vendorCode || 'Vendor'

        const counterpartSub = isVendor
            ? [item?.firm?.username || (item as any)?.firmId?.username, item?.firm?.firmCode || (item as any)?.firmId?.firmCode, item?.firm?.pincode || (item as any)?.firmId?.pincode]
                  .filter(Boolean)
                  .join(' • ')
            : [item?.vendor?.vendorCode || item?.vendorCode, item?.vendor?.phone, item?.vendor?.email].filter(Boolean).join(' • ')

        const canAcceptReject = s === 'pending' && ((requestedBy === 'vendor' && isFirm) || (requestedBy === 'firm' && isVendor))

        const canCancel = s === 'pending' && ((requestedBy === 'vendor' && isVendor) || (requestedBy === 'firm' && isFirm))

        const canDisconnect = s === 'active'
        const coveredText = item?.endAt && isFuture(item.endAt) ? `Covered until ${fmtDateTime(item.endAt)}` : 'Not covered'

        return (
            <div className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-5'>
                <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'>
                    <div className='min-w-0'>
                        <div className='flex flex-wrap items-center gap-2'>
                            <div className='text-base font-extrabold text-gray-900 dark:text-gray-100 truncate'>{counterpartTitle}</div>

                            <span className={clsx('text-xs font-semibold px-3 py-1 rounded-full', statusPill(item?.status))}>
                                {cap(item?.status || 'status')}
                            </span>

                            {String(item?.status).toLowerCase() === 'active' ? (
                                <span className={clsx('text-xs font-semibold px-3 py-1 rounded-full', coveragePill(item?.endAt))}>{coveredText}</span>
                            ) : null}
                        </div>

                        {counterpartSub ? <div className='mt-1 text-sm text-gray-600 dark:text-gray-300 truncate'>{counterpartSub}</div> : null}

                        {item?.message ? (
                            <div className='mt-2 text-sm text-gray-700 dark:text-gray-200'>
                                <span className='font-semibold'>Message:</span> {item.message}
                            </div>
                        ) : null}

                        <div className='mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-300'>
                            <div className='inline-flex items-center gap-1'>
                                <HiOutlineClock className='text-base' />
                                <span>Created: {fmtDateTime((item as any)?.createdAt as any)}</span>
                            </div>
                            <div className='inline-flex items-center gap-1'>
                                <HiOutlineClock className='text-base' />
                                <span>Start: {fmtDateTime((item as any)?.startAt as any)}</span>
                            </div>
                            <div className='inline-flex items-center gap-1'>
                                <HiOutlineClock className='text-base' />
                                <span>End: {fmtDateTime((item as any)?.endAt as any)}</span>
                            </div>
                        </div>

                        {/* ✅ vendor hint only (firms don't pay for connections) */}
                        {isVendor && String(item?.status).toLowerCase() === 'active' && !(item?.endAt && isFuture(item.endAt)) ? (
                            <div className='mt-2 text-sm text-amber-700 dark:text-amber-200 inline-flex items-center gap-2'>
                                <HiOutlineExclamationCircle className='text-lg' />
                                This link is active but not covered by your subscription. You may need to buy more connections.
                                <button
                                    type='button'
                                    className='inline-flex items-center gap-1 font-semibold hover:underline'
                                    onClick={() => navigate('/billing')}>
                                    Go to Billing <HiOutlineExternalLink className='text-base' />
                                </button>
                            </div>
                        ) : null}
                    </div>

                    <div className='flex flex-wrap gap-2'>
                        {canAcceptReject ? (
                            <>
                                <Button size='sm' variant='solid' icon={<HiOutlineCheckCircle />} onClick={() => accept(item._id)}>
                                    Accept
                                </Button>
                                <Button
                                    size='sm'
                                    variant='plain'
                                    className='text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                    icon={<HiOutlineXCircle />}
                                    onClick={() => reject(item._id)}>
                                    Reject
                                </Button>
                            </>
                        ) : null}

                        {canCancel ? (
                            <Button
                                size='sm'
                                variant='plain'
                                className='text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                icon={<HiOutlineBan />}
                                onClick={() => cancel(item._id)}>
                                Cancel
                            </Button>
                        ) : null}

                        {canDisconnect ? (
                            <Button
                                size='sm'
                                variant='plain'
                                className='text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                icon={<HiOutlineBan />}
                                onClick={() => disconnect(item._id)}>
                                Disconnect
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>
        )
    }

    const headerSubtitle = useMemo(() => {
        if (isVendor) return 'Search firms, send requests, and manage your active firm links.'
        if (isFirm) return 'Search vendors, send invites, and manage vendor connection requests.'
        return 'Manage firm-vendor connections.'
    }, [isVendor, isFirm])

    if (loadingProfile) {
        return (
            <div className='p-4 sm:p-6'>
                <div className='max-w-6xl mx-auto'>
                    <div className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 animate-pulse'>
                        <div className='h-5 w-40 rounded bg-gray-200 dark:bg-gray-800' />
                        <div className='mt-3 h-4 w-72 rounded bg-gray-200 dark:bg-gray-800' />
                        <div className='mt-6 h-28 rounded-2xl bg-gray-200 dark:bg-gray-800' />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className='p-4 sm:p-6'>
            <div className='max-w-6xl mx-auto space-y-4'>
                {/* Header */}
                <div className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden'>
                    <div className='relative p-5 sm:p-6'>
                        <div className='absolute inset-0 opacity-60 pointer-events-none'>
                            <div className='absolute -top-24 -right-24 h-56 w-56 rounded-full bg-slate-100 dark:bg-gray-800 blur-2xl' />
                            <div className='absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-emerald-50 dark:bg-emerald-900/20 blur-2xl' />
                        </div>

                        <div className='relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4'>
                            <div className='min-w-0'>
                                <div className='flex items-center gap-2'>
                                    <HiOutlineLink className='text-2xl text-gray-700 dark:text-gray-200' />
                                    <div className='text-xl font-extrabold text-gray-900 dark:text-gray-100'>Connections</div>
                                    <span
                                        className={clsx(
                                            'text-xs font-semibold px-3 py-1 rounded-full',
                                            'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
                                        )}>
                                        {cap(viewerType) || 'User'}
                                    </span>
                                    {isVendor && vendorCode ? (
                                        <span className='text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-200'>
                                            {vendorCode}
                                        </span>
                                    ) : null}
                                </div>
                                <div className='mt-2 text-sm text-gray-600 dark:text-gray-300'>{headerSubtitle}</div>

                                {/* quick stats */}
                                <div className='mt-4 flex flex-wrap gap-2'>
                                    <span className='text-xs font-semibold px-3 py-1 rounded-full bg-slate-50 text-slate-700 dark:bg-gray-800/60 dark:text-gray-200'>
                                        Active: {activeLinks.length}
                                    </span>
                                    <span className='text-xs font-semibold px-3 py-1 rounded-full bg-slate-50 text-slate-700 dark:bg-gray-800/60 dark:text-gray-200'>
                                        Pending: {pendingAll.length}
                                    </span>

                                    {/* vendor-only */}
                                    {isVendor ? (
                                        <span
                                            className={clsx(
                                                'text-xs font-semibold px-3 py-1 rounded-full',
                                                uncoveredActive.length
                                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
                                                    : 'bg-slate-50 text-slate-700 dark:bg-gray-800/60 dark:text-gray-200',
                                            )}>
                                            Uncovered: {uncoveredActive.length}
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3'>
                                <Button
                                    icon={<HiOutlineRefresh />}
                                    variant='plain'
                                    className='hover:bg-slate-100 dark:hover:bg-gray-800'
                                    onClick={refreshAll as any}>
                                    Refresh
                                </Button>

                                <Button icon={<HiOutlineExternalLink />} variant='solid' onClick={() => navigate('/billing')}>
                                    Billing
                                </Button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className='relative mt-5 flex flex-wrap gap-2'>
                            <button className={tabBtn(tab === 'links')} onClick={() => setTab('links')} type='button'>
                                <HiOutlineLink className='text-base' />
                                My Links
                            </button>
                            <button className={tabBtn(tab === 'requests')} onClick={() => setTab('requests')} type='button'>
                                <HiOutlineClock className='text-base' />
                                Requests
                            </button>
                            <button className={tabBtn(tab === 'search')} onClick={() => setTab('search')} type='button'>
                                <HiOutlineSearch className='text-base' />
                                Search & Connect
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tab: Links */}
                {tab === 'links' ? (
                    <div className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6'>
                        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
                            <div>
                                <div className='text-lg font-extrabold text-gray-900 dark:text-gray-100'>My Links</div>
                                <div className='text-sm text-gray-600 dark:text-gray-300'>View your firm-vendor links with status and coverage.</div>
                            </div>

                            <div className='flex items-center gap-2'>
                                <select
                                    className='rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm'
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value)
                                        setTimeout(() => loadLinks(), 0)
                                    }}>
                                    <option value=''>All</option>
                                    <option value='active'>Active</option>
                                    <option value='pending'>Pending</option>
                                    <option value='rejected'>Rejected</option>
                                    <option value='cancelled'>Cancelled</option>
                                    <option value='expired'>Expired</option>
                                </select>

                                <Button
                                    icon={<HiOutlineRefresh />}
                                    variant='plain'
                                    className='hover:bg-slate-100 dark:hover:bg-gray-800'
                                    loading={linksLoading as any}
                                    onClick={loadLinks as any}>
                                    Refresh
                                </Button>
                            </div>
                        </div>

                        <div className='mt-4 space-y-3'>
                            {linksLoading ? (
                                <div className='rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300'>
                                    Loading...
                                </div>
                            ) : links.length === 0 ? (
                                <div className='rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300'>
                                    No links found.
                                </div>
                            ) : (
                                links.map((x) => <LinkCard key={x._id} item={x} />)
                            )}
                        </div>
                    </div>
                ) : null}

                {/* Tab: Requests */}
                {tab === 'requests' ? (
                    <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                        {/* Incoming */}
                        <div className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6'>
                            <div className='flex items-center justify-between gap-2'>
                                <div>
                                    <div className='text-lg font-extrabold text-gray-900 dark:text-gray-100'>Incoming</div>
                                    <div className='text-sm text-gray-600 dark:text-gray-300'>
                                        {isVendor ? 'Firm invites waiting for your action.' : 'Vendor requests waiting for your action.'}
                                    </div>
                                </div>

                                <Button
                                    icon={<HiOutlineRefresh />}
                                    variant='plain'
                                    className='hover:bg-slate-100 dark:hover:bg-gray-800'
                                    loading={incomingLoading as any}
                                    onClick={loadIncoming as any}>
                                    Refresh
                                </Button>
                            </div>

                            <div className='mt-4 space-y-3'>
                                {incomingLoading ? (
                                    <div className='rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300'>
                                        Loading...
                                    </div>
                                ) : incoming.length === 0 ? (
                                    <div className='rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300'>
                                        No incoming requests.
                                    </div>
                                ) : (
                                    incoming.map((x) => <LinkCard key={x._id} item={x} />)
                                )}
                            </div>
                        </div>

                        {/* Outgoing */}
                        <div className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6'>
                            <div className='flex items-center justify-between gap-2'>
                                <div>
                                    <div className='text-lg font-extrabold text-gray-900 dark:text-gray-100'>Outgoing</div>
                                    <div className='text-sm text-gray-600 dark:text-gray-300'>Requests you sent (you can cancel while pending).</div>
                                </div>

                                <Button
                                    icon={<HiOutlineRefresh />}
                                    variant='plain'
                                    className='hover:bg-slate-100 dark:hover:bg-gray-800'
                                    onClick={loadPendingAll as any}>
                                    Refresh
                                </Button>
                            </div>

                            <div className='mt-4 space-y-3'>
                                {outgoingPending.length === 0 ? (
                                    <div className='rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300'>
                                        No outgoing pending requests.
                                    </div>
                                ) : (
                                    outgoingPending.map((x) => <LinkCard key={x._id} item={x} />)
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Tab: Search */}
                {tab === 'search' ? (
                    <div className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6'>
                        <div>
                            <div className='text-lg font-extrabold text-gray-900 dark:text-gray-100'>Search & Connect</div>
                            <div className='text-sm text-gray-600 dark:text-gray-300'>
                                {isVendor
                                    ? 'All firms are shown by default. Type to filter and send a request. (Connected/pending firms are hidden)'
                                    : 'All vendors are shown by default. Type to filter and send an invite. (Connected/pending vendors are hidden)'}
                            </div>
                        </div>

                        <div className='mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3'>
                            <div className='sm:col-span-2'>
                                <label className='text-sm font-semibold text-gray-700 dark:text-gray-200'>Search</label>
                                <div className='mt-1'>
                                    <input
                                        value={searchQ}
                                        onChange={(e) => setSearchQ(e.target.value)}
                                        placeholder={isVendor ? 'Filter firm by name/username/code/pincode...' : 'Filter vendor by code/name/username/email...'}
                                        className='w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2.5'
                                    />
                                </div>
                            </div>

                            <div className='flex items-end'>
                                <Button
                                    icon={<HiOutlineSearch />}
                                    variant='plain'
                                    className='w-full hover:bg-slate-100 dark:hover:bg-gray-800'
                                    loading={searchLoading as any}
                                    onClick={() => setSearchQ((v) => v.trim())}>
                                    Search
                                </Button>
                            </div>
                        </div>

                        {/* Results */}
                        <div className='mt-5'>
                            {searchLoading ? (
                                <div className='rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300'>
                                    Loading directory...
                                </div>
                            ) : isVendor ? (
                                filteredFirms.length === 0 ? (
                                    <div className='rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300'>
                                        No firms found (or all are already connected/pending). Try a different keyword.
                                    </div>
                                ) : (
                                    <div className='space-y-3'>
                                        <div className='text-xs text-gray-500 dark:text-gray-400'>Showing {filteredFirms.length} firm(s)</div>

                                        {filteredFirms.map((f) => (
                                            <div
                                                key={f._id}
                                                className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/40 p-4'>
                                                <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'>
                                                    <div className='min-w-0'>
                                                        <div className='text-base font-extrabold text-gray-900 dark:text-gray-100'>{f.name || 'Firm'}</div>
                                                        <div className='mt-1 text-sm text-gray-600 dark:text-gray-300'>
                                                            {[f.username, f.firmCode, f.pincode].filter(Boolean).join(' • ') || '—'}
                                                        </div>
                                                        {f.address ? <div className='mt-1 text-sm text-gray-600 dark:text-gray-300'>{f.address}</div> : null}
                                                    </div>

                                                    <Button icon={<HiOutlinePaperAirplane />} variant='solid' onClick={() => requestFirm(f._id)}>
                                                        Request
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : filteredVendors.length === 0 ? (
                                <div className='rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300'>
                                    No vendors found (or all are already connected/pending). Try a different keyword.
                                </div>
                            ) : (
                                <div className='space-y-3'>
                                    <div className='text-xs text-gray-500 dark:text-gray-400'>Showing {filteredVendors.length} vendor(s)</div>

                                    {filteredVendors.map((v, idx) => (
                                        <div
                                            key={`${v.vendorCode || idx}`}
                                            className='rounded-2xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/40 p-4'>
                                            <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'>
                                                <div className='min-w-0'>
                                                    <div className='text-base font-extrabold text-gray-900 dark:text-gray-100'>{v.name || 'Vendor'}</div>
                                                    <div className='mt-1 text-sm text-gray-600 dark:text-gray-300'>
                                                        {[v.vendorCode, v.username, v.phone, v.email].filter(Boolean).join(' • ') || '—'}
                                                    </div>
                                                </div>

                                                <Button
                                                    icon={<HiOutlinePaperAirplane />}
                                                    variant='solid'
                                                    onClick={() => inviteVendor(String(v.vendorCode || '').trim())}
                                                    disabled={!String(v.vendorCode || '').trim()}>
                                                    Invite
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Rules */}
                        <div className='mt-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/60 p-4 text-sm text-gray-600 dark:text-gray-300'>
                            <div className='font-extrabold text-gray-900 dark:text-gray-100 mb-1'>Rules</div>
                            <ul className='space-y-1'>
                                <li>• Vendor can search firms and send a request.</li>
                                <li>• Firm can search vendors and send an invite.</li>
                                <li>• Receiver can accept/reject. Requester can cancel while pending.</li>
                                <li>• Firms do not pay for connections. Vendors pay only when they need to cover more active links.</li>
                            </ul>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    )
}