import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoMdArrowDropright } from 'react-icons/io'
import { MdDeleteOutline, MdOutlineDownloadDone, MdOutlineSave } from 'react-icons/md'
import classNames from 'classnames'

import { Button, DatePicker, Dialog, Input, Select, Table, Tabs, Tag } from '@/components/ui'
import DateTimepicker from '@/components/ui/DatePicker/DateTimepicker'
import useQuery from '@/utils/hooks/useQuery'
import ApiService from '@/services/ApiService'
import { getIndentID, termsConditionsOptions } from '@/utils/data'
import { formatDate, formatDateTime } from '@/utils/formatDate'
import TFoot from '@/components/ui/Table/TFoot'
import { CSType, CSVendor } from '@/@types/app'
import TabContent from '@/components/ui/Tabs/TabContent'
import { csTypes } from '@/utils/constants'
import { useAppSelector } from '@/store'
import { PERMISSIONS } from '@/utils/permissions'
import { showAlert, showError } from '@/utils/hoc/showAlert'
import { ConfirmDialog, Loading } from '@/components/shared'
import TabList from '@/components/ui/Tabs/TabList'
import TabNav from '@/components/ui/Tabs/TabNav'
import Negotiation from '../pages/Negotiation'
import { IoPrintOutline } from 'react-icons/io5'
import { useReactToPrint } from 'react-to-print'
import { RiFileExcel2Line } from 'react-icons/ri'
import { exportTableToExcel } from '@/utils/exportTableToExcel'

const { Tr, Th, Td, THead, TBody } = Table

const particulars = [
    { label: 'Last PO Rate', value: 'lastPoRate' },
    { label: 'Last PO No', value: 'lastPoNo' },
    { label: 'Last PO Date', value: 'lastPoDate' },
    { label: 'Last PO Vendor', value: 'lastPoVendor' },
    { label: 'Make', value: 'make' },
    { label: 'Rate', value: 'rate' },
    { label: 'Basic Amount', value: 'basicAmount' },
    { label: 'Discount', value: 'discount' },
    { label: 'Tax Rate', value: 'taxRate', extra: '%' },
    { label: 'Basic After Discount', value: 'basicAfterDiscount' },
    { label: 'Rate After Discount', value: 'rateAfterDiscount' },
]

const particularsTotal = [
    { label: 'Basic After Disc (Total)', value: 'basicAfterDiscount' },
    {
        label: 'Other Charges',
        value: 'otherCharges',
        getValue: (vendor: CSVendor) => {
            const amt = vendor?.charges?.otherCharges?.amount ?? 0
            const gst = vendor?.charges?.otherCharges?.gstRate ?? 0
            return amt ? `${amt} (${gst}%)` : 0
        },
    },
    {
        label: 'Packaging & Forwarding',
        value: 'packagingForwarding',
        getValue: (vendor: CSVendor) => {
            const amt = vendor?.charges?.packagingForwarding?.amount ?? 0
            const gst = vendor?.charges?.packagingForwarding?.gstRate ?? 0
            return amt ? `${amt} (${gst}%)` : 0
        },
    },
    { label: 'GST', value: 'gst' },
    { label: 'Net Amount', value: 'netAmount' },
]

const INITAL_VALUES: Omit<CSType, 'csType'> = {
    csNumber: '',
    csRemarks: '',
    rfqNumber: '',
    rfqDate: new Date(),
    vendors: [],
    items: [],
    leastValues: {
        basicAfterDiscount: { value: 0, vendorCode: '' },
        netAmount: { value: 0, vendorCode: '' },
    },
}

const tabs = ['CS', 'Negotiation']

const fmt = (v: any) => (v === null || v === undefined || v === '' ? '—' : v)

function asVendorNo(v: any) {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : null
}


const itemKey = (i: any) => String(i?._id || getIndentID(i) || `${i?.indentNumber || ''}:${i?.itemCode || ''}`)

/** ========= Readable UI Components ========= */

