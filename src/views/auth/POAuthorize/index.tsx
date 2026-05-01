import { Button, Dialog, Input, Spinner, Table, Tag } from '@/components/ui'
import React, { useEffect, useMemo, useState } from 'react'
import Menu from '@/components/ui/Menu'
import Tr from '@/components/ui/Table/Tr'
import Td from '@/components/ui/Table/Td'
import TBody from '@/components/ui/Table/TBody'
import { termsConditionsOptions } from '@/utils/data'
import { IndentType, POType, VendorType } from '@/@types/app'
import { formatDateTime, formatTimeDifference, formatDate } from '@/utils/formatDate'
import { AttachmentsTable } from '@/components/app/Attachments'
import useQuery from '@/utils/hooks/useQuery'
import ApiService from '@/services/ApiService'
import { showAlert, showError, showWarning } from '@/utils/hoc/showAlert'
import { useAppSelector } from '@/store'
import { Link } from 'react-router-dom'
import useAuth from '@/utils/hooks/useAuth'
import { ConfirmDialog } from '@/components/shared'
import CSModal from '@/components/app/CSModal'

type _POType = Omit<POType, 'authorize'> & {
    authorize: (POType['authorize'][0] & {
        name: string
        username: string
    })[]
}

type ItemPOHistoryState = {
    open: boolean
    loading: boolean
    showAll: boolean
    itemCode: string
    itemDescription: string
    rows: any[]
}

function getUserCompanyName(u: any) {
    return String(u?.company?.name ?? u?.company ?? '').trim()
}

function getUserCompanyMeta(u: any): { label?: string; gstin?: string; pan?: string; division?: string } {
    const companyObj: any = u?.company
    return {
        label: String(companyObj?.label ?? companyObj?.name ?? companyObj ?? '').trim(),
        gstin: String(companyObj?.gstin ?? '').trim(),
        pan: String(companyObj?.pan ?? '').trim(),
        division: String(companyObj?.division ?? '').trim(),
    }
}

function normalizePOListRows(raw: any): any[] {
    const data = raw?.data ?? raw
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.data)) return data.data
    if (Array.isArray(data?.rows)) return data.rows
    if (Array.isArray(data?.list)) return data.list
    if (Array.isArray(data?.result)) return data.result
    if (Array.isArray(data?.records)) return data.records
    return []
}

function getItemFromPO(row: any, itemCode: string) {
    const items = Array.isArray(row?.items) ? row.items : []
    return items.find((i: any) => String(i?.itemCode || '').trim() === String(itemCode || '').trim()) || row?.item || null
}

function toFixedSafe(value: any, digits = 2) {
    const n = Number(value)
    return Number.isFinite(n) ? n.toFixed(digits) : '-'
}

function valueOrDash(value: any) {
    const v = String(value ?? '').trim()
    return v || '-'
}

function getPOStatusLabel(row: any) {
    if (typeof row?.status === 'string') return row.status
    if (row?.approvalStatus === 1) return 'Approved'
    if (row?.approvalStatus === 2) return 'Rejected'
    if (row?.approvalStatus === 0) return 'Pending'
    if (row?.status === 1) return 'Approved'
    if (row?.status === 0) return 'Pending'
    return valueOrDash(row?.status)
}

function getAuthorizationInfo(row: any) {
    const authorizeList = Array.isArray(row?.authorize) ? row.authorize : []
    const approvedAuth = authorizeList.find((i: any) => i?.approvalStatus === 1 && i?.changedOn)
    const rejectedAuth = authorizeList.find((i: any) => i?.approvalStatus === 2 && i?.changedOn)
    const pendingAuth = authorizeList.find((i: any) => i?.approvalStatus === 0)

    const finalAuth = approvedAuth || rejectedAuth || pendingAuth || authorizeList[authorizeList.length - 1] || {}

    return {
        authorizedBy: row?.authorizedBy || approvedAuth?.name || rejectedAuth?.name || finalAuth?.name || '-',
        authorizedAt: row?.authorizedAt || approvedAuth?.changedOn || rejectedAuth?.changedOn || finalAuth?.changedOn || null,
        assignedOn: finalAuth?.assignOn || null,
        comment: finalAuth?.comment || '',
        approvalStatus: finalAuth?.approvalStatus,
    }
}

function getStatusClass(row: any) {
    const status = getPOStatusLabel(row).toLowerCase()
    if (status.includes('approved')) return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    if (status.includes('rejected')) return 'bg-red-50 text-red-700 border border-red-200'
    return 'bg-amber-50 text-amber-700 border border-amber-200'
}

function getTaxAmount(poItem: any, field: 'cgst' | 'sgst' | 'igst') {
    const direct = poItem?.amount?.[field]
    if (Number.isFinite(Number(direct))) return Number(direct)

    const tax = Array.isArray(poItem?.taxDetails) ? poItem.taxDetails.find((i: any) => String(i?.taxField || '').toLowerCase() === field) : null

    return Number(tax?.chargeAmount || 0)
}

function getTaxRate(poItem: any, field: 'cgst' | 'sgst' | 'igst') {
    const tax = Array.isArray(poItem?.taxDetails) ? poItem.taxDetails.find((i: any) => String(i?.taxField || '').toLowerCase() === field) : null

    return Number.isFinite(Number(tax?.chargeValue)) ? Number(tax.chargeValue) : 0
}


function toNumberSafe(value: any) {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
}

