import { Button, Input, Spinner, Tag } from '@/components/ui'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ApiService from '@/services/ApiService'
import { POType } from '@/@types/app'
import { formatDate } from '@/utils/formatDate'
import { companies } from '@/utils/data'

type PendingPOApprovalType = Pick<
    POType,
    | '_id'
    | 'poNumber'
    | 'poDate'
    | 'sapPONumber'
    | 'company'
    | 'vendorCode'
    | 'vendorName'
    | 'vendorLocation'
    | 'refDocumentType'
    | 'refDocumentNumber'
    | 'validityDate'
    | 'remarks'
> & {
    itemDescriptions?: string[]
    itemDescription?: string[] | string
    itemCodes?: string[]
    itemCount?: number
    amount: number
    currentApproval?: {
        user: string
        name: string
        assignOn: string
        approvalStatus: number
        comment?: string
    }
}

const resolveCompanyName = (company: string) => {
    const value = String(company || '').trim()

    const found = companies.find((c: any) => {
        return (
            String(c.plantCode || '').trim() === value ||
            String(c.companyName || '')
                .trim()
                .toLowerCase() === value.toLowerCase() ||
            String(c.alias || '')
                .trim()
                .toLowerCase() === value.toLowerCase()
        )
    })

    return found?.companyName || found?.alias || value || '-'
}

const getCompanyShort = (company: string) => {
    const value = String(company || '').trim()
    const found = companies.find((c: any) => {
        return (
            String(c.plantCode || '').trim() === value ||
            String(c.companyName || '')
                .trim()
                .toLowerCase() === value.toLowerCase() ||
            String(c.alias || '')
                .trim()
                .toLowerCase() === value.toLowerCase()
        )
    })

    return (
        found?.alias ||
        String(found?.companyName || value || '-')
            .slice(0, 2)
            .toUpperCase()
    )
}