function VendorStrip({
    vendors,
    leastValues,
    stats,
    csType,
}: {
    vendors: CSVendor[]
    leastValues: any
    stats?: { itemsCount: number; netWins: number[]; basicWins: number[] }
    csType: string
}) {
    const totalsBestNet = asVendorNo(leastValues?.netAmount?.vendorCode)
    const totalsBestBasic = asVendorNo(leastValues?.basicAfterDiscount?.vendorCode)

    const isItemWise = csType === csTypes[0].value
    const itemsCount = stats?.itemsCount ?? 0

    return (
        <div className='mb-3'>
            {isItemWise && (
                <div className='mb-2 text-[11px] text-slate-600'>
                    <span className='font-semibold text-slate-700'>Note:</span> “Totals Best” badges are based on overall totals. Item-wise best vendors are
                    shown on each item card. Counts below show wins across items.
                </div>
            )}

            <div className='overflow-x-auto'>
                <div className='flex gap-2 min-w-max'>
                    {vendors?.map((v, idx) => {
                        const vNo = idx + 1
                        const isTotalsBestNet = totalsBestNet === vNo
                        const isTotalsBestBasic = totalsBestBasic === vNo

                        const netWins = stats?.netWins?.[idx] ?? 0
                        const basicWins = stats?.basicWins?.[idx] ?? 0

                        return (
                            <div
                                key={`vendor-card-${vNo}`}
                                className={classNames(
                                    // ✅ smaller cards
                                    'rounded-2xl border bg-white shadow-sm w-[240px] p-2.5',
                                    // ✅ only subtle highlighting; don't mislead in item-wise mode
                                    isTotalsBestNet ? 'border-emerald-300' : isTotalsBestBasic ? 'border-amber-300' : 'border-slate-200',
                                    !isItemWise && isTotalsBestNet ? 'ring-1 ring-emerald-100' : null,
                                )}>
                                <div className='flex items-start justify-between gap-2'>
                                    <div className='min-w-0'>
                                        <div className='text-[10px] font-semibold text-slate-500'>V{vNo}</div>
                                        <div className='text-[13px] font-bold text-slate-900 leading-tight truncate'>{fmt((v as any).name)}</div>
                                        <div className='text-[11px] text-slate-600 mt-0.5 truncate'>{fmt((v as any).vendorLocation)}</div>
                                    </div>

                                    {/* ✅ explicit: Totals badges */}
                                    <div className='flex flex-col gap-1 items-end'>
                                        {isTotalsBestNet && (
                                            <Tag color='green' className='text-[10px]'>
                                                Totals: Best Net
                                            </Tag>
                                        )}
                                        {isTotalsBestBasic && (
                                            <Tag color='amber' className='text-[10px]'>
                                                Totals: Best Basic
                                            </Tag>
                                        )}
                                    </div>
                                </div>

                                {/* ✅ per-item wins (only in item-wise mode) */}
                                {isItemWise && itemsCount > 0 && (
                                    <div className='mt-2 flex flex-wrap gap-1'>
                                        <span className='px-2 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-700'>
                                            Net wins: {netWins}/{itemsCount}
                                        </span>
                                        <span className='px-2 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-700'>
                                            Basic wins: {basicWins}/{itemsCount}
                                        </span>
                                    </div>
                                )}

                                <div className='mt-2 text-[11px] text-slate-700 space-y-1'>
                                    <div className='truncate'>
                                        <span className='text-slate-500'>Contact:</span> {fmt((v as any).contactPersonName)}
                                    </div>
                                    <div className='truncate'>
                                        <span className='text-slate-500'>Phone/Email:</span> {fmt((v as any).contactNumber || (v as any).contactEmail)}
                                    </div>
                                    <div className='truncate'>
                                        <span className='text-slate-500'>Quote:</span> {fmt((v as any).quotationNumber)}{' '}
                                        {(v as any).quotationDate ? `(${formatDate((v as any).quotationDate)})` : ''}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function VendorMetaComparison({ vendors }: { vendors: CSVendor[] }) {
    const rows: Array<{ label: string; get: (v: any) => React.ReactNode }> = [
        { label: 'Vendor Name', get: (v) => fmt(v.name) },
        {
            label: 'Vendor Contact',
            get: (v) => (
                <div className='text-xs'>
                    <div className='font-medium text-slate-900'>{fmt(v.contactPersonName)}</div>
                    <div className='text-slate-600'>{v.contactNumber || v.contactEmail ? `(${fmt(v.contactNumber || v.contactEmail)})` : '—'}</div>
                </div>
            ),
        },
        {
            label: 'Quotation No & Date',
            get: (v) => (
                <div className='text-xs'>
                    <div className='font-medium text-slate-900'>{fmt(v.quotationNumber)}</div>
                    <div className='text-slate-600'>{v.quotationDate ? `(${formatDate(v.quotationDate)})` : '—'}</div>
                </div>
            ),
        },
        {
            label: 'Quotation Revision Number',
            get: (v) => fmt(v.quotationRevisionNumber ?? v.quotationRevision ?? v.revisionNumber),
        },
    ]

    return (
        <div className='rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden'>
            <div className='px-4 py-3 border-b border-slate-100 flex items-center justify-between'>
                <div className='font-semibold text-slate-900 text-sm'>Vendor Details (Comparison)</div>
                <div className='text-xs text-slate-500'>{vendors?.length || 0} vendors</div>
            </div>

            <div className='overflow-x-auto'>
                <div className='min-w-[900px]'>
                    {rows.map((r, idx) => (
                        <div key={r.label} className={classNames('flex', idx % 2 ? 'bg-slate-50/60' : 'bg-white')}>
                            <div className='w-[260px] shrink-0 px-4 py-3 text-xs font-semibold text-slate-700 border-r border-slate-200'>{r.label}</div>
                            <div className='flex-1'>
                                <div className='grid grid-flow-col auto-cols-[minmax(200px,1fr)]'>
                                    {vendors.map((v: any, vIdx: number) => (
                                        <div key={`${r.label}-${vIdx}`} className='px-4 py-3 text-xs text-slate-800 border-r border-slate-100'>
                                            {r.get(v)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function ItemAccordionCard({
    item,
    vendorsCount,
    viewOnly,
    csType,
    isEditable,
    onOpenVendorModal,
    expand,
}: {
    item: any
    vendorsCount: number
    viewOnly: boolean
    csType: string
    isEditable: boolean
    onOpenVendorModal: () => void
    expand: boolean
}) {
    const [open, setOpen] = useState(false)

    useEffect(() => {
        setOpen(expand)
    }, [expand])

    const bestNetV = asVendorNo(item?.leastValues?.netAmount?.vendorCode)
    const bestBasicV = asVendorNo(item?.leastValues?.basicAfterDiscount?.vendorCode)

    return (
        <div className='rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden'>
            <button type='button' onClick={() => setOpen((p) => !p)} className='w-full text-left p-4 flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                    <div className='flex items-center gap-2'>
                        {!viewOnly && csType === csTypes[0].value && isEditable ? (
                            <span
                                className='inline-flex items-center gap-1 text-emerald-700 hover:underline'
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    onOpenVendorModal()
                                }}>
                                <IoMdArrowDropright size={18} className='text-emerald-600' />
                                <span className='font-semibold text-slate-900 truncate'>{fmt(item.itemDescription)}</span>
                            </span>
                        ) : (
                            <span className='font-semibold text-slate-900 truncate'>{fmt(item.itemDescription)}</span>
                        )}
                    </div>

                    <div className='mt-2 flex flex-wrap gap-2 text-xs text-slate-600'>
                        <span className='px-2 py-0.5 rounded-full bg-slate-100'>Indent: {fmt(item.indentNumber)}</span>
                        <span className='px-2 py-0.5 rounded-full bg-slate-100'>Item: {fmt(item.itemCode)}</span>
                        <span className='px-2 py-0.5 rounded-full bg-slate-100'>
                            Qty: {fmt(item.qty?.toFixed?.(3))} {fmt(item.unit)}
                        </span>
                    </div>
                </div>

                <div className='flex flex-col items-end gap-1 shrink-0'>
                    <div className='flex gap-1 flex-wrap justify-end'>
                        <Tag color='amber' className='text-[10px]'>
                            Best Basic: {bestBasicV ? `V${bestBasicV}` : '—'}
                        </Tag>
                        <Tag color='green' className='text-[10px]'>
                            Best Net: {bestNetV ? `V${bestNetV}` : '—'}
                        </Tag>
                    </div>
                    <div className='text-[11px] text-slate-500'>{open ? 'Hide' : 'Show'} comparison</div>
                </div>
            </button>

            {open && (
                <div className='px-4 pb-4'>
                    <div className='flex border border-slate-200 bg-slate-50 rounded-xl overflow-hidden'>
                        <div className='w-[240px] shrink-0 px-3 py-2 text-xs font-semibold text-slate-600'>Particular</div>

                        <div className='flex-1 overflow-x-auto'>
                            <div className='grid grid-flow-col auto-cols-[minmax(140px,1fr)]'>
                                {Array.from({ length: vendorsCount }).map((_, vIdx) => (
                                    <div key={`vh-${vIdx}`} className='px-3 py-2 text-center text-xs font-semibold text-slate-600'>
                                        V{vIdx + 1}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className='w-[120px] shrink-0 px-3 py-2 text-xs font-semibold text-slate-600 text-right'>L1 Value</div>
                        <div className='w-[70px] shrink-0 px-3 py-2 text-xs font-semibold text-slate-600 text-center'>L1</div>
                    </div>

                    <div className='mt-2 space-y-1'>
                        {particulars.map((p) => (
                            <div key={`p-${itemKey(item)}-${p.value}`} className='flex border border-slate-200 rounded-xl overflow-hidden bg-white'>
                                <div className='w-[240px] shrink-0 px-3 py-2 text-xs font-medium text-slate-700'>{p.label}</div>

                                <div className='flex-1 overflow-x-auto'>
                                    <div className='grid grid-flow-col auto-cols-[minmax(140px,1fr)]'>
                                        {item?.vendors?.map((v: any, vIdx: number) => {
                                            const isBest = item?.leastValues?.[p.value] && asVendorNo(item?.leastValues?.[p.value]?.vendorCode) === vIdx + 1
                                            return (
                                                <div
                                                    key={`pv-${itemKey(item)}-${p.value}-${vIdx}`}
                                                    className={classNames(
                                                        'px-3 py-2 text-xs text-right',
                                                        isBest ? 'bg-yellow-400/25 font-semibold text-slate-900' : 'text-slate-800',
                                                    )}>
                                                    {fmt(v?.[p.value])}
                                                    {p?.extra || ''}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className='w-[120px] shrink-0 px-3 py-2 text-xs text-right font-semibold'>{fmt(item?.leastValues?.[p.value]?.value)}</div>
                                <div className='w-[70px] shrink-0 px-3 py-2 text-xs text-center'>
                                    {asVendorNo(item?.leastValues?.[p.value]?.vendorCode) ? `V${asVendorNo(item?.leastValues?.[p.value]?.vendorCode)}` : '—'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function TotalsAccordionCard({ vendors, leastValues, expand }: { vendors: CSVendor[]; leastValues: any; expand: boolean }) {
    const [open, setOpen] = useState(false)

    useEffect(() => {
        setOpen(expand)
    }, [expand])

    return (
        <div className='rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden'>
            <button type='button' onClick={() => setOpen((p) => !p)} className='w-full text-left p-4 flex items-center justify-between'>
                <div className='font-semibold text-slate-900'>Totals Comparison</div>
                <div className='text-xs text-slate-500'>{open ? 'Hide' : 'Show'}</div>
            </button>

            {open && (
                <div className='px-4 pb-4'>
                    <div className='flex border border-slate-200 bg-slate-50 rounded-xl overflow-hidden'>
                        <div className='w-[240px] shrink-0 px-3 py-2 text-xs font-semibold text-slate-600'>Particular</div>

                        <div className='flex-1 overflow-x-auto'>
                            <div className='grid grid-flow-col auto-cols-[minmax(140px,1fr)]'>
                                {vendors.map((_, vIdx) => (
                                    <div key={`tvh-${vIdx}`} className='px-3 py-2 text-center text-xs font-semibold text-slate-600'>
                                        V{vIdx + 1}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className='w-[120px] shrink-0 px-3 py-2 text-xs font-semibold text-slate-600 text-right'>L1 Value</div>
                        <div className='w-[70px] shrink-0 px-3 py-2 text-xs font-semibold text-slate-600 text-center'>L1</div>
                    </div>

                    <div className='mt-2 space-y-1'>
                        {particularsTotal.map((p) => {
                            const l1Vendor = asVendorNo(leastValues?.[p.value]?.vendorCode)
                            const l1Value = leastValues?.[p.value]?.value

                            return (
                                <div key={`total-${p.value}`} className='flex border border-slate-200 rounded-xl overflow-hidden bg-white'>
                                    <div
                                        className={classNames(
                                            'w-[240px] shrink-0 px-3 py-2 text-xs font-medium',
                                            p.value === 'netAmount' ? 'bg-emerald-600 text-white' : 'text-slate-700',
                                        )}>
                                        {p.label}
                                    </div>

                                    <div className='flex-1 overflow-x-auto'>
                                        <div className='grid grid-flow-col auto-cols-[minmax(140px,1fr)]'>
                                            {vendors.map((v: any, vIdx: number) => {
                                                const isBest = l1Vendor === vIdx + 1
                                                const val = p.getValue?.(v) ?? v.total?.[p.value]
                                                return (
                                                    <div
                                                        key={`tv-${p.value}-${vIdx}`}
                                                        className={classNames(
                                                            'px-3 py-2 text-xs text-right',
                                                            isBest ? 'bg-yellow-400/25 font-semibold text-slate-900' : 'text-slate-800',
                                                        )}>
                                                        {fmt(val)}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <div className='w-[120px] shrink-0 px-3 py-2 text-xs text-right font-semibold'>{fmt(l1Value)}</div>
                                    <div className='w-[70px] shrink-0 px-3 py-2 text-xs text-center'>{l1Vendor ? `V${l1Vendor}` : '—'}</div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

function FooterComparison({ vendors }: { vendors: CSVendor[] }) {
    return (
        <div className='rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden'>
            <div className='px-4 py-3 border-b border-slate-100 flex items-center justify-between'>
                <div className='font-semibold text-slate-900 text-sm'>Freight / Remarks / Terms & Conditions</div>
                <div className='text-xs text-slate-500'>All rows included</div>
            </div>

            <div className='overflow-x-auto'>
                <div className='min-w-[900px]'>
                    <div className='flex bg-white'>
                        <div className='w-[260px] shrink-0 px-4 py-3 text-xs font-semibold text-slate-700 border-r border-slate-200'>Freight Type</div>
                        <div className='flex-1'>
                            <div className='grid grid-flow-col auto-cols-[minmax(200px,1fr)]'>
                                {vendors.map((v: any, vIdx: number) => (
                                    <div key={`freight-${vIdx}`} className='px-4 py-3 text-xs text-slate-800 border-r border-slate-100'>
                                        {fmt(v.freightType)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className='flex bg-slate-50/60'>
                        <div className='w-[260px] shrink-0 px-4 py-3 text-xs font-semibold text-slate-700 border-r border-slate-200'>Remarks</div>
                        <div className='flex-1'>
                            <div className='grid grid-flow-col auto-cols-[minmax(200px,1fr)]'>
                                {vendors.map((v: any, vIdx: number) => (
                                    <div key={`remarks-${vIdx}`} className='px-4 py-3 text-xs text-slate-800 border-r border-slate-100'>
                                        {fmt(v.remarks)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {termsConditionsOptions.map((tc, idx) => (
                        <div key={tc.value} className={classNames('flex', idx % 2 ? 'bg-white' : 'bg-slate-50/60')}>
                            <div className='w-[260px] shrink-0 px-4 py-3 text-xs font-semibold text-slate-700 border-r border-slate-200'>{tc.label}</div>
                            <div className='flex-1'>
                                <div className='grid grid-flow-col auto-cols-[minmax(200px,1fr)]'>
                                    {vendors.map((v: any, vIdx: number) => (
                                        <div key={`${tc.value}-${vIdx}`} className='px-4 py-3 text-xs text-slate-800 border-r border-slate-100'>
                                            {fmt(v?.termsConditions?.[tc.value])}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

/** ========= Main Page ========= */

export default function ComparativeStatement() {
    const query = useQuery()
    const rfqNumber = query.get('rfqNumber') || undefined
    const csNumber = query.get('csNumber') || undefined

    return <ComparativeStatementComponent viewOnly={false} rfqNumber={rfqNumber} csNumber={csNumber} />
}

export function ComparativeStatementComponent({ viewOnly, rfqNumber, csNumber }: { viewOnly: boolean; rfqNumber?: string; csNumber?: string }) {
    const navigate = useNavigate()

    const sheetRef = useRef<HTMLDivElement>(null)

    // ✅ react-to-print v3+ API
    const reactToPrintFn = useReactToPrint({
        contentRef: sheetRef,
        documentTitle: csNumber ? `CS_${csNumber}` : rfqNumber ? `CS_RFQ_${rfqNumber}` : 'Comparative_Statement',
    })

    const [isLoading, setIsLoading] = useState(false)
    const [selection, setSelection] = useState<CSType['selection']>([])

    const [vendorModalState, setVendorModalState] = useState<Pick<CSType['items'][0], 'indentNumber' | 'itemCode' | 'itemDescription' | 'qty'> | null>(null)

    const [csSheet, setCSSheet] = useState<Omit<CSType, 'csType'>>(INITAL_VALUES)
    const [csType, setCSType] = useState(csTypes[1].value)
    const [tab, setTab] = useState(tabs[0])

    // UI-only
    const [viewMode, setViewMode] = useState<'readable' | 'table'>('readable')
    const [itemQuery, setItemQuery] = useState('')
    const [expandAll, setExpandAll] = useState(false)

    const filteredItems = useMemo(() => {
        const q = itemQuery.trim().toLowerCase()
        if (!q) return (csSheet as any)?.items || []
        return ((csSheet as any)?.items || []).filter((i: any) => {
            return (
                (i.itemDescription || '').toLowerCase().includes(q) ||
                (i.itemCode || '').toLowerCase().includes(q) ||
                (i.indentNumber || '').toLowerCase().includes(q)
            )
        })
    }, [(csSheet as any)?.items, itemQuery])

    // ✅ per-item wins for vendor strip (prevents confusion)
    const vendorWinStats = useMemo(() => {
        const vendorsCount = ((csSheet as any)?.vendors?.length ?? 0) as number
        const items = ((csSheet as any)?.items ?? []) as any[]

        const netWins = Array(vendorsCount).fill(0)
        const basicWins = Array(vendorsCount).fill(0)

        for (const it of items) {
            const n = asVendorNo(it?.leastValues?.netAmount?.vendorCode)
            const b = asVendorNo(it?.leastValues?.basicAfterDiscount?.vendorCode)
            if (n) netWins[n - 1] += 1
            if (b) basicWins[b - 1] += 1
        }

        return { itemsCount: items.length, netWins, basicWins }
    }, [(csSheet as any)?.items, (csSheet as any)?.vendors?.length])

    useEffect(() => {
        if (!rfqNumber && !csNumber) return
        ;(async () => {
            setIsLoading(true)
            try {
                const response = await ApiService.fetchData<CSType>({
                    method: 'get',
                    url: '/cs' + (csNumber ? '/' : '/generate'),
                    params: { rfqNumber, csNumber },
                })

                if ((response.data as any)?.selection)
                    setSelection(
                        (response.data as any).selection?.map((i: any) => {
                            if (i.itemCode) {
                                const item = (response.data as any).items?.find((_i: any) => _i.itemCode === i.itemCode && _i.indentNumber === i.indentNumber)
                                i.itemDescription = item?.itemDescription
                            }
                            const vendor = (response.data as any).vendors.find((v: any) => v.vendorCode === i.vendorCode)
                            i.name = vendor?.name
                            i.vendorLocation = vendor?.vendorLocation
                            return i
                        }),
                    )

                setCSSheet(response.data as any)
                setCSType((response.data as any)?.csType)
            } catch (error: any) {
                const message = 'Failed to generate CS for this RFQ. Please contact support.'
                if (error?.response?.status === 500) showError(message)
                else if (error?.response?.status === 404) showError('Comparative Statement not found for this RFQ.')
                else showError(error?.response?.data?.message || message)
                navigate('/comparative-statements')
            }
            setIsLoading(false)
        })()
    }, [rfqNumber, csNumber])

    const handleSave = async (formValues: CSType) => {
        if (!formValues.csNumber) return showError('CS number is required.')
        if (!formValues.csDate) return showError('CS date is required.')
        if (!formValues.csValidity) return showError('Validity date is required.')
        if ((formValues as any)?.status === 1 && !selection?.length) return showError('Vendor selection is required.')

        setIsLoading(true)
        try {
            await ApiService.fetchData({
                method: csNumber ? 'put' : 'post',
                url: '/cs' + (csNumber ? '/' : '/create'),
                data: { ...(csSheet as any), ...(formValues as any), csType, selection },
            })

            showAlert(((formValues as any)?.status === 1 ? 'Submitted' : 'Saved') + ' comparative statement successfully.')
            navigate('/comparative-statements')
        } catch (error: any) {
            const message = 'Failed to save comparative statement. Please contact support.'
            if (error?.response?.status === 500) showError(message)
            else showError(error?.response?.data?.message || message)
        }
        setIsLoading(false)
    }

    const isEditable = !viewOnly && (csSheet as any)?.status !== 1

    // ✅ prevent "There is nothing to print"
    const canPrint = !isLoading && ((csSheet as any)?.items?.length ?? 0) > 0

    return (
        <div>
            <title>Comparative Statement</title>

            <Loading type='cover' loading={isLoading || (!rfqNumber && !csNumber)}>
                <CSForm
                    viewOnly={viewOnly}
                    isEditable={isEditable}
                    csSheet={csSheet}
                    csType={csType}
                    setCSType={setCSType}
                    handleSave={handleSave}
                    rfqDetails={{
                        rfqNumber: (csSheet as any)?.rfqNumber,
                        rfqDate: (csSheet as any)?.rfqDate ? new Date((csSheet as any).rfqDate) : null,
                        dueDate: (csSheet as any)?.rfqDueDate,
                    }}
                />

                <Tabs variant='underline' className='mt-4' value={tab} onChange={setTab}>
                    <TabList>
                        {(viewOnly ? tabs.slice(0, 1) : tabs).map((i) => (
                            <TabNav key={i} className='pt-0' value={i}>
                                <span className='text-xs'>{i}</span>
                            </TabNav>
                        ))}

                        <TabNav disabled className='p-0 opacity-100 cursor-auto flex-1 justify-end gap-1' value='actions'>
                            {tab === tabs[0] && (
                                <>
                                    <Button
                                        type='button'
                                        variant='twoTone'
                                        size='xs'
                                        icon={<IoPrintOutline />}
                                        disabled={!canPrint}
                                        onClick={() => reactToPrintFn()}>
                                        Print PDF
                                    </Button>
                                    <Button
                                        type='button'
                                        variant='twoTone'
                                        size='xs'
                                        color='green'
                                        icon={<RiFileExcel2Line />}
                                        disabled={!canPrint}
                                        onClick={() => exportTableToExcel(sheetRef)}>
                                        Export to Excel
                                    </Button>
                                </>
                            )}
                        </TabNav>
                    </TabList>

                    <TabContent value={tabs[0]}>
                        {/* UI Controls */}
                        <div className='flex flex-wrap items-center justify-between gap-2 mb-3'>
                            <div className='flex items-center gap-2'>
                                <Button type='button' size='xs' variant={viewMode === 'readable' ? 'solid' : 'twoTone'} onClick={() => setViewMode('readable')}>
                                    Readable
                                </Button>
                                <Button type='button' size='xs' variant={viewMode === 'table' ? 'solid' : 'twoTone'} onClick={() => setViewMode('table')}>
                                    Table
                                </Button>

                                {viewMode === 'readable' && (
                                    <Button type='button' size='xs' variant='twoTone' onClick={() => setExpandAll((p) => !p)}>
                                        {expandAll ? 'Collapse all' : 'Expand all'}
                                    </Button>
                                )}
                            </div>

                            <div className='w-[340px] max-w-full'>
                                <Input
                                    size='xs'
                                    placeholder='Search item (desc / code / indent)…'
                                    value={itemQuery}
                                    onChange={(e: any) => setItemQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Readable View */}
                        {viewMode === 'readable' && (
                            <div className='space-y-3'>
                                <VendorStrip
                                    vendors={((csSheet as any)?.vendors || []) as any}
                                    leastValues={(csSheet as any)?.leastValues}
                                    stats={vendorWinStats}
                                    csType={csType}
                                />

                                <VendorMetaComparison vendors={((csSheet as any)?.vendors || []) as any} />

                                <div className='grid grid-cols-1 gap-3'>
                                    {(filteredItems || []).map((i: any) => (
                                        <ItemAccordionCard
                                            key={itemKey(i)}
                                            item={i}
                                            vendorsCount={((csSheet as any)?.vendors?.length || 0) as any}
                                            viewOnly={viewOnly}
                                            csType={csType}
                                            isEditable={isEditable}
                                            expand={expandAll}
                                            onOpenVendorModal={() =>
                                                setVendorModalState({
                                                    indentNumber: i.indentNumber,
                                                    itemCode: i.itemCode,
                                                    itemDescription: i.itemDescription,
                                                    qty: i.qty,
                                                })
                                            }
                                        />
                                    ))}
                                </div>

                                <TotalsAccordionCard
                                    vendors={((csSheet as any)?.vendors || []) as any}
                                    leastValues={(csSheet as any)?.leastValues}
                                    expand={expandAll}
                                />
                                <FooterComparison vendors={((csSheet as any)?.vendors || []) as any} />
                            </div>
                        )}

                        {/* Printable Matrix Table — ALWAYS MOUNTED */}
                        <div
                            ref={sheetRef}
                            className={classNames(
                                'print:p-4',
                                viewMode === 'readable' ? 'fixed -left-[99999px] top-0 w-[210mm] bg-white print:static print:left-0 print:w-auto' : '',
                            )}>
                            <h4 className='hidden print:block print:mb-4'>
                                Comparative sheet for RFQ {(csSheet as any)?.rfqNumber} [{formatDate((csSheet as any)?.rfqDate)}]
                            </h4>

                            <Table compact className='small-table' containerClassName='overflow-auto whitespace-nowrap w-full relative'>
                                <THead className='sticky top-0'>
                                    <Tr>
                                        <Th>Item Description</Th>
                                        <Th>QTY</Th>
                                        <Th>Unit</Th>
                                        <Th>Particular</Th>
                                        {(csSheet as any)?.items?.[0]?.vendors?.map((_: any, idx: number) => (
                                            <Th key={'v:0:' + idx} className='text-center'>
                                                V{idx + 1}
                                            </Th>
                                        ))}
                                        <Th className='text-center'>L1 Value</Th>
                                        <Th className='text-center'>L1</Th>
                                    </Tr>
                                </THead>

                                <TBody>
                                    <Tr>
                                        <Td></Td>
                                        <Td></Td>
                                        <Td></Td>
                                        <Td>Vendor Name</Td>
                                        {(csSheet as any)?.vendors?.map((v: any, idx: number) => (
                                            <Td key={'v-name:' + idx} className='text-center'>
                                                {v.name}
                                            </Td>
                                        ))}
                                        <Td />
                                        <Td />
                                    </Tr>

                                    <Tr>
                                        <Td></Td>
                                        <Td></Td>
                                        <Td></Td>
                                        <Td>Vendor Contact</Td>
                                        {(csSheet as any)?.vendors?.map((v: any, idx: number) => (
                                            <Td key={'v-contact:' + idx} className='text-center'>
                                                {v.contactPersonName}
                                                {(v.contactNumber || v.contactEmail) && v.contactPersonName ? <br /> : null}({v.contactNumber || v.contactEmail}
                                                )
                                            </Td>
                                        ))}
                                        <Td />
                                        <Td />
                                    </Tr>

                                    <Tr>
                                        <Td></Td>
                                        <Td></Td>
                                        <Td></Td>
                                        <Td>Quotation No & Date</Td>
                                        {(csSheet as any)?.vendors?.map((v: any, idx: number) => (
                                            <Td key={'qn+qd:' + idx} className='text-center'>
                                                {v.quotationNumber} {v.quotationDate && <>({formatDate(v.quotationDate)})</>}
                                            </Td>
                                        ))}
                                        <Td />
                                        <Td />
                                    </Tr>

                                    <Tr>
                                        <Td></Td>
                                        <Td></Td>
                                        <Td></Td>
                                        <Td>Quotation Revision Number</Td>
                                        {(csSheet as any)?.vendors?.map((_v: any, idx: number) => <Td key={'qr:' + idx} className='text-center'></Td>)}
                                        <Td />
                                        <Td />
                                    </Tr>

                                    {(csSheet as any)?.items?.map((i: any) => (
                                         <React.Fragment key={itemKey(i)}>
                                            <Tr>
                                                <Td className='border-t border-t-slate-500'>
                                                    {!viewOnly && csType === csTypes[0].value && (csSheet as any)?.status !== 1 ? (
                                                        <button
                                                            type='button'
                                                            className='flex items-center'
                                                            onClick={() =>
                                                                setVendorModalState({
                                                                    indentNumber: i.indentNumber,
                                                                    itemCode: i.itemCode,
                                                                    itemDescription: i.itemDescription,
                                                                    qty: i.qty,
                                                                })
                                                            }>
                                                            <IoMdArrowDropright size={16} className='text-green-500' />
                                                            {i.itemDescription}
                                                        </button>
                                                    ) : (
                                                        i.itemDescription
                                                    )}
                                                </Td>
                                                <Td className='border-t border-t-slate-500 text-r'>{i.qty?.toFixed(3)}</Td>
                                                <Td className='border-t border-t-slate-500'>{i.unit}</Td>
                                                <Td className='border-t border-t-slate-500'>{particulars[0].label}</Td>
                                                {i.vendors?.map((v: any, idx: number) => (
                                                    <Td key={`v-prtclr:${i._id}:v-` + idx} className='border-t border-t-slate-500 text-center'>
                                                        {v[particulars[0].value]}
                                                        {particulars[0]?.extra}
                                                    </Td>
                                                ))}
                                                <Td className='border-t border-t-slate-500' />
                                                <Td className='border-t border-t-slate-500' />
                                            </Tr>

                                            {particulars.slice(1).map((p) => (
                                                <Tr key={`particular:${i._id}:${p.value}`}>
                                                    <Td />
                                                    <Td />
                                                    <Td />
                                                    <Td>{p.label}</Td>
                                                    {i.vendors?.map((v: any, vIdx: number) => (
                                                        <Td
                                                            key={`pclr:${i._id}:${p.value}:${vIdx}`}
                                                            className={classNames(
                                                                'text-center !pr-1',
                                                                i?.leastValues?.[p.value] && i?.leastValues?.[p.value]?.vendorCode === vIdx + 1
                                                                    ? 'bg-yellow-400/40 text-black'
                                                                    : null,
                                                            )}>
                                                            {v[p.value]}
                                                            {p?.extra}
                                                        </Td>
                                                    ))}
                                                    <Td className='text-center !pr-1'>{i.leastValues[p.value]?.value || null}</Td>
                                                    <Td className='text-center'>
                                                        {i.leastValues[p.value] ? 'V' : null}
                                                        {i.leastValues[p.value]?.vendorCode}
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </React.Fragment>
                                    ))}

                                    {particularsTotal.map((p: any, idx: number) => (
                                        <Tr key={'total:' + p.value} className={idx === particularsTotal.length - 1 ? 'bg-gray-200' : ''}>
                                            <Td className={classNames(idx === 0 ? 'border-t border-t-slate-500' : '', 'bg-white')} colSpan={3} />
                                            <Td
                                                className={classNames(
                                                    idx === 0 ? 'border-t border-t-slate-500' : null,
                                                    idx === particularsTotal.length - 1 ? 'bg-green-600 text-white' : null,
                                                )}>
                                                {p.label}
                                            </Td>
                                            {(csSheet as any)?.vendors?.map((v: any, vIdx: number) => (
                                                <Td
                                                    key={`total:${p.value}:${vIdx}`}
                                                    className={classNames(
                                                        'text-center !pr-1',
                                                        idx === 0 ? 'border-t border-t-slate-500' : null,
                                                        (csSheet as any)?.leastValues?.[p.value] &&
                                                            (csSheet as any)?.leastValues?.[p.value]?.vendorCode === vIdx + 1
                                                            ? 'bg-yellow-400/40 text-black'
                                                            : null,
                                                    )}>
                                                    {p.getValue?.(v) || v.total?.[p.value]}
                                                </Td>
                                            ))}
                                            <Td className={classNames('text-center !pr-1', idx === 0 ? 'border-t border-t-slate-500' : '')}>
                                                {(csSheet as any)?.leastValues?.[p.value]?.value || null}
                                            </Td>
                                            <Td className={classNames('text-center', idx === 0 ? 'border-t border-t-slate-500' : '')}>
                                                {(csSheet as any)?.leastValues?.[p.value] ? 'V' : null}
                                                {(csSheet as any)?.leastValues?.[p.value]?.vendorCode}
                                            </Td>
                                        </Tr>
                                    ))}

                                    <Tr>
                                        <Td colSpan={6 + ((csSheet as any)?.vendors?.length || 0)} className='h-5' />
                                    </Tr>

                                    <Tr>
                                        <Td colSpan={3} />
                                        <Td>Freight Type</Td>
                                        {(csSheet as any)?.vendors?.map((v: any, idx: number) => <Td key={'freightType' + idx}>{v.freightType || null}</Td>)}
                                        <Td colSpan={2} />
                                    </Tr>

                                    <Tr>
                                        <Td colSpan={3} />
                                        <Td>Remarks</Td>
                                        {(csSheet as any)?.vendors?.map((v: any, idx: number) => <Td key={'remarks' + idx}>{v.remarks || null}</Td>)}
                                        <Td colSpan={2} />
                                    </Tr>

                                    {termsConditionsOptions.map((tc) => (
                                        <Tr key={tc.value}>
                                            <Td colSpan={3} />
                                            <Td>{tc.label}</Td>
                                            {(csSheet as any)?.vendors?.map((v: any, idx: number) => <Td key={'tc' + idx}>{v.termsConditions?.[tc.value]}</Td>)}
                                            <Td colSpan={2} />
                                        </Tr>
                                    ))}
                                </TBody>
                            </Table>
                        </div>

                        {/* Selection tables */}
                        <div className='mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm p-3'>
                            <div className='flex items-center justify-between mb-2'>
                                <div className='font-semibold text-slate-900'>Selection</div>
                                <div className='text-xs text-slate-500'>{csType === csTypes[0].value ? 'Item-wise selection' : 'Single vendor selection'}</div>
                            </div>

                            {csType === csTypes[0].value ? (
                                <Table compact className='small-table'>
                                    <THead className='sticky top-0'>
                                        <Tr>
                                            <Th>#</Th>
                                            <Th>Item Description</Th>
                                            <Th>QTY</Th>
                                            <Th>Vendor Name</Th>
                                            <Th>Vendor Location</Th>
                                            <Th>Quotation Number</Th>
                                            <Th>Quotation Date</Th>
                                            <Th></Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {selection?.map((s: any, idx: number) => (
                                            <Tr key={`selection-${idx}`}>
                                                <Td>{idx + 1}</Td>
                                                <Td>{s.itemDescription}</Td>
                                                <Td>{s.qty}</Td>
                                                <Td>{s.name}</Td>
                                                <Td>{s.vendorLocation}</Td>
                                                <Td>{s.quotationNumber}</Td>
                                                <Td>{formatDate(s.quotationDate)}</Td>
                                                <Td>
                                                    {isEditable && (
                                                        <button
                                                            type='button'
                                                            className='text-red-600'
                                                            onClick={() => setSelection((prev) => (prev || []).slice(0, idx).concat((prev || []).slice(idx + 1)))}>
                                                            REMOVE
                                                        </button>
                                                    )}
                                                </Td>
                                            </Tr>
                                        ))}
                                    </TBody>
                                </Table>
                            ) : (
                                <Table compact className='small-table'>
                                    <THead className='sticky top-0'>
                                        <Tr>
                                            <Th>#</Th>
                                            <Th></Th>
                                            <Th>Vendor Name</Th>
                                            <Th>Vendor Location</Th>
                                            <Th>Quotation Number</Th>
                                            <Th>Quotation Date</Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {(csSheet as any)?.vendors
                                            ?.filter((v: any) => v?.quotationNumber)
                                            ?.map((v: any, idx: number) => (
                                                <Tr
                                                    key={`vendor-1-${idx}`}
                                                    className={isEditable ? 'cursor-pointer' : undefined}
                                                    onClick={() =>
                                                        isEditable
                                                            ? setSelection([
                                                                  {
                                                                      vendorCode: v.vendorCode,
                                                                      quotationNumber: v.quotationNumber,
                                                                      quotationDate: v.quotationDate,
                                                                  },
                                                              ])
                                                            : null
                                                    }>
                                                    <Td>{idx + 1}</Td>
                                                    <Td>
                                                        <input
                                                            disabled={!isEditable}
                                                            type='radio'
                                                            checked={(selection as any)?.[0]?.vendorCode === v.vendorCode}
                                                            onChange={() => null}
                                                        />
                                                    </Td>
                                                    <Td>{v.name}</Td>
                                                    <Td>{v.vendorLocation}</Td>
                                                    <Td>{v.quotationNumber}</Td>
                                                    <Td>{formatDate(v.quotationDate)}</Td>
                                                </Tr>
                                            ))}
                                    </TBody>
                                </Table>
                            )}
                        </div>

                        <VendorModal
                            isEditable={isEditable}
                            csType={csType}
                            selection={selection}
                            vendors={(csSheet as any)?.vendors}
                            vendorModalState={vendorModalState}
                            close={() => setVendorModalState(null)}
                            submit={(_s: any) => {
                                if (vendorModalState === null) return
                                setSelection((prev) => {
                                    const result = (prev || [])
                                        .filter((i: any) => getIndentID(i) !== getIndentID(vendorModalState))
                                        .concat(_s)
                                        .reduce<Record<string, CSType['selection']>>((obj, i: any) => {
                                            const id = getIndentID(i)
                                            return { ...obj, [id]: (obj?.[id] || []).concat(i) }
                                        }, {})

                                    return (csSheet as any)?.items?.map((i: any) => result[getIndentID(i)] || []).flat()
                                })
                                setVendorModalState(null)
                            }}
                        />
                    </TabContent>

                    {!viewOnly && (
                        <TabContent value={tabs[1]}>
                            <Negotiation csSheet={csSheet as any} />
                        </TabContent>
                    )}
                </Tabs>
            </Loading>
        </div>
    )
}

/** ========= CS Form ========= */

function CSForm({ viewOnly, isEditable, csType, setCSType, handleSave, rfqDetails, csSheet }: any) {
    const navigate = useNavigate()
    const [values, setValues] = useState<any>({})
    const authority = useAppSelector((state) => state.auth.user?.authority)
    const [deleteState, setDeleteState] = useState<number | null>()

    useEffect(() => {
        setValues((prev: any) => ({
            ...prev,
            ...rfqDetails,
            csType: csType,
            csNumber: csSheet?.csNumber,
            csRemarks: csSheet?.csRemarks,
            csDate: csSheet?.csDate ? new Date(csSheet?.csDate) : null,
            csValidity: csSheet?.csValidity ? new Date(csSheet?.csValidity) : null,
            remarks: Array.isArray(csSheet?.remarks) ? csSheet?.remarks?.[0] : csSheet?.remarks,
        }))
    }, [rfqDetails, csSheet, csType])

    const handleDelete = async () => {
        setDeleteState(2)
        try {
            const response = await ApiService.fetchData<{ success: true }>({
                method: 'delete',
                url: '/cs/' + csSheet?._id,
            })
            if ((response.data as any).success) {
                setDeleteState(null)
                showAlert(`CS ${csSheet?.csNumber} has been deleted successfully.`)
                navigate('/comparative-statements')
            }
        } catch (error: any) {
            setDeleteState(1)
            if (error?.response?.status === 500) showError('Failed to delete CS. Please contact support.')
            else if (error?.response?.data?.message) showError(error?.response?.data?.message)
            console.error(error)
        }
    }

    return (
        <div className='text-xs'>
            <ConfirmDialog
                isOpen={!!deleteState}
                type='danger'
                title='Delete CS'
                confirmText='Delete'
                cancelText='Cancel'
                confirmButtonColor='red'
                loading={deleteState === 2}
                closable={!false}
                onCancel={() => setDeleteState(null)}
                onConfirm={handleDelete}>
                Are you sure you want to delete this CS? This action cannot be undone.
            </ConfirmDialog>

            <div className='mb-4 flex justify-between'>
                <div className='flex gap-2 items-center'>
                    <h4>Comparative Statement Sheet</h4>
                    <span
                        className={classNames(
                            'px-2 font-semibold text-white h-full flex items-center rounded-md',
                            csSheet?.status === 1 ? 'bg-green-600' : 'bg-slate-600',
                        )}>
                        {csSheet?.status === 1 ? 'Authorized' : 'Initial'}
                    </span>
                </div>

                {!viewOnly && (
                    <div className='flex gap-2'>
                        {isEditable && (
                            <>
                                <Button variant='solid' size='xs' icon={<MdOutlineSave />} onClick={() => handleSave(values)}>
                                    Save
                                </Button>

                                {authority?.includes(PERMISSIONS.AUTHORIZE_CS) && (
                                    <>
                                        <hr className='h-full w-[1.5px] bg-slate-200' />
                                        <Button variant='solid' size='xs' icon={<MdOutlineDownloadDone />} onClick={() => handleSave({ ...values, status: 1 })}>
                                            Submit
                                        </Button>
                                    </>
                                )}
                            </>
                        )}

                        {csSheet?._id && (
                            <Button variant='solid' size='xs' color='red' icon={<MdDeleteOutline />} onClick={() => setDeleteState(1)}>
                                Delete
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <div className='rounded-2xl border border-slate-200 bg-white shadow-sm p-3'>
                <div className='flex flex-wrap gap-3'>
                    <div className='min-w-[220px]'>
                        <span className='block mb-2 text-xs'>CS Number</span>
                        <Input disabled type='text' name='csNumber' size='xs' value={values.csNumber} onChange={() => null} />
                    </div>

                    <div className='min-w-[180px]'>
                        <span className='block mb-2 text-xs'>CS Date</span>
                        <DatePicker disabled name='csDate' size='xs' inputFormat='DD/MM/YYYY' value={values.csDate || null} onChange={() => null} />
                    </div>

                    <div className='min-w-[210px]'>
                        <span className='block mb-2 text-xs'>Validity Date</span>
                        <DateTimepicker
                            disabled={!isEditable}
                            name='csValidity'
                            size='xs'
                            value={values.csValidity || null}
                            onChange={(newDate: Date | null) => setValues((prev: any) => ({ ...prev, csValidity: newDate }))}
                        />
                    </div>

                    <div className='min-w-[260px]'>
                        <span className='block mb-2 text-xs'>CS Type</span>
                        <Select
                            isDisabled={!isEditable}
                            size='xs'
                            name='csType'
                            className='w-56'
                            value={csTypes.find((i) => i.value === csType) || null}
                            options={csTypes.filter((i) => i.value !== csType)}
                            onChange={(newValue) => setCSType(newValue?.value)}
                        />
                    </div>
                </div>

                <div className='flex flex-wrap gap-3 mt-3'>
                    <div className='min-w-[220px]'>
                        <span className='block mb-2 text-xs'>RFQ Number</span>
                        <Input disabled type='text' name='rfqNumber' size='xs' value={values.rfqNumber} onChange={() => null} />
                    </div>

                    <div className='min-w-[180px]'>
                        <span className='block mb-2 text-xs'>RFQ Date</span>
                        <DatePicker disabled inputFormat='DD/MM/YYYY' name='rfqDate' size='xs' value={values.rfqDate || null} onChange={() => null} />
                    </div>

                    <div className='flex-1 min-w-[280px]'>
                        <span className='block mb-2 text-xs'>Remarks</span>
                        <Input
                            disabled={!isEditable}
                            textArea
                            name='csRemarks'
                            size='xs'
                            className='!h-15 min-h-auto resize-none'
                            value={values.csRemarks || null}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setValues((prev: any) => ({ ...prev, csRemarks: e.target.value }))}
                        />
                    </div>
                </div>

                <div className='mt-3 text-xs'>
                    <span className='inline-block font-bold'>
                        {csSheet.vendors?.filter((i: any) => i.quotationNumber).length} / {csSheet.vendors?.length} : (Submitted Quotation / Total Vendors )
                    </span>
                    <br />
                    <span className='inline-block mt-0.5 mb-1 text-slate-600'>RFQ due till: {formatDateTime(rfqDetails.dueDate)}</span>
                </div>
            </div>
        </div>
    )
}

/** ========= Vendor Modal ========= */

const VendorModal = ({ isEditable, vendors, csType, vendorModalState, close, submit, selection: _prevSelection }: any) => {
    const [selection, setSelection] = useState<any[]>([])

    useEffect(() => {
        if (!vendorModalState) return setSelection([])
        setSelection(_prevSelection?.filter((i: any) => getIndentID(i) === getIndentID(vendorModalState))?.map((i: any) => ({ ...i, checked: true })) || [])
    }, [vendorModalState, _prevSelection])

    const usedQty = selection?.reduce((sum, _i) => sum + (+_i?.qty || 0), 0)

    return (
        <Dialog isOpen={!!vendorModalState} width={window.innerWidth * 0.8} closable={false}>
            <h4 className='mb-4'>Select Vendors ({vendorModalState?.itemCode})</h4>
            <Table compact className='text-xs'>
                <THead className='sticky top-0'>
                    <Tr>
                        <Th>#</Th>
                        <Th></Th>
                        <Th>Vendor Name</Th>
                        <Th>Vendor Location</Th>
                        <Th>Quotation Number</Th>
                        <Th>Quotation Date</Th>
                        <Th>Qty</Th>
                    </Tr>
                </THead>

                <TBody>
                    {vendors
                        ?.filter((v: any) => v?.quotationNumber)
                        ?.map((v: any, idx: number) => {
                            const vendorQty = +selection?.find((i: any) => i.vendorCode === v.vendorCode)?.qty || 0

                            return (
                                <Tr key={`vendor-2-${idx}`}>
                                    <Td>{idx + 1}</Td>
                                    <Td>
                                        <input
                                            disabled={!isEditable}
                                            type='checkbox'
                                            checked={
                                                selection?.find(
                                                    (i: any) =>
                                                        (csType === csTypes[0].value ? i.itemCode === vendorModalState?.itemCode : true) &&
                                                        i.vendorCode === v.vendorCode,
                                                )?.checked
                                            }
                                            onChange={(e) =>
                                                setSelection((prev: any[]) =>
                                                    e.target.checked
                                                        ? prev.concat([
                                                              {
                                                                  ...vendorModalState,
                                                                  ...v,
                                                                  vendorCode: v.vendorCode,
                                                                  checked: e.target.checked,
                                                                  qty: e.target.checked ? Math.max(+vendorModalState?.qty - usedQty, 0).toFixed(3) : undefined,
                                                              },
                                                          ])
                                                        : prev.filter((i: any) => i.vendorCode !== v.vendorCode && i.itemCode === vendorModalState?.itemCode),
                                                )
                                            }
                                        />
                                    </Td>
                                    <Td>{v.name}</Td>
                                    <Td>{v.vendorLocation}</Td>
                                    <Td>{v.quotationNumber}</Td>
                                    <Td>{formatDate(v.quotationDate)}</Td>
                                    <Td>
                                        <Input
                                            disabled={!isEditable}
                                            className='p-1 w-16'
                                            type='number'
                                            size='xs'
                                            value={selection?.find((i: any) => i.vendorCode === v.vendorCode)?.qty}
                                            onChange={(e: any) =>
                                                usedQty - vendorQty + +e.target.value > +vendorModalState?.qty || e.target.value.split('.')?.[1]?.length > 3
                                                    ? null
                                                    : setSelection((prev: any[]) =>
                                                          prev.map((i: any) => (i.vendorCode === v.vendorCode ? { ...i, qty: e.target.value } : i)),
                                                      )
                                            }
                                        />
                                    </Td>
                                </Tr>
                            )
                        })}
                </TBody>

                <TFoot>
                    <Tr>
                        <Td colSpan={7}>
                            {isEditable && (
                                <div className='flex justify-end gap-2'>
                                    <Button variant='twoTone' size='sm' className='w-20' onClick={close}>
                                        Cancel
                                    </Button>
                                    <Button variant='solid' size='sm' className='w-20' onClick={() => submit(selection)}>
                                        Save
                                    </Button>
                                </div>
                            )}
                        </Td>
                    </Tr>
                </TFoot>
            </Table>
        </Dialog>
    )
}