function formatMoney(value: any) {
    const n = Number(value)
    if (!Number.isFinite(n)) return '-'
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatPlainAmount(value: any) {
    const n = Number(value)
    if (!Number.isFinite(n)) return '-'
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getVendorProfile(vendor: any) {
    return vendor?.vendorProfile || {}
}

function getVendorContactPersons(vendor: any) {
    const profile = getVendorProfile(vendor)
    const cp = profile?.contactPerson ?? vendor?.contactPerson
    if (Array.isArray(cp)) return cp
    if (cp) return [cp]
    return []
}

function getVendorDisplayName(vendor: any, po?: any) {
    const profile = getVendorProfile(vendor)
    return valueOrDash(profile?.name || profile?.orgName1 || vendor?.name || po?.vendorName)
}

function getVendorAddress(vendor: any, po?: any) {
    const profile = getVendorProfile(vendor)
    const company = vendor?.company || {}
    const parts = [
        profile?.streetHouseNumber,
        profile?.street,
        profile?.street2,
        profile?.street3,
        profile?.street4,
        profile?.street5,
        profile?.city,
        profile?.district,
        profile?.region,
        profile?.postalCode,
        profile?.countryKey,
    ].filter((i) => String(i ?? '').trim())

    if (parts.length) return parts.join(', ')

    const companyParts = [company?.addressLine1, company?.addressLine2, company?.city, company?.state, company?.pincode].filter((i) => String(i ?? '').trim())
    if (companyParts.length) return companyParts.join(', ')

    return valueOrDash(po?.vendorLocation)
}

function getVendorGSTIN(vendor: any) {
    const profile = getVendorProfile(vendor)
    return valueOrDash(profile?.gstin || vendor?.gstin || vendor?.company?.gstin)
}

function getVendorPAN(vendor: any) {
    const profile = getVendorProfile(vendor)
    return valueOrDash(profile?.panNumber || vendor?.panNumber || vendor?.company?.pan)
}

function getVendorMSME(vendor: any) {
    const profile = getVendorProfile(vendor)
    return valueOrDash(profile?.msme || vendor?.msme)
}

function getVendorEmail(vendor: any, contacts: any[]) {
    return valueOrDash(contacts?.map((i: any) => i.email).filter(Boolean).join(', ') || vendor?.email || vendor?.company?.email)
}

function getVendorPhone(vendor: any, contacts: any[]) {
    return valueOrDash(
        contacts
            ?.map((i: any) => i.fullPhoneNumber || i.callerPhoneNumber || i.phone)
            .filter(Boolean)
            .join(', ') || vendor?.company?.phone,
    )
}

function getChargeAmount(charge: any) {
    return charge?.chargeAmount ?? charge?.amount ?? charge?.value ?? charge?.total ?? 0
}

function getChargeLabel(label: string, charge: any) {
    if (!charge) return label
    const name = charge?.chargeName || charge?.name || label
    const value = charge?.chargeValue ?? charge?.value
    const nature = charge?.nature || charge?.chargeType
    if (value !== undefined && value !== null && value !== '') return `${name} (${value}${String(nature).toLowerCase().includes('percent') ? '%' : ''})`
    return name
}

function AmountSummary({ po }: { po: any }) {
    const amount = po?.amount || {}
    const discount = toNumberSafe(amount.discount)
    const otherCharges = toNumberSafe(amount.otherCharges)
    const igst = toNumberSafe(amount.igst)
    const cgst = toNumberSafe(amount.cgst)
    const sgst = toNumberSafe(amount.sgst)
    const totalTax = Number.isFinite(Number(amount.totalTax)) ? toNumberSafe(amount.totalTax) : igst + cgst + sgst
    const taxable = Math.max(0, toNumberSafe(amount.basic) - discount)
    const taxDetails = Array.isArray(po?.taxDetails) ? po.taxDetails : []
    const charges = po?.charges || {}
    const chargeRows = [
        charges?.otherCharges ? { label: getChargeLabel('Other Charges', charges.otherCharges), value: getChargeAmount(charges.otherCharges) } : null,
        charges?.packagingForwarding ? { label: getChargeLabel('Packaging & Forwarding', charges.packagingForwarding), value: getChargeAmount(charges.packagingForwarding) } : null,
    ].filter(Boolean) as Array<{ label: string; value: any }>

    const rows = [
        { label: 'Basic Amount', value: amount.basic, strong: false },
        { label: 'Discount', value: discount, strong: false },
        { label: 'Taxable Amount', value: taxable, strong: false },
        { label: 'IGST', value: igst, strong: false },
        { label: 'CGST', value: cgst, strong: false },
        { label: 'SGST', value: sgst, strong: false },
        { label: 'Total Tax', value: totalTax, strong: false },
        { label: 'Other Charges', value: otherCharges, strong: false },
        ...chargeRows.map((i) => ({ label: i.label, value: i.value, strong: false })),
        ...taxDetails.map((i: any) => ({ label: i?.chargeName || i?.taxField || 'Tax/Charge', value: i?.chargeAmount, strong: false })),
        { label: 'Grand Total', value: amount.total, strong: true },
    ]

    return (
        <div className='grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_460px] xl:grid-cols-[minmax(0,1fr)_520px]'>
            <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
                <div className='rounded-xl border border-slate-200 bg-slate-50 p-3'>
                    <div className='text-[11px] font-semibold text-slate-500'>Basic</div>
                    <div className='mt-1 text-sm font-extrabold text-slate-900'>{formatMoney(amount.basic)}</div>
                </div>
                <div className='rounded-xl border border-slate-200 bg-slate-50 p-3'>
                    <div className='text-[11px] font-semibold text-slate-500'>Discount</div>
                    <div className='mt-1 text-sm font-extrabold text-slate-900'>{formatMoney(discount)}</div>
                </div>
                <div className='rounded-xl border border-slate-200 bg-slate-50 p-3'>
                    <div className='text-[11px] font-semibold text-slate-500'>Tax</div>
                    <div className='mt-1 text-sm font-extrabold text-slate-900'>{formatMoney(totalTax)}</div>
                </div>
                <div className='rounded-xl border border-blue-200 bg-blue-50 p-3'>
                    <div className='text-[11px] font-semibold text-blue-600'>Grand Total</div>
                    <div className='mt-1 text-sm font-extrabold text-blue-900'>{formatMoney(amount.total)}</div>
                </div>
            </div>

            <div className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'>
                <table className='w-full border-collapse text-xs'>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.label} className={row.strong ? 'bg-slate-50' : ''}>
                                <td className={`border-b border-r border-slate-100 px-3 py-2 ${row.strong ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'}`}>
                                    {row.label}
                                </td>
                                <td className={`border-b border-slate-100 px-3 py-2 text-right ${row.strong ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-800'}`}>
                                    {formatPlainAmount(row.value)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function AmountMiniRows({ row, poItem }: { row: any; poItem: any }) {
    const amount = row?.amount || {}
    const itemAmount = poItem?.amount || {}
    const discount = toNumberSafe(amount.discount)
    const otherCharges = toNumberSafe(amount.otherCharges)
    const cgstAmount = getTaxAmount(poItem, 'cgst')
    const sgstAmount = getTaxAmount(poItem, 'sgst')
    const igstAmount = getTaxAmount(poItem, 'igst')

    return (
        <div className='grid grid-cols-2 gap-1 text-[11px]'>
            <div className='rounded bg-slate-50 px-2 py-1'>Basic: <b>{formatPlainAmount(itemAmount.taxable ?? itemAmount.basic ?? amount.basic)}</b></div>
            <div className='rounded bg-slate-50 px-2 py-1'>Discount: <b>{formatPlainAmount(discount)}</b></div>
            <div className='rounded bg-slate-50 px-2 py-1'>IGST: <b>{formatPlainAmount(igstAmount || amount.igst)}</b></div>
            <div className='rounded bg-slate-50 px-2 py-1'>CGST: <b>{formatPlainAmount(cgstAmount || amount.cgst)}</b></div>
            <div className='rounded bg-slate-50 px-2 py-1'>SGST: <b>{formatPlainAmount(sgstAmount || amount.sgst)}</b></div>
            <div className='rounded bg-slate-50 px-2 py-1'>Other: <b>{formatPlainAmount(otherCharges)}</b></div>
            <div className='col-span-2 rounded bg-blue-50 px-2 py-1 text-blue-900'>Total: <b>{formatMoney(itemAmount.total ?? amount.total)}</b></div>
        </div>
    )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className='min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
            <div className='mb-3 flex items-center gap-2 border-b border-slate-100 pb-2'>
                <span className='h-2 w-2 rounded-full bg-[#DB7744]' />
                <h3 className='text-sm font-extrabold text-[#DB7744]'>{title}</h3>
            </div>
            <div className='space-y-2'>{children}</div>
        </section>
    )
}

function DetailRow({ label, children, valueClassName = '' }: { label: string; children: React.ReactNode; valueClassName?: string }) {
    return (
        <div className='grid grid-cols-[125px_minmax(0,1fr)] gap-2 text-xs leading-5 sm:grid-cols-[145px_minmax(0,1fr)]'>
            <div className='font-bold text-slate-700'>{label}</div>
            <div className={`min-w-0 break-words text-slate-900 ${valueClassName}`}>{children || '-'}</div>
        </div>
    )
}

function SectionContent({ children }: { children: React.ReactNode }) {
    return <div className='rounded-b-xl border-x border-b border-slate-200 bg-white p-3 sm:p-4'>{children}</div>
}

function StatusBadge({ row }: { row: any }) {
    return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${getStatusClass(row)}`}>{getPOStatusLabel(row)}</span>
}

export default function POAuthorize() {
    const { signOut } = useAuth()
    const user = useAppSelector((state) => state.auth.user)
    const [po, setPO] = useState<_POType>()
    const [vendor, setVendor] = useState<VendorType | undefined>()
    const [indents, setIndents] = useState<IndentType[]>([])
    const [signOutPrompt, setSignOutPrompt] = useState(false)
    const [data, setData] = useState<{
        user?: string
        assignOn?: Date | string | null
        changedOn?: Date | string | null
        approvalStatus?: 0 | 1 | 2
        comment?: string
        nextApprover?: string
    }>()

    const query = useQuery()
    const poNumber = query.get('poNumber')

    const myCompanyName = useMemo(() => getUserCompanyName(user), [user])
    const myCompanyMeta = useMemo(() => getUserCompanyMeta(user), [user])

    const vendorProfile = useMemo(() => getVendorProfile(vendor), [vendor])

    const vendorContactPersons = useMemo(() => getVendorContactPersons(vendor), [vendor])

    const vendorAddress = useMemo(() => getVendorAddress(vendor, po), [vendor, po])

    useEffect(() => {
        if (!poNumber || !user?.username) return
        ;(async () => {
            try {
                const poResponse = await ApiService.fetchData<_POType>({
                    method: 'get',
                    url: '/po',
                    params: {
                        poNumber,
                        attachAuthUsers: true,
                    },
                })

                const userIdx = poResponse.data?.authorize?.findIndex((i) => i.username === user?.username)

                setData({
                    ...poResponse.data?.authorize?.[userIdx],
                    nextApprover: poResponse.data?.authorize?.[userIdx + 1]?.name,
                })
                setPO(poResponse.data)

                if (poResponse.data.vendorCode) {
                    const vendorResponse = await ApiService.fetchData<VendorType[]>({
                        method: 'get',
                        url: '/vendor/list',
                        params: {
                            vendorCode: poResponse.data.vendorCode,
                        },
                    })

                    setVendor(vendorResponse.data?.[0])
                }

                if (poResponse.data.items?.length) {
                    const indentNumbers: string[] = []
                    const itemCodes: string[] = []
                    for (const i of poResponse.data.items) {
                        indentNumbers.push(i.indentNumber)
                        itemCodes.push(i.itemCode)
                    }
                    if (indentNumbers.length) {
                        const indentsResponse = await ApiService.fetchData<IndentType[]>({
                            method: 'post',
                            url: '/indent',
                            data: {
                                indentNumber: indentNumbers,
                                itemCode: itemCodes,
                            },
                        })
                        setIndents(indentsResponse.data)
                    }
                }
            } catch (error) {
                console.error(error)
            }
        })()
    }, [poNumber, user])

    const handlePOAction = async (approvalStatus: 1 | 2) => {
        if (!po?.poNumber) return
        if (approvalStatus === 2 && !data?.comment?.trim()?.length) {
            return showError('Comments must be provided for PO rejection.')
        }
        const action = approvalStatus === 1 ? 'approve' : 'reject'

        try {
            const response = await ApiService.fetchData<{ success: boolean; errorMessage?: string; authorize: POType['authorize'][0] }>({
                method: 'patch',
                url: `/po/authorize`,
                data: {
                    ...data,
                    id: po?._id,
                    approvalStatus,
                },
            })
            if (response?.data?.errorMessage) showWarning(response?.data?.errorMessage)
            else showAlert(`PO ${action}${action?.endsWith('e') ? 'd' : 'ed'} successfully.`)
            setData(response.data.authorize)
        } catch (error) {
            console.error(error)
            showError(`Failed to ${action} PO.`)
        }
    }

    return (
        <>
            <ConfirmDialog
                isOpen={signOutPrompt}
                closable={false}
                type='danger'
                title='Sign Out'
                confirmText='Sign out'
                cancelText='Cancel'
                confirmButtonColor='red'
                onCancel={() => setSignOutPrompt(false)}
                onConfirm={signOut}>
                Are you sure you want to sign out? You will be redirected to sign in page.
            </ConfirmDialog>

            <div className='fixed left-0 top-0 z-30 h-screen w-screen overflow-auto bg-slate-100 text-xs text-slate-900'>
                <header className='sticky top-0 z-30 border-b border-blue-700 bg-blue-600 px-3 py-3 shadow-sm sm:px-6'>
                    <div className='mx-auto flex w-full max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                        <div className='min-w-0'>
                            <h1 className='text-lg font-bold text-white sm:text-xl'>PO Authorize</h1>
                            <div className='mt-1 flex flex-wrap items-center gap-2 text-[11px] text-blue-50'>
                                <span>PO No: {po?.poNumber || poNumber || '-'}</span>
                                <span className='hidden sm:inline'>•</span>
                                <span>{formatDate(po?.poDate as string)}</span>
                                {data?.nextApprover ? (
                                    <>
                                        <span className='hidden sm:inline'>•</span>
                                        <span>Next Approver: {data.nextApprover}</span>
                                    </>
                                ) : null}
                            </div>
                        </div>

                        <div className='flex shrink-0 flex-wrap gap-2'>
                            <Link to={'/dashboard'}>
                                <Button size='xs' variant='twoTone'>
                                    Dashboard
                                </Button>
                            </Link>
                            <Button size='xs' variant='twoTone' onClick={() => setSignOutPrompt(true)}>
                                Logout
                            </Button>
                        </div>
                    </div>
                </header>

                <main className='mx-auto w-full max-w-[1600px] px-3 pb-28 pt-4 sm:px-6'>
                    <section className='mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4'>
                        <div className='flex flex-col gap-3 lg:flex-row lg:items-start'>
                            <div className='min-w-0 flex-1'>
                                <div className='mb-1 flex flex-wrap items-center justify-between gap-2'>
                                    <label className='font-bold text-slate-700'>Comment</label>
                                    {po?.shippingAccount?.priority ? <Tag className='border-2 border-red-500 bg-red-500 text-white'>{po.shippingAccount.priority}</Tag> : null}
                                </div>
                                <Input
                                    textArea
                                    disabled={!!data?.changedOn}
                                    className='min-h-auto w-full rounded-xl border-slate-200'
                                    rows={3}
                                    value={data?.comment || ''}
                                    onChange={(e) => setData((prev) => ({ ...prev, comment: e.target.value }))}
                                />
                            </div>
                        </div>
                    </section>

                    <div className='grid grid-cols-1 gap-4 xl:grid-cols-3'>
                        <InfoCard title='Company'>
                            <div className='mb-3 rounded-xl bg-slate-50 p-3'>
                                <div className='font-bold text-slate-900'>[0] ({formatDate(po?.poDate as string)})</div>
                                <div className='mt-1 break-words text-slate-700'>
                                    {myCompanyMeta?.label || myCompanyName || po?.company || '—'}
                                    {myCompanyMeta?.division ? ` (${myCompanyMeta.division})` : ''}
                                </div>
                            </div>
                            <DetailRow label='Portal PO No.'>{po?.poNumber}</DetailRow>
                            <DetailRow label='GSTIN NO.'>{myCompanyMeta?.gstin || (po as any)?.gstin || '—'}</DetailRow>
                            <DetailRow label='PAN NO.'>{myCompanyMeta?.pan || (po as any)?.pan || '—'}</DetailRow>
                            <DetailRow label='Contact Detail'>{po?.contactPersonName}</DetailRow>
                            <DetailRow label='Ref. Doc Type'>{po?.refDocumentType}</DetailRow>
                            <DetailRow label='Ref. Doc No.'>
                                <div className='flex flex-wrap items-center gap-2'>
                                    <span>{po?.refDocumentNumber || '-'}</span>
                                    {po?.refCSNumber ? <CSModal csNumber={po.refCSNumber} /> : null}
                                </div>
                            </DetailRow>
                            <DetailRow label='PO Validity'>{formatDate(po?.validityDate as string)}</DetailRow>
                            <DetailRow label='PO Remarks'>{po?.remarks}</DetailRow>
                        </InfoCard>

                        <InfoCard title='Vendor'>
                            <div className='mb-3 rounded-xl bg-slate-50 p-3'>
                                <div className='font-bold text-slate-900'>{getVendorDisplayName(vendor, po)}</div>
                                <div className='mt-1 break-words text-slate-700'>{vendorAddress}</div>
                            </div>
                            <DetailRow label='Vendor Code'>{vendorProfile?.vendorCode || po?.vendorCode}</DetailRow>
                            <DetailRow label='GSTIN No'>{getVendorGSTIN(vendor)}</DetailRow>
                            <DetailRow label='PAN No.'>{getVendorPAN(vendor)}</DetailRow>
                            <DetailRow label='Email'>{getVendorEmail(vendor, vendorContactPersons)}</DetailRow>
                            <DetailRow label='Phone'>{getVendorPhone(vendor, vendorContactPersons)}</DetailRow>
                            <DetailRow label='Contact Person'>
                                {valueOrDash(
                                    vendorContactPersons
                                        ?.map((i: any) => i.name)
                                        ?.filter(Boolean)
                                        ?.join(', '),
                                )}
                            </DetailRow>
                            <DetailRow label='City / District'>
                                {valueOrDash([vendorProfile?.city, vendorProfile?.district].filter(Boolean).join(' / '))}
                            </DetailRow>
                            <DetailRow label='MSME No.'>{getVendorMSME(vendor)}</DetailRow>
                        </InfoCard>

                        <InfoCard title='Shipment'>
                            <DetailRow label='From Location'>{po?.shippingAccount?.fromLocation}</DetailRow>
                            <DetailRow label='To Location'>{po?.shippingAccount?.toLocation}</DetailRow>
                            <DetailRow label='Payment Mode'>{po?.shippingAccount?.paymentMode}</DetailRow>
                            <DetailRow label='Freight Type'>{po?.shippingAccount?.freightType}</DetailRow>
                            <DetailRow label='Freight Rate'>{po?.shippingAccount?.freightRate}</DetailRow>
                            <DetailRow label='Freight Amount'>{po?.shippingAccount?.freightAmount}</DetailRow>
                            <DetailRow label='Shipping Address'>{po?.shippingAccount?.shippingAddress}</DetailRow>
                        </InfoCard>
                    </div>

                    <VerticalTabs po={po as _POType} indents={indents} />
                </main>

                <footer className='fixed bottom-0 left-0 z-30 w-full border-t border-slate-200 bg-white/95 px-3 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:px-6'>
                    <div className='mx-auto flex w-full max-w-[1600px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-end'>
                        {data?.approvalStatus ? (
                            <div className='rounded-full bg-slate-50 px-3 py-2 text-center font-bold sm:text-left'>
                                <span className={data?.approvalStatus === 1 ? 'text-green-600' : 'text-red-500'}>
                                    {data?.approvalStatus === 1 ? 'Approved' : 'Rejected'}
                                </span>{' '}
                                on {formatDateTime(data?.changedOn as string)}
                            </div>
                        ) : (
                            <>
                                <Button className='w-full sm:w-auto' size='sm' variant='solid' color='red' onClick={() => handlePOAction(2)}>
                                    Reject
                                </Button>
                                <Button className='w-full sm:w-auto' size='sm' variant='solid' color='green' onClick={() => handlePOAction(1)}>
                                    Approve
                                </Button>
                            </>
                        )}
                    </div>
                </footer>
            </div>
        </>
    )
}

const VerticalTabs = ({ po, indents }: { po: _POType; indents: IndentType[] }) => {
    const [itemPOHistory, setItemPOHistory] = useState<ItemPOHistoryState>({
        open: false,
        loading: false,
        showAll: false,
        itemCode: '',
        itemDescription: '',
        rows: [],
    })

    const [selectedIndent, setSelectedIndent] = useState<any | null>(null)

    const openItemPOHistory = async (item: any) => {
        const itemCode = String(item?.itemCode || '').trim()
        if (!itemCode) return showError('Item code not found.')

        setItemPOHistory({
            open: true,
            loading: true,
            showAll: false,
            itemCode,
            itemDescription: String(item?.itemDescription || '').trim(),
            rows: [],
        })

        try {
            const response = await ApiService.fetchData<any>({
                method: 'post',
                url: '/po/list',
                data: {
                    pageIndex: 1,
                    pageSize: 500,
                    query: '',
                    sort: {
                        order: '',
                        key: '',
                    },
                    filters: {
                        itemCode,
                    },
                    total: 10,
                },
            })

            const rows = normalizePOListRows(response?.data).filter((row) => {
                const poItem = getItemFromPO(row, itemCode)
                return Boolean(poItem)
            })

            setItemPOHistory((prev) => ({
                ...prev,
                loading: false,
                rows,
            }))
        } catch (error: any) {
            console.error(error)
            showError(error?.response?.data?.message || error?.message || 'Failed to fetch PO history for this item.')
            setItemPOHistory((prev) => ({
                ...prev,
                loading: false,
                rows: [],
            }))
        }
    }

    const closeItemPOHistory = () => {
        setItemPOHistory({
            open: false,
            loading: false,
            showAll: false,
            itemCode: '',
            itemDescription: '',
            rows: [],
        })
    }

    if (!po) return null

    return (
        <>
            <Menu className='mt-5 space-y-2'>
                <Menu.MenuCollapse eventKey='itemDetail' label='Item Detail' className='rounded-xl bg-white shadow-sm ring-1 ring-slate-200 hover:bg-slate-50'>
                    <SectionContent>
                        <div className='hidden overflow-hidden rounded-xl border border-slate-200 md:block'>
                            <div className='overflow-x-auto'>
                                <table className='w-full min-w-[1060px] border-collapse text-xs'>
                                    <thead className='bg-slate-100 text-slate-700'>
                                        <tr>
                                            <th className='border-b border-r border-slate-200 px-3 py-3 text-left'>Item</th>
                                            <th className='border-b border-r border-slate-200 px-3 py-3 text-left'>HSN / Make</th>
                                            <th className='border-b border-r border-slate-200 px-3 py-3 text-right'>Qty</th>
                                            <th className='border-b border-r border-slate-200 px-3 py-3 text-right'>Rate</th>
                                            <th className='border-b border-r border-slate-200 px-3 py-3 text-right'>Basic</th>
                                            <th className='border-b border-r border-slate-200 px-3 py-3 text-right'>CGST</th>
                                            <th className='border-b border-r border-slate-200 px-3 py-3 text-right'>SGST</th>
                                            <th className='border-b border-slate-200 px-3 py-3 text-right'>Net Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className='divide-y divide-slate-100'>
                                        {po?.items?.map((i) => {
                                            const cgstRate = getTaxRate(i, 'cgst')
                                            const sgstRate = getTaxRate(i, 'sgst')
                                            const cgstAmount = getTaxAmount(i, 'cgst')
                                            const sgstAmount = getTaxAmount(i, 'sgst')

                                            return (
                                                <tr key={i.indentNumber + ':' + i.itemCode} className='hover:bg-slate-50'>
                                                    <td className='border-r border-slate-100 px-3 py-3 align-top'>
                                                        <button
                                                            type='button'
                                                            className='break-words text-left font-bold text-blue-700 underline underline-offset-2 hover:text-blue-800'
                                                            onClick={() => openItemPOHistory(i)}>
                                                            {i.itemDescription || '-'}
                                                        </button>
                                                        <div className='mt-1 text-[11px] text-slate-500'>Code: {i.itemCode || '-'}</div>
                                                        <div className='mt-1 text-[11px] text-slate-500'>Indent: {i.indentNumber || '-'}</div>

                                                    </td>
                                                    <td className='border-r border-slate-100 px-3 py-3 align-top'>
                                                        <div><b>HSN:</b> {i.hsnCode || '-'}</div>
                                                        <div className='mt-1'><b>PO Make:</b> {i.make || '-'}</div>
                                                        <div className='mt-1'><b>Delivery:</b> {formatDate(i.schedule as string)}</div>
                                                    </td>
                                                    <td className='border-r border-slate-100 px-3 py-3 text-right align-top whitespace-nowrap'>{Number(i.qty)?.toFixed(3)} {i.unit}</td>
                                                    <td className='border-r border-slate-100 px-3 py-3 text-right align-top whitespace-nowrap'>{Number(i.rate)?.toFixed(2)}</td>
                                                    <td className='border-r border-slate-100 px-3 py-3 text-right align-top whitespace-nowrap'>{i.amount?.taxable?.toFixed(2)}</td>
                                                    <td className='border-r border-slate-100 px-3 py-3 text-right align-top whitespace-nowrap'>
                                                        <div>{toFixedSafe(cgstAmount, 2)}</div>
                                                        <div className='text-[11px] text-slate-500'>{toFixedSafe(cgstRate, 2)}%</div>
                                                    </td>
                                                    <td className='border-r border-slate-100 px-3 py-3 text-right align-top whitespace-nowrap'>
                                                        <div>{toFixedSafe(sgstAmount, 2)}</div>
                                                        <div className='text-[11px] text-slate-500'>{toFixedSafe(sgstRate, 2)}%</div>
                                                    </td>
                                                    <td className='px-3 py-3 text-right align-top font-bold whitespace-nowrap'>{i.amount.total?.toFixed(2)}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className='space-y-3 md:hidden'>
                            {po?.items?.map((i) => {
                                const cgstRate = getTaxRate(i, 'cgst')
                                const sgstRate = getTaxRate(i, 'sgst')
                                const cgstAmount = getTaxAmount(i, 'cgst')
                                const sgstAmount = getTaxAmount(i, 'sgst')

                                return (
                                    <div key={i.indentNumber + ':' + i.itemCode} className='rounded-xl border border-slate-200 bg-white p-3 shadow-sm'>
                                        <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
                                            <div className='min-w-0'>
                                                <button
                                                    type='button'
                                                    className='break-words text-left font-bold text-blue-700 underline underline-offset-2 hover:text-blue-800'
                                                    onClick={() => openItemPOHistory(i)}>
                                                    {i.itemDescription || '-'}
                                                </button>
                                                <div className='mt-1 text-[11px] text-slate-500'>Code: {i.itemCode || '-'} | Indent: {i.indentNumber || '-'}</div>
                                            </div>

                                        </div>

                                        <div className='mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3'>
                                            <div><div className='text-[11px] text-slate-500'>Qty</div><div className='font-semibold'>{Number(i.qty)?.toFixed(3)} {i.unit}</div></div>
                                            <div><div className='text-[11px] text-slate-500'>Rate</div><div className='font-semibold'>{Number(i.rate)?.toFixed(2)}</div></div>
                                            <div><div className='text-[11px] text-slate-500'>Basic</div><div className='font-semibold'>{i.amount?.taxable?.toFixed(2)}</div></div>
                                            <div><div className='text-[11px] text-slate-500'>CGST</div><div className='font-semibold'>{toFixedSafe(cgstAmount, 2)} ({toFixedSafe(cgstRate, 2)}%)</div></div>
                                            <div><div className='text-[11px] text-slate-500'>SGST</div><div className='font-semibold'>{toFixedSafe(sgstAmount, 2)} ({toFixedSafe(sgstRate, 2)}%)</div></div>
                                            <div><div className='text-[11px] text-slate-500'>Net Amount</div><div className='font-bold'>{i.amount.total?.toFixed(2)}</div></div>
                                            <div><div className='text-[11px] text-slate-500'>HSN</div><div>{i.hsnCode || '-'}</div></div>
                                            <div><div className='text-[11px] text-slate-500'>Make</div><div>{i.make || '-'}</div></div>
                                            <div><div className='text-[11px] text-slate-500'>Delivery</div><div>{formatDate(i.schedule as string)}</div></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </SectionContent>
                </Menu.MenuCollapse>

                <Menu.MenuCollapse eventKey='chargeDetail' label='Charge Detail' className='rounded-xl bg-white shadow-sm ring-1 ring-slate-200 hover:bg-slate-50'>
                    <SectionContent>
                        <AmountSummary po={po} />
                    </SectionContent>
                </Menu.MenuCollapse>

                <Menu.MenuCollapse eventKey='terms&condition' label='Terms & Condition' className='rounded-xl bg-white shadow-sm ring-1 ring-slate-200 hover:bg-slate-50'>
                    <SectionContent>
                        <div className='overflow-hidden rounded-xl border border-slate-200'>
                            <Table compact containerClassName='overflow-x-auto'>
                                <TBody>
                                    {termsConditionsOptions.map(({ label, value: key }) => (
                                        <Tr key={key}>
                                            <Td className='w-[260px] border-r bg-slate-50 font-semibold whitespace-nowrap'>{label}</Td>
                                            <Td className='min-w-[260px] break-words py-2'>{(po as any)?.termsConditions?.[key] || '-'}</Td>
                                        </Tr>
                                    ))}
                                </TBody>
                            </Table>
                        </div>
                    </SectionContent>
                </Menu.MenuCollapse>

                <Menu.MenuCollapse eventKey='paymentTerms' label='Payment Terms' className='rounded-xl bg-white shadow-sm ring-1 ring-slate-200 hover:bg-slate-50'>
                    <SectionContent>
                        <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'>
                            {po.paymentTerms?.map((pt, i) => (
                                <div key={'pt:list-' + i} className='rounded-xl border border-slate-200 bg-slate-50 p-3'>
                                    <div className='mb-2 font-bold text-slate-900'>Payment Term {i + 1}</div>
                                    <div className='space-y-1 text-xs'>
                                        <DetailRow label='Type'>{pt.paymentType}</DetailRow>
                                        <DetailRow label='Pay Value'>{pt.payValuePercent?.toFixed?.(2)}%</DetailRow>
                                        <DetailRow label='Pay On'>{pt.payOn}</DetailRow>
                                        <DetailRow label='Days'>{pt.days}</DetailRow>
                                        <DetailRow label='Remarks'>{pt.remarks}</DetailRow>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SectionContent>
                </Menu.MenuCollapse>

                <Menu.MenuCollapse eventKey='indentDetail' label='Indent Detail' className='rounded-xl bg-white shadow-sm ring-1 ring-slate-200 hover:bg-slate-50'>
                    <SectionContent>
                        <div className='hidden overflow-hidden rounded-xl border border-slate-200 md:block'>
                            <div className='overflow-x-auto'>
                                <table className='w-full min-w-[1100px] border-collapse text-xs'>
                                    <thead className='bg-slate-100 text-slate-700'>
                                        <tr>
                                            <th className='border-b border-r border-slate-200 px-3 py-3 text-left'>Indent</th>
                                            <th className='border-b border-r border-slate-200 px-3 py-3 text-left'>Item Details</th>
                                            <th className='border-b border-r border-slate-200 px-3 py-3 text-left'>Tech Spec</th>
                                            <th className='border-b border-r border-slate-200 px-3 py-3 text-left'>Cost Center</th>
                                            <th className='border-b border-r border-slate-200 px-3 py-3 text-left'>Requested By</th>
                                            <th className='border-b border-r border-slate-200 px-3 py-3 text-left'>Indent Type</th>
                                            <th className='border-b border-slate-200 px-3 py-3 text-right'>Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className='divide-y divide-slate-100'>
                                        {indents?.map((i) => (
                                            <tr key={'indent:' + i.indentNumber + ':' + i.itemCode} className='hover:bg-slate-50'>
                                                <td className='border-r border-slate-100 px-3 py-3 align-top'>
                                                    <button
                                                        type='button'
                                                        className='font-bold text-blue-700 underline underline-offset-2 hover:text-blue-800'
                                                        onClick={() => setSelectedIndent(i)}>
                                                        {i.indentNumber || '-'}
                                                    </button>
                                                    <div className='text-[11px] text-slate-500'>{formatDate(i.documentDate)}</div>
                                                    <div className='text-[11px] text-slate-500'>Line: {(i as any).lineNumber || '-'}</div>

                                                </td>
                                                <td className='border-r border-slate-100 px-3 py-3 align-top'>
                                                    <div className='font-semibold text-slate-900'>{i.itemDescription || '-'}</div>
                                                    <div className='mt-1 text-[11px] text-slate-500'>Code: {i.itemCode || '-'}</div>
                                                    <div className='mt-1 text-[11px] text-slate-500'>Unit: {i.unitOfMeasure || '-'}</div>
                                                    <div className='mt-1 text-[11px] text-slate-500'>Make: {i.make || '-'}</div>
                                                </td>
                                                <td className='border-r border-slate-100 px-3 py-3 align-top'>{i.techSpec || '-'}</td>
                                                <td className='border-r border-slate-100 px-3 py-3 align-top'>{i.costCenter || '-'}</td>
                                                <td className='border-r border-slate-100 px-3 py-3 align-top'>{i.requestedBy || '-'}</td>
                                                <td className='border-r border-slate-100 px-3 py-3 align-top'>{(i as any).documentType || (i as any).documentCategory || '-'}</td>
                                                <td className='px-3 py-3 text-right align-top whitespace-nowrap'>
                                                    <div><b>Indent:</b> {(+i.indentQty || 0)?.toFixed(3)}</div>
                                                    <div className='mt-1'><b>Pre RFQ:</b> {(+((i as any).preRFQQty ?? 0))?.toFixed(3)}</div>
                                                    <div className='mt-1'><b>Pre PO:</b> {(+((i as any).prePOQty ?? 0))?.toFixed(3)}</div>
                                                    <div className='mt-1'><b>Balance:</b> {(+((i as any).balanceQty ?? 0))?.toFixed(3)}</div>
                                                    <div className='mt-1'><b>This PO:</b> {(+(
                                                        po?.items?.find((_i) => _i.indentNumber === i.indentNumber && _i.itemCode === i.itemCode)?.qty ?? 0
                                                    ))?.toFixed(3)}</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className='space-y-3 md:hidden'>
                            {indents?.map((i) => (
                                <div key={'indent-mobile:' + i.indentNumber + ':' + i.itemCode} className='rounded-xl border border-slate-200 bg-white p-3 shadow-sm'>
                                    <div className='mb-3 flex items-start justify-between gap-2'>
                                        <div className='min-w-0'>
                                            <button
                                                type='button'
                                                className='font-bold text-blue-700 underline underline-offset-2 hover:text-blue-800'
                                                onClick={() => setSelectedIndent(i)}>
                                                {i.indentNumber || '-'}
                                            </button>
                                            <div className='text-[11px] text-slate-500'>{formatDate(i.documentDate)} | Item: {i.itemCode}</div>
                                        </div>

                                    </div>
                                    <div className='grid grid-cols-2 gap-3 text-xs'>
                                        <div><div className='text-[11px] text-slate-500'>Item</div><div>{i.itemDescription || '-'}</div></div>
                                        <div><div className='text-[11px] text-slate-500'>Tech Spec</div><div>{i.techSpec || '-'}</div></div>
                                        <div><div className='text-[11px] text-slate-500'>Unit</div><div>{i.unitOfMeasure || '-'}</div></div>
                                        <div><div className='text-[11px] text-slate-500'>Make</div><div>{i.make || '-'}</div></div>
                                        <div><div className='text-[11px] text-slate-500'>Cost Center</div><div>{i.costCenter || '-'}</div></div>
                                        <div><div className='text-[11px] text-slate-500'>Requested By</div><div>{i.requestedBy || '-'}</div></div>
                                        <div><div className='text-[11px] text-slate-500'>Indent Qty</div><div>{(+i.indentQty || 0)?.toFixed(3)}</div></div>
                                        <div><div className='text-[11px] text-slate-500'>PO Qty</div><div>{(+(
                                            po?.items?.find((_i) => _i.indentNumber === i.indentNumber && _i.itemCode === i.itemCode)?.qty ?? 0
                                        ))?.toFixed(3)}</div></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SectionContent>
                </Menu.MenuCollapse>

                <Menu.MenuCollapse eventKey='attachment' label='Attachment' className='rounded-xl bg-white shadow-sm ring-1 ring-slate-200 hover:bg-slate-50'>
                    <SectionContent>
                        <div className='overflow-x-auto'>
                            <AttachmentsTable id={po?._id as string} attachments={po?.attachments || []} />
                        </div>
                    </SectionContent>
                </Menu.MenuCollapse>

                <Menu.MenuCollapse eventKey='authorizationDetail' label='Authorization Detail' className='rounded-xl bg-white shadow-sm ring-1 ring-slate-200 hover:bg-slate-50'>
                    <SectionContent>
                        <div className='hidden overflow-hidden rounded-xl border border-slate-200 md:block'>
                            <Table containerClassName='overflow-x-auto'>
                                <TBody>
                                    {po?.authorize?.map((i, idx) => (
                                        <Tr key={'authorize:' + i.user}>
                                            <Td className='align-top'>
                                                <b>Level {idx + 1}</b>
                                                <br />
                                                {i.name}
                                            </Td>
                                            <Td className='align-top whitespace-nowrap'>
                                                <b>Assigned On</b>
                                                <br />
                                                {formatDate(i.assignOn as string)}
                                            </Td>
                                            <Td className='align-top whitespace-nowrap'>
                                                <b>Duration</b>
                                                <br />
                                                {formatTimeDifference(i.assignOn as string, i.changedOn as string)}
                                            </Td>
                                            <Td className='align-top'>
                                                <b>Current Status</b>
                                                <br />
                                                {i.approvalStatus === 1 ? 'Authorized' : i.approvalStatus === 2 ? 'Rejected' : 'Initial'}
                                                {i.approvalStatus && i.changedOn ? <> [{formatDateTime(i.changedOn as string)}]</> : null}
                                            </Td>
                                            <Td className='align-top'>
                                                <b>Comment</b>
                                                <br />
                                                {i.comment || '-'}
                                            </Td>
                                        </Tr>
                                    ))}
                                </TBody>
                            </Table>
                        </div>

                        <div className='space-y-3 md:hidden'>
                            {po?.authorize?.map((i, idx) => (
                                <div key={'authorize-mobile:' + i.user} className='rounded-xl border border-slate-200 bg-white p-3 shadow-sm'>
                                    <div className='mb-2 flex items-start justify-between gap-2'>
                                        <div>
                                            <div className='font-bold'>Level {idx + 1}</div>
                                            <div>{i.name}</div>
                                        </div>
                                        <span className='rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold'>
                                            {i.approvalStatus === 1 ? 'Authorized' : i.approvalStatus === 2 ? 'Rejected' : 'Initial'}
                                        </span>
                                    </div>
                                    <div className='grid grid-cols-1 gap-2 text-xs sm:grid-cols-2'>
                                        <div><div className='text-[11px] text-slate-500'>Assigned On</div><div>{formatDate(i.assignOn as string)}</div></div>
                                        <div><div className='text-[11px] text-slate-500'>Duration</div><div>{formatTimeDifference(i.assignOn as string, i.changedOn as string)}</div></div>
                                        <div className='sm:col-span-2'><div className='text-[11px] text-slate-500'>Changed On</div><div>{i.changedOn ? formatDateTime(i.changedOn as string) : '-'}</div></div>
                                        <div className='sm:col-span-2'><div className='text-[11px] text-slate-500'>Comment</div><div>{i.comment || '-'}</div></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SectionContent>
                </Menu.MenuCollapse>
            </Menu>

            <IndentDetailModal indent={selectedIndent} po={po} onClose={() => setSelectedIndent(null)} />
            <ItemPOHistoryModal state={itemPOHistory} setState={setItemPOHistory} onClose={closeItemPOHistory} />
        </>
    )
}

const IndentDetailModal = ({ indent, po, onClose }: { indent: any | null; po: any; onClose: () => void }) => {
    if (!indent) return null

    const poQty = po?.items?.find((i: any) => i.indentNumber === indent.indentNumber && i.itemCode === indent.itemCode)?.qty ?? 0

    const rows = [
        ['Indent Number', indent.indentNumber],
        ['Line Number', indent.lineNumber],
        ['Company', indent.company],
        ['Document Date', formatDate(indent.documentDate)],
        ['Document Type', indent.documentType],
        ['Item Code', indent.itemCode],
        ['Item Description', indent.itemDescription],
        ['HSN Code', indent.hsnCode],
        ['Make', indent.make],
        ['Tech Specification', indent.techSpec],
        ['Unit', indent.unitOfMeasure],
        ['Cost Center', indent.costCenter],
        ['Requested By', indent.requestedBy],
        ['Indent Qty', toFixedSafe(indent.indentQty, 3)],
        ['Pre RFQ Qty', toFixedSafe(indent.preRFQQty, 3)],
        ['Pre PO Qty', toFixedSafe(indent.prePOQty, 3)],
        ['Balance Qty', toFixedSafe(indent.balanceQty, 3)],
        ['This PO Qty', toFixedSafe(poQty, 3)],
        ['Created On', indent.createdOn ? formatDateTime(indent.createdOn) : '-'],
        ['Last Changed On', indent.lastChangedOn ? formatDateTime(indent.lastChangedOn) : '-'],
        
    ]

    return (
        <Dialog isOpen={Boolean(indent)} onClose={onClose} width={860}>
            <div className='flex max-h-[85vh] flex-col overflow-hidden rounded-xl bg-white'>
                <div className='border-b bg-gradient-to-r from-slate-50 to-white px-4 py-4'>
                    <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
                        <div className='min-w-0'>
                            <h5 className='text-base font-extrabold text-slate-900 sm:text-lg'>Indent Details</h5>
                            <div className='mt-1 text-xs text-slate-600'>
                                <span className='font-bold text-blue-700'>{indent.indentNumber}</span>
                                <span> — {indent.itemDescription || '-'}</span>
                            </div>
                        </div>
               
                    </div>
                </div>

                <div className='min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-3 sm:p-4'>
                    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                        {rows.map(([label, value]) => (
                            <div key={String(label)} className='rounded-xl border border-slate-200 bg-white p-3 shadow-sm'>
                                <div className='text-[11px] font-semibold text-slate-500'>{label}</div>
                                <div className='mt-1 break-words text-xs font-bold text-slate-900'>{valueOrDash(value)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Dialog>
    )
}

const ItemPOHistoryModal = ({
    state,
    setState,
    onClose,
}: {
    state: ItemPOHistoryState
    setState: React.Dispatch<React.SetStateAction<ItemPOHistoryState>>
    onClose: () => void
}) => {
    const visibleRows = state.showAll ? state.rows : state.rows.slice(0, 5)
    const [expandedRow, setExpandedRow] = useState<string | null>(null)

    useEffect(() => {
        setExpandedRow(null)
    }, [state.itemCode, state.rows.length, state.showAll])

    const rowKey = (row: any, index: number) => String(row?._id || row?.id || row?.poNumber || index)

    return (
        <Dialog isOpen={state.open} onClose={onClose} width={1280}>
            <div className='flex max-h-[88vh] min-h-[280px] flex-col overflow-hidden rounded-xl bg-white'>
                <div className='border-b bg-gradient-to-r from-slate-50 to-white px-3 py-3 sm:px-4 sm:py-4'>
                    <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                        <div className='min-w-0'>
                            <div className='flex flex-wrap items-center gap-2'>
                                <h5 className='text-base font-bold tracking-tight text-slate-900 sm:text-lg'>Item Wise PO History</h5>
                                <span className='rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700'>
                                    {state.rows.length} PO Found
                                </span>
                            </div>

                            <div className='mt-2 flex flex-col gap-1 text-xs text-slate-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2'>
                                <span className='w-fit rounded-md border border-slate-200 bg-white px-2 py-1 font-bold text-slate-800'>{state.itemCode}</span>
                                {state.itemDescription ? <span className='min-w-0 break-words leading-5 text-slate-600'>{state.itemDescription}</span> : null}
                            </div>
                        </div>

                        <div className='flex shrink-0 flex-wrap items-center gap-2 lg:justify-end'>
                            {state.rows.length > 5 && (
                                <Button type='button' size='xs' variant='twoTone' onClick={() => setState((prev) => ({ ...prev, showAll: !prev.showAll }))}>
                                    {state.showAll ? 'Show Less' : `Show All (${state.rows.length})`}
                                </Button>
                            )}

                        </div>
                    </div>
                </div>

                <div className='min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-3 sm:p-4'>
                    {state.loading ? (
                        <div className='flex min-h-[220px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm'>
                            <div className='flex items-center gap-2'>
                                <Spinner size={22} />
                                <span className='text-sm'>Loading PO history...</span>
                            </div>
                        </div>
                    ) : !state.rows.length ? (
                        <div className='flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 text-center text-sm text-slate-500 shadow-sm'>
                            No PO found for this item.
                        </div>
                    ) : (
                        <>
                            <div className='hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block'>
                                <div className='overflow-x-auto'>
                                    <table className='w-full min-w-[1280px] border-collapse text-xs'>
                                        <thead className='sticky top-0 z-10 bg-slate-100 text-slate-700'>
                                            <tr>
                                                <th className='border-b border-r border-slate-200 px-3 py-3 text-left font-bold'>#</th>
                                                <th className='border-b border-r border-slate-200 px-3 py-3 text-left font-bold'>PO Details</th>
                                                <th className='border-b border-r border-slate-200 px-3 py-3 text-left font-bold'>Vendor</th>
                                                <th className='border-b border-r border-slate-200 px-3 py-3 text-left font-bold'>Item Details</th>
                                                <th className='border-b border-r border-slate-200 px-3 py-3 text-left font-bold'>Amount Details</th>
                                                <th className='border-b border-r border-slate-200 px-3 py-3 text-left font-bold'>Authorization</th>
                                                <th className='border-b border-slate-200 px-3 py-3 text-left font-bold'>Status</th>
                                            </tr>
                                        </thead>

                                        <tbody className='divide-y divide-slate-100'>
                                            {visibleRows.map((row, index) => {
                                                const poItem = getItemFromPO(row, state.itemCode)
                                                const auth = getAuthorizationInfo(row)

                                                return (
                                                    <tr key={rowKey(row, index)} className='align-top transition hover:bg-slate-50'>
                                                        <td className='border-r border-slate-100 px-3 py-3 text-slate-500'>{index + 1}</td>
                                                        <td className='border-r border-slate-100 px-3 py-3'>
                                                            <div className='font-bold text-blue-700'>PO No: {valueOrDash(row?.poNumber)}</div>
                                                            <div className='mt-1 text-[11px] text-slate-500'>SAP: {valueOrDash(row?.sapPONumber)}</div>
                                                            <div className='mt-1 whitespace-nowrap text-[11px] text-slate-500'>Date: {formatDate(row?.poDate || row?.createdAt || row?.createdOn)}</div>
                                                            <div className='mt-1 text-[11px] text-slate-500'>Ref: {valueOrDash(row?.refDocumentType)} / {valueOrDash(row?.refDocumentNumber)}</div>
                                                        </td>
                                                        <td className='border-r border-slate-100 px-3 py-3'>
                                                            <div className='font-semibold text-slate-900'>{valueOrDash(row?.vendorName || row?.vendor?.name || row?.vendorCode)}</div>
                                                            <div className='mt-1 text-[11px] text-slate-500'>{valueOrDash(row?.vendorCode || row?.vendor?.vendorCode)}</div>
                                                            <div className='mt-1 text-[11px] text-slate-500'>{valueOrDash(row?.vendorLocation)}</div>
                                                        </td>
                                                        <td className='border-r border-slate-100 px-3 py-3'>
                                                            <div className='max-w-[240px] font-semibold text-slate-900'>{valueOrDash(poItem?.itemDescription || row?.itemDescription)}</div>
                                                            <div className='mt-1 text-[11px] text-slate-500'>Code: {valueOrDash(poItem?.itemCode || state.itemCode)}</div>
                                                            <div className='mt-1 text-[11px] text-slate-500'>Indent: {valueOrDash(poItem?.indentNumber)}</div>
                                                            <div className='mt-1 text-[11px] text-slate-500'>Make: {valueOrDash(poItem?.make)}</div>
                                                            <div className='mt-1 text-[11px] text-slate-500'>Qty: {toFixedSafe(poItem?.qty, 3)} {poItem?.unit || ''}</div>
                                                            <div className='mt-1 text-[11px] text-slate-500'>Rate: {formatPlainAmount(poItem?.rate)}</div>
                                                            <div className='mt-1 text-[11px] text-slate-500'>Delivery: {formatDate(poItem?.schedule)}</div>
                                                        </td>
                                                        <td className='border-r border-slate-100 px-3 py-3 min-w-[230px]'>
                                                            <AmountMiniRows row={row} poItem={poItem} />
                                                        </td>
                                                        <td className='border-r border-slate-100 px-3 py-3'>
                                                            <div className='font-semibold text-slate-900'>{valueOrDash(auth.authorizedBy)}</div>
                                                            <div className='mt-1 text-[11px] text-slate-500'>Assigned: {auth.assignedOn ? formatDateTime(auth.assignedOn) : '-'}</div>
                                                            <div className='mt-1 text-[11px] text-slate-500'>Authorized: {auth.authorizedAt ? formatDateTime(auth.authorizedAt) : '-'}</div>
                                                            {auth.comment ? <div className='mt-1 max-w-[180px] break-words text-[11px] text-slate-500'>Comment: {auth.comment}</div> : null}
                                                        </td>
                                                        <td className='px-3 py-3'>
                                                            <StatusBadge row={row} />
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className='space-y-2 md:hidden'>
                                {visibleRows.map((row, index) => {
                                    const key = rowKey(row, index)
                                    const poItem = getItemFromPO(row, state.itemCode)
                                    const auth = getAuthorizationInfo(row)
                                    const expanded = expandedRow === key

                                    return (
                                        <div key={key} className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'>
                                            <button
                                                type='button'
                                                className='flex w-full items-start justify-between gap-3 p-3 text-left'
                                                onClick={() => setExpandedRow(expanded ? null : key)}>
                                                <div className='min-w-0'>
                                                    <div className='font-bold text-blue-700'>PO No: {valueOrDash(row?.poNumber)}</div>
                                                    <div className='mt-0.5 truncate text-[11px] text-slate-500'>SAP: {valueOrDash(row?.sapPONumber)}</div>
                                                    <div className='mt-1 truncate text-xs font-semibold text-slate-900'>{valueOrDash(row?.vendorName || row?.vendor?.name || row?.vendorCode)}</div>
                                                    <div className='mt-1 line-clamp-1 text-[11px] text-slate-500'>{valueOrDash(poItem?.itemDescription || row?.itemDescription)}</div>
                                                    <div className='mt-1 text-[11px] font-bold text-slate-900'>{formatMoney(poItem?.amount?.total ?? row?.amount?.total)}</div>
                                                </div>
                                                <div className='flex shrink-0 flex-col items-end gap-2'>
                                                    <StatusBadge row={row} />
                                                    <span className='text-[11px] font-bold text-blue-700'>{expanded ? 'Hide' : 'View'}</span>
                                                </div>
                                            </button>

                                            {expanded ? (
                                                <div className='border-t border-slate-100 bg-slate-50/70 p-3'>
                                                    <div className='grid grid-cols-1 gap-3 text-xs'>
                                                        <div className='rounded-lg bg-white p-2'>
                                                            <div className='mb-1 font-bold text-slate-700'>PO Details</div>
                                                            <div>Date: {formatDate(row?.poDate || row?.createdAt || row?.createdOn)}</div>
                                                            <div>Ref: {valueOrDash(row?.refDocumentType)} / {valueOrDash(row?.refDocumentNumber)}</div>
                                                        </div>
                                                        <div className='rounded-lg bg-white p-2'>
                                                            <div className='mb-1 font-bold text-slate-700'>Item Details</div>
                                                            <div>{valueOrDash(poItem?.itemDescription || row?.itemDescription)}</div>
                                                            <div className='text-[11px] text-slate-500'>Code: {valueOrDash(poItem?.itemCode || state.itemCode)}</div>
                                                            <div className='text-[11px] text-slate-500'>Indent: {valueOrDash(poItem?.indentNumber)}</div>
                                                            <div className='text-[11px] text-slate-500'>Make: {valueOrDash(poItem?.make)}</div>
                                                            <div className='text-[11px] text-slate-500'>Qty: {toFixedSafe(poItem?.qty, 3)} {poItem?.unit || ''}</div>
                                                            <div className='text-[11px] text-slate-500'>Rate: {formatPlainAmount(poItem?.rate)}</div>
                                                            <div className='text-[11px] text-slate-500'>Delivery: {formatDate(poItem?.schedule)}</div>
                                                        </div>
                                                        <div className='rounded-lg bg-white p-2'>
                                                            <div className='mb-2 font-bold text-slate-700'>Amount Details</div>
                                                            <AmountMiniRows row={row} poItem={poItem} />
                                                        </div>
                                                        <div className='rounded-lg bg-white p-2'>
                                                            <div className='mb-1 font-bold text-slate-700'>Authorization</div>
                                                            <div>Authorized By: {valueOrDash(auth.authorizedBy)}</div>
                                                            <div>Assigned: {auth.assignedOn ? formatDateTime(auth.assignedOn) : '-'}</div>
                                                            <div>Authorized: {auth.authorizedAt ? formatDateTime(auth.authorizedAt) : '-'}</div>
                                                            {auth.comment ? <div>Comment: {auth.comment}</div> : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Dialog>
    )
}
