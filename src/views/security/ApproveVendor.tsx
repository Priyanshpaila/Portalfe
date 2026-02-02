import React, { useEffect, useMemo, useState } from 'react'
import { Button, Dialog, Input, Spinner, Table } from '@/components/ui'
import ApiService from '@/services/ApiService'
import { showAlert, showError } from '@/utils/hoc/showAlert'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Loading } from '@/components/shared'
import { MdCheckCircle, MdRefresh, MdSearch, MdVisibility } from 'react-icons/md'

const { Tr, Th, Td, THead, TBody } = Table

type ContactPerson = {
    name?: string
    email?: string
    mobilePhoneIndicator?: string
    fullPhoneNumber?: string
    callerPhoneNumber?: string
}

type PreapprovedVendor = {
    _id: string
    status: 'pending' | 'approved'
    name?: string
    gstin?: string
    panNumber?: string
    msme?: string
    city?: string
    district?: string
    street?: string
    postalCode?: string
    companyCode?: string
    region?: string
    languageKey?: string
    createdAt?: string
    updatedAt?: string
    contactPerson?: ContactPerson[]
    [k: string]: any
}

type ListResp = { success: boolean; data: PreapprovedVendor[] }

export default function ApproveVendor() {
    const [flags, setFlags] = useState<{ loading?: boolean; approving?: boolean; confirm?: boolean }>({})
    const [search, setSearch] = useState('')
    const [rows, setRows] = useState<PreapprovedVendor[]>([])

    const [selected, setSelected] = useState<PreapprovedVendor | null>(null)
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [confirmVendor, setConfirmVendor] = useState<PreapprovedVendor | null>(null)

    const pendingRows = useMemo(() => {
        const s = search.trim().toLowerCase()
        if (!s) return rows
        return rows.filter((v) => {
            const name = String(v.name || '').toLowerCase()
            const gst = String(v.gstin || '').toLowerCase()
            const pan = String(v.panNumber || '').toLowerCase()
            return name.includes(s) || gst.includes(s) || pan.includes(s)
        })
    }, [rows, search])

    const fetchPending = async () => {
        setFlags((p) => ({ ...p, loading: true }))
        try {
            const resp = await ApiService.fetchData<ListResp>({
                method: 'get',
                url: '/preapprovedVendor/list',
                params: { status: 'pending' },
            })
            setRows(resp?.data?.data || [])
        } catch (err: any) {
            showError(err?.response?.data?.message || err?.message || 'Failed to load pending vendors.')
        } finally {
            setFlags((p) => ({ ...p, loading: false }))
        }
    }

    useEffect(() => {
        fetchPending()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const openDetails = (v: PreapprovedVendor) => {
        setSelected(v)
        setDetailsOpen(true)
    }

    const askApprove = (v: PreapprovedVendor) => {
        setConfirmVendor(v)
        setFlags((p) => ({ ...p, confirm: true }))
    }

    const approveNow = async () => {
        if (!confirmVendor?._id) return
        setFlags((p) => ({ ...p, approving: true }))
        try {
            const resp = await ApiService.fetchData<any>({
                method: 'post',
                url: `/preapprovedVendor/${confirmVendor._id}/approve`,
            })

            const newVendorCode = resp?.data?.vendor?.vendorCode
            showAlert(newVendorCode ? `Approved! Created vendor: ${newVendorCode}` : 'Vendor approved successfully.')

            // ✅ remove from list instantly
            setRows((prev) => prev.filter((x) => x._id !== confirmVendor._id))

            // close dialogs
            setFlags((p) => ({ ...p, confirm: false }))
            setConfirmVendor(null)

            // if details open for same vendor, close it
            if (selected?._id === confirmVendor._id) {
                setDetailsOpen(false)
                setSelected(null)
            }
        } catch (err: any) {
            showError(err?.response?.data?.message || err?.message || 'Failed to approve vendor.')
        } finally {
            setFlags((p) => ({ ...p, approving: false }))
        }
    }

    return (
        <div className='p-4'>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
                <div>
                    <h3 className='text-xl font-semibold'>Vendor Approvals</h3>
                    <div className='text-sm opacity-70'>Registered vendors waiting for approval.</div>
                </div>

                <div className='flex gap-2 items-center'>
                    <div className='relative'>
                        <span className='absolute left-2 top-1/2 -translate-y-1/2 opacity-60'>
                            <MdSearch />
                        </span>
                        <Input
                            size='sm'
                            className='pl-7 w-[260px]'
                            placeholder='Search name / GSTIN / PAN'
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <Button size='sm' variant='twoTone' icon={<MdRefresh />} onClick={fetchPending} disabled={!!flags.loading}>
                        Refresh
                    </Button>
                </div>
            </div>

            <div className='mt-4'>
                <Loading type='cover' loading={!!flags.loading}>
                    <div className='rounded-xl border bg-white'>
                        <div className='flex items-center justify-between px-4 py-3 border-b'>
                            <div className='text-sm font-medium'>
                                Pending Vendors <span className='opacity-60'>({pendingRows.length})</span>
                            </div>
                        </div>

                        <div className='max-h-[70vh] overflow-auto'>
                            <Table compact className='text-xs'>
                                <THead className='sticky top-0 bg-white z-10'>
                                    <Tr>
                                        <Th>#</Th>
                                        <Th>Name</Th>
                                        <Th>GSTIN</Th>
                                        <Th>PAN</Th>
                                        <Th>City</Th>
                                        <Th>Contact</Th>
                                        <Th className='text-right'>Actions</Th>
                                    </Tr>
                                </THead>

                                <TBody>
                                    {pendingRows.length === 0 ? (
                                        <Tr>
                                            <Td colSpan={7} className='py-8 text-center opacity-70'>
                                                No pending vendors found.
                                            </Td>
                                        </Tr>
                                    ) : (
                                        pendingRows.map((v, idx) => {
                                            const cp = (v.contactPerson || [])[0]
                                            const contactLabel = cp?.name || cp?.email || cp?.fullPhoneNumber || '-'

                                            return (
                                                <Tr key={v._id}>
                                                    <Td>{idx + 1}</Td>
                                                    <Td className='font-medium'>{v.name || '-'}</Td>
                                                    <Td>{v.gstin || '-'}</Td>
                                                    <Td>{v.panNumber || '-'}</Td>
                                                    <Td>{v.city || '-'}</Td>
                                                    <Td className='max-w-[260px] truncate'>{contactLabel}</Td>
                                                    <Td className='text-right'>
                                                        <div className='flex justify-end gap-2'>
                                                            <Button size='xs' variant='twoTone' icon={<MdVisibility />} onClick={() => openDetails(v)}>
                                                                View
                                                            </Button>
                                                            <Button size='xs' variant='solid' icon={<MdCheckCircle />} onClick={() => askApprove(v)}>
                                                                Approve
                                                            </Button>
                                                        </div>
                                                    </Td>
                                                </Tr>
                                            )
                                        })
                                    )}
                                </TBody>
                            </Table>
                        </div>
                    </div>
                </Loading>
            </div>

            {/* DETAILS DIALOG */}
            <Dialog isOpen={detailsOpen} onClose={() => setDetailsOpen(false)} width={760}>
                {/* Header (only title/subtitle) */}
                <div className='flex items-start justify-between gap-3'>
                    <div>
                        <h6 className='text-lg font-semibold'>Vendor Details</h6>
                        <div className='text-xs opacity-70'>Preapproved Vendor (Pending)</div>
                    </div>
                </div>

                {/* Body */}
                <div className='mt-4 text-sm'>
                    {!selected ? (
                        <div className='opacity-70'>No vendor selected.</div>
                    ) : (
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                            <div className='rounded-lg border p-3'>
                                <div className='text-xs opacity-70'>Name</div>
                                <div className='font-medium'>{selected.name || '-'}</div>
                            </div>

                            <div className='rounded-lg border p-3'>
                                <div className='text-xs opacity-70'>Status</div>
                                <div className='font-medium'>{selected.status}</div>
                            </div>

                            <div className='rounded-lg border p-3'>
                                <div className='text-xs opacity-70'>GSTIN</div>
                                <div className='font-medium'>{selected.gstin || '-'}</div>
                            </div>

                            <div className='rounded-lg border p-3'>
                                <div className='text-xs opacity-70'>PAN</div>
                                <div className='font-medium'>{selected.panNumber || '-'}</div>
                            </div>

                            <div className='rounded-lg border p-3 md:col-span-2'>
                                <div className='text-xs opacity-70'>Address</div>
                                <div className='font-medium'>
                                    {[selected.street, selected.district, selected.city, selected.postalCode].filter(Boolean).join(', ') || '-'}
                                </div>
                            </div>

                            <div className='rounded-lg border p-3 md:col-span-2'>
                                <div className='text-xs opacity-70'>Contact Persons</div>
                                <div className='mt-2 space-y-2'>
                                    {(selected.contactPerson || []).length === 0 ? (
                                        <div className='opacity-70'>No contacts</div>
                                    ) : (
                                        (selected.contactPerson || []).map((c, i) => (
                                            <div key={i} className='rounded-md border bg-gray-50 p-2'>
                                                <div className='font-medium'>{c.name || '-'}</div>
                                                <div className='text-xs opacity-70'>
                                                    {[c.email, c.fullPhoneNumber, c.callerPhoneNumber].filter(Boolean).join(' • ') || '-'}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer (Approve at bottom) */}
                <div className='mt-5 flex items-center justify-end gap-2 border-t pt-4'>
                    <Button type='button' size='sm' variant='plain' onClick={() => setDetailsOpen(false)}>
                        Close
                    </Button>

                    {selected ? (
                        <Button size='sm' variant='solid' icon={<MdCheckCircle />} onClick={() => askApprove(selected)}>
                            Approve
                        </Button>
                    ) : null}
                </div>
            </Dialog>

            {/* APPROVE CONFIRM */}
            <ConfirmDialog
                isOpen={!!flags.confirm}
                type='success'
                title='Approve Vendor'
                confirmText='Approve'
                cancelText='Cancel'
                confirmButtonColor='green'
                loading={!!flags.approving}
                onCancel={() => {
                    setFlags((p) => ({ ...p, confirm: false }))
                    setConfirmVendor(null)
                }}
                onConfirm={approveNow}>
                Are you sure you want to approve <b>{confirmVendor?.name || 'this vendor'}</b>?
                <div className='mt-2 text-xs opacity-70'>This will create a vendor in Vendor Master with a new auto-generated vendor code.</div>
            </ConfirmDialog>
        </div>
    )
}