const formatAmount = (value: number) => {
    const n = Number(value || 0)
    return n.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

const normalizeRows = (raw: any): PendingPOApprovalType[] => {
    if (Array.isArray(raw)) return raw
    if (Array.isArray(raw?.data)) return raw.data
    return []
}

const getItemDescriptions = (row: PendingPOApprovalType) => {
    if (Array.isArray(row.itemDescriptions)) return row.itemDescriptions
    if (Array.isArray(row.itemDescription)) return row.itemDescription
    if (row.itemDescription) return [row.itemDescription]
    return []
}

const getPriority = (row: PendingPOApprovalType) => {
    const amount = Number(row.amount || 0)
    if (amount >= 100000) return 'Urgent'
    if (amount >= 25000) return 'Medium'
    return 'Normal'
}

const getPriorityClass = (priority: string) => {
    if (priority === 'Urgent') return 'bg-red-600 text-white border-red-600'
    if (priority === 'Medium') return 'bg-orange-600 text-white border-orange-600'
    return 'bg-slate-100 text-slate-700 border-slate-200'
}

const POPendingApprovals = () => {
    const navigate = useNavigate()

    const [rows, setRows] = useState<PendingPOApprovalType[]>([])
    const [loading, setLoading] = useState(true)
    const [query, setQuery] = useState('')

    useEffect(() => {
        ;(async () => {
            try {
                setLoading(true)

                const response = await ApiService.fetchData<{
                    data: PendingPOApprovalType[]
                    total: number
                    page: number
                    pageSize: number
                    totalPages: number
                }>({
                    method: 'get',
                    url: '/po/pending-po-approvals',
                    params: {
                        page: 1,
                        pageSize: 500,
                    },
                })

                const rawRows = normalizeRows(response.data as any)

                setRows(
                    rawRows.map((item) => ({
                        ...item,
                        company: resolveCompanyName(item.company as string),
                    })),
                )
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    const filteredRows = useMemo(() => {
        const search = query.trim().toLowerCase()
        if (!search) return rows

        return rows.filter((row) => {
            const descriptions = getItemDescriptions(row).join(' ')
            const text = [
                row.poNumber,
                row.sapPONumber,
                row.vendorName,
                row.vendorCode,
                row.vendorLocation,
                row.company,
                row.refDocumentType,
                row.refDocumentNumber,
                descriptions,
                row.amount,
            ]
                .join(' ')
                .toLowerCase()

            return text.includes(search)
        })
    }, [rows, query])

    const openPO = (poNumber: string) => {
        navigate('/po-authorize?poNumber=' + encodeURIComponent(String(poNumber)))
    }

    return (
        <div className='fixed left-0 top-0 z-30 h-screen w-screen overflow-auto bg-slate-100 text-xs text-slate-900'>
            <header className='sticky top-0 z-30 border-b border-blue-700 bg-blue-600 shadow-sm'>
                <div className='flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-5'>
                    <div className='min-w-0'>
                        <h1 className='text-sm font-bold text-white sm:text-base'>Purchase Order Authorization</h1>
                        <div className='mt-0.5 text-[11px] text-blue-50'>Pending purchase orders for your approval</div>
                    </div>

                    <div className='flex flex-wrap items-center gap-2'>
                        <Button size='xs' variant='twoTone' onClick={() => navigate('/dashboard')}>
                            Dashboard
                        </Button>

                        <Button size='xs' variant='twoTone' onClick={() => navigate(-1)}>
                            Back
                        </Button>
                    </div>
                </div>

                <div className='border-t border-blue-500/50 bg-blue-600 px-3 py-2 sm:px-5'>
                    <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                        <div className='flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white'>
                            <span className='rounded-full bg-white/15 px-2.5 py-1'>Total: {rows.length}</span>
                            <span className='rounded-full bg-white/15 px-2.5 py-1'>Showing: {filteredRows.length}</span>
                        </div>

                        <div className='w-full sm:w-[320px]'>
                            <Input size='xs' value={query} placeholder='Search PO, vendor, item...' onChange={(e) => setQuery(e.target.value)} />
                        </div>
                    </div>
                </div>
            </header>

            <main className='mx-auto w-full max-w-[1320px] px-2 py-2 sm:px-3'>
                {loading ? (
                    <div className='flex min-h-[260px] items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm'>
                        <div className='flex items-center gap-2 text-slate-600'>
                            <Spinner size={20} />
                            <span>Loading pending POs...</span>
                        </div>
                    </div>
                ) : !filteredRows.length ? (
                    <div className='flex min-h-[260px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 text-center text-sm text-slate-500 shadow-sm'>
                        No pending purchase orders found.
                    </div>
                ) : (
                    <div className='space-y-2'>
                        {filteredRows.map((row) => {
                            const descriptions = getItemDescriptions(row)
                            const priority = getPriority(row)
                            const companyShort = getCompanyShort(row.company as string)

                            return (
                                <button
                                    key={row._id}
                                    type='button'
                                    onClick={() => openPO(row.poNumber as string)}
                                    className='block w-full rounded-lg border border-slate-300 bg-white text-left shadow-sm transition active:scale-[0.998] hover:border-blue-300 hover:bg-blue-50/30'>
                                    <div className='grid grid-cols-1 gap-2 px-3 py-2.5 lg:grid-cols-[minmax(0,1.4fr)_170px]'>
                                        <div className='min-w-0'>
                                            <div className='flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between'>
                                                <div className='min-w-0'>
                                                    <div className='truncate text-[12px] font-extrabold uppercase tracking-wide text-red-500'>
                                                        {row.vendorName || '-'}
                                                    </div>
                                                    <div className='mt-0.5 truncate text-[10px] uppercase text-slate-500'>{row.vendorLocation || '-'}</div>
                                                </div>

                                                <div className='flex shrink-0 flex-wrap items-center gap-1 sm:justify-end'>
                                                    <Tag className={`border px-2 py-0.5 text-[10px] font-bold ${getPriorityClass(priority)}`}>{priority}</Tag>
                                                    <span className='rounded bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700'>Pending</span>
                                                </div>
                                            </div>

                                            <div className='mt-2 flex min-w-0 items-start gap-1 border-t border-slate-100 pt-2 text-[11px] leading-4'>
                                                <span className='shrink-0 font-bold text-slate-700'>Item Des. :</span>
                                                <span className='line-clamp-1 min-w-0 break-words text-slate-700'>
                                                    {descriptions.length ? descriptions.join(', ') : '-'}
                                                    {row.itemCount ? ` (Qty / Items : ${row.itemCount})` : ''}
                                                </span>
                                            </div>

                                            <div className='mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4'>
                                                <div className='rounded-md bg-slate-50 px-2 py-1.5'>
                                                    <div className='text-[10px] leading-3 text-slate-500'>Net Amount</div>
                                                    <div className='mt-0.5 text-[12px] font-bold leading-4 text-slate-900'>₹{formatAmount(row.amount)}</div>
                                                </div>

                                                <div className='rounded-md bg-slate-50 px-2 py-1.5'>
                                                    <div className='text-[10px] leading-3 text-slate-500'>Ref. Document</div>
                                                    <div className='mt-0.5 truncate text-[12px] font-bold capitalize leading-4 text-slate-900'>
                                                        {row.refDocumentType || '-'}
                                                    </div>
                                                </div>

                                                <div className='rounded-md bg-slate-50 px-2 py-1.5'>
                                                    <div className='text-[10px] leading-3 text-slate-500'>Freight Type</div>
                                                    <div className='mt-0.5 text-[12px] font-bold leading-4 text-slate-900'>TOPAY</div>
                                                </div>

                                                <div className='rounded-md bg-slate-50 px-2 py-1.5'>
                                                    <div className='text-[10px] leading-3 text-slate-500'>Company</div>
                                                    <div className='mt-0.5 flex min-w-0 items-center gap-1'>
                                                        <span className='rounded bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white'>
                                                            {companyShort}
                                                        </span>
                                                        <span className='min-w-0 truncate text-[12px] font-bold leading-4 text-slate-900'>
                                                            {row.company || '-'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className='flex min-w-0 flex-col justify-between gap-2 border-t border-slate-100 pt-2 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0'>
                                            <div className='text-left text-[11px] font-semibold leading-4 text-slate-700 lg:text-right'>
                                                <div>({formatDate(row.poDate as string)})</div>
                                                <div>Portal PO : {row.poNumber || '-'}</div>
                                                <div className='truncate'>SAP PO : {row.sapPONumber || '-'}</div>
                                            </div>

                                            <div className='grid grid-cols-2 gap-1.5 lg:grid-cols-1'>
                                                <div>
                                                    <div className='text-[10px] font-bold text-slate-700'>Next Approver</div>
                                                    <div className='mt-0.5 truncate rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700'>
                                                        {row.currentApproval?.name || 'Any'}
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className='text-[10px] font-bold text-slate-700'>User Comment</div>
                                                    <div className='mt-0.5 truncate rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700'>
                                                        {row.currentApproval?.comment || '-'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className='hidden gap-1.5 lg:flex'>
                                                <span className='rounded bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white'>Tap to View</span>
                                                <span className='rounded bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white'>Reject Inside</span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}

export default POPendingApprovals
