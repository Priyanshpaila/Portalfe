import React, { useEffect, useMemo, useState } from 'react'
import { POType as _POType, VendorType } from '@/@types/app'
import { formatDate } from '@/utils/formatDate'
import { amountInWords } from '@/utils/numberInWords'
import appConfig from '@/configs/app.config'
import { companies } from '@/utils/data'
import { UserApi } from '@/services/user.api'

type POType = Omit<_POType, 'authorize'> & {
    status: number | string
    progressCount: number
    authorize: (_POType['authorize'][0] & { name: string; digitalSignature: string })[]
}

type MeCompany = {
    name?: string
    industry?: string
    gstin?: string
    pan?: string
    phone?: string
    website?: string
    addressLine1?: string
    addressLine2?: string
    city?: string
    state?: string
    pincode?: string
}

type MeUser = {
    _id?: string
    name?: string
    username?: string
    email?: string
    company?: MeCompany
}

function unwrapResponse<T = any>(res: any): T {
    return (res?.data ?? res) as T
}

function joinAddress(parts: Array<any>) {
    return parts
        .map((x) => String(x || '').trim())
        .filter(Boolean)
        .join(', ')
}

function buildCompanyAddress(c?: MeCompany) {
    return joinAddress([c?.addressLine1, c?.addressLine2, c?.city, c?.state, c?.pincode])
}

async function fetchMeUser(): Promise<MeUser | null> {
    try {
        const res = await UserApi.getMe()
        const raw = unwrapResponse<any>(res)
        if (raw && typeof raw === 'object') return raw as MeUser
        return null
    } catch {
        return null
    }
}

const EMPTY_COMPANY = {
    name: '',
    divisionName: '',
    address: '',
    cin: '',
    gstin: '',
    pan: '',
    stateName: '',
    stateCode: '',
    phone: '',
    telefax: '',
    email: '',
}

const PurchaseOrderPrint = ({ po, vendor }: { po: POType; vendor: VendorType }) => {
    // ✅ hooks must ALWAYS run
    const [meUser, setMeUser] = useState<MeUser | null>(null)

    useEffect(() => {
        ;(async () => {
            const u = await fetchMeUser()
            setMeUser(u)
        })()
    }, [])

    // ✅ DO NOT early-return here. Create safe fallbacks instead.
    const safePo: any = po || null
    const safeVendor: any = vendor || null

    const meCompany = meUser?.company || {}
    const meCompanyName = String(meCompany?.name || '').trim()
    const meCompanyAddress = buildCompanyAddress(meCompany)
    const meCompanyState = String(meCompany?.state || '').trim()
    const meCompanyPhone = String(meCompany?.phone || '').trim()
    const meCompanyGstin = String(meCompany?.gstin || '').trim()
    const meCompanyPan = String(meCompany?.pan || '').trim()
    const meEmail = String(meUser?.email || '').trim()
    const mePersonName = String(meUser?.name || '').trim()

    const companyInfo = useMemo(() => {
        // ✅ if po not ready, return basic info (still stable)
        if (!safePo) {
            return {
                ...EMPTY_COMPANY,
                name: meCompanyName || '',
                divisionName: String(meCompany?.industry || '').trim(),
                address: meCompanyAddress || '',
                gstin: meCompanyGstin || '',
                pan: meCompanyPan || '',
                stateName: meCompanyState || '',
                phone: meCompanyPhone || '',
                email: meEmail || '',
            }
        }

        const match: any =
            companies?.find((i: any) => i?.plantCode?.toString?.() === safePo?.company?.toString?.()) ||
            companies?.find((i: any) => i?.plantCode?.toString?.() === safePo?.companyCode?.toString?.()) ||
            companies?.[0] ||
            {}

        const fallbackFromMaster = {
            name: match?.companyName || '',
            divisionName: match?.divisionName || match?.division || '',
            address: match?.address || match?.companyAddress || '',
            cin: match?.cin || '',
            gstin: match?.gstin || match?.gstNo || '',
            pan: match?.pan || match?.panNo || '',
            stateName: match?.stateName || '',
            stateCode: match?.stateCode || '',
            phone: match?.phone || '',
            telefax: match?.telefax || match?.fax || '',
            email: match?.email || '',
        }

        return {
            ...fallbackFromMaster,
            name: meCompanyName || fallbackFromMaster.name,
            divisionName: String(meCompany?.industry || '').trim() || fallbackFromMaster.divisionName,
            address: meCompanyAddress || fallbackFromMaster.address,
            gstin: meCompanyGstin || fallbackFromMaster.gstin,
            pan: meCompanyPan || fallbackFromMaster.pan,
            stateName: meCompanyState || fallbackFromMaster.stateName,
            phone: meCompanyPhone || fallbackFromMaster.phone,
            email: meEmail || fallbackFromMaster.email,
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [safePo, meCompanyName, meCompanyAddress, meCompanyGstin, meCompanyPan, meCompanyState, meCompanyPhone, meEmail])

    const deliveryAddressText = useMemo(() => {
        if (!safePo) return companyInfo.address || ''
        return safePo?.shippingAccount?.shippingAddress || companyInfo.address || ''
    }, [safePo, companyInfo.address])

    const items = useMemo(() => {
        const arr = safePo?.items
        return Array.isArray(arr) ? arr : []
    }, [safePo])

    const totals = useMemo(() => {
        const totalQty = items.reduce((sum: number, item: any) => sum + Number(item?.qty || 0), 0)
        const totalBasic = items.reduce((sum: number, item: any) => sum + Number(item?.amount?.basic || 0), 0)
        const totalCgst = items.reduce((sum: number, item: any) => sum + Number(item?.amount?.cgst || 0), 0)
        const totalSgst = items.reduce((sum: number, item: any) => sum + Number(item?.amount?.sgst || 0), 0)
        const totalIgst = items.reduce((sum: number, item: any) => sum + Number(item?.amount?.igst || 0), 0)
        const totalInvoice = Number(safePo?.amount?.total || 0)
        return { totalQty, totalBasic, totalCgst, totalSgst, totalIgst, totalInvoice }
    }, [items, safePo])

    // ✅ Now you can render null safely (hooks already ran)
    if (!safePo || !safeVendor) return null

    return (
        <div className='flex justify-center bg-gray-100 print:bg-white p-4 print:p-0'>
            <div className='bg-white shadow-md print:shadow-none print:p-0 font-sans text-xs border border-black'>
                {/* Top header */}
                <div className='flex flex-col justify-between mb-2 text-center text-xs space-y-0.5 pt-4'>
                    <h1 className='font-bold text-sm mb-0'>
                        {companyInfo.name}
                        {companyInfo.divisionName ? `, ${companyInfo.divisionName}` : ''}
                    </h1>

                    {!!companyInfo.address && <p className='mb-0'>{companyInfo.address}</p>}
                    {!!companyInfo.cin && <p className='mb-0'>CIN No :- {companyInfo.cin}</p>}
                </div>

                <div className='relative'>
                    <h2 className='text-center text-lg font-bold mb-3'>Purchase Order</h2>
                    <span className='absolute right-2 top-1/2 -translate-y-[50%]'>Portal PO No: {safePo.sapPONumber}</span>
                </div>

                {/* Supplier Details */}
                <div className='flex gap-2 border-y border-black px-2'>
                    <div className='w-3/5 border-r border-black py-1'>
                        <p className='font-bold mb-1'>Details Of Supplier</p>
                        <p className='font-bold mb-0.5'>{safePo.vendorName}</p>
                        <p className='mb-0.5'>{safePo.vendorLocation}</p>

                        <table className='w-full text-xs mt-1'>
                            <tbody>
                                <tr>
                                    <td className='py-0.5 whitespace-nowrap'>State Name</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {(safeVendor as any)?.district || '-'}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5 whitespace-nowrap'>State Code</td>
                                    <td className='py-0.5'>: {(safeVendor as any)?.region || '-'}</td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>GSTIN</td>
                                    <td className='py-0.5'>: {(safeVendor as any)?.gstin || '-'}</td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>MSME No.</td>
                                    <td className='py-0.5'>: {(safeVendor as any)?.msme || '-'}</td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>PAN No.</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {(safeVendor as any)?.panNumber || '-'}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>Contact Detail</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : Contact Name: {safePo.contactPersonName || '-'} | Mo.No:{' '}
                                        {(safeVendor as any)?.mobile || (safeVendor as any)?.phone || '-'}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>Email</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {(safeVendor as any)?.email || '-'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className='w-2/5'>
                        <table className='w-full text-xs mt-1'>
                            <tbody>
                                <tr>
                                    <td className='py-0.5'>Order No.</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {safePo.poNumber}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>Date</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {formatDate(safePo.poDate as string)}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>Amend No.</td>
                                    <td className='py-0.5'>: {safePo.amendNumber}</td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>Date</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {(safePo as any)?.amendDate ? formatDate((safePo as any).amendDate as string) : ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5' colSpan={1}>
                                        Party Ref No.
                                    </td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {safePo.partyRefNumber || ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5' colSpan={1}>
                                        Party Ref Date
                                    </td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {safePo.partyRefDate ? formatDate(safePo.partyRefDate as string) : ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>Indent No.</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {items?.[0]?.indentNumber || ''} ({items?.[0]?.csDate ? formatDate(items[0].csDate as string) : ''})
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Order Details and Billing Address */}
                <div className='grid grid-cols-2 gap-x-2 px-2'>
                    <div className='border-r border-black py-1'>
                        <p className='font-bold mb-1'>Delivery Address</p>
                        <p className='font-bold mb-0.5'>{mePersonName || companyInfo.name || '-'}</p>
                        {!!deliveryAddressText && <p className='mb-0.5'>{deliveryAddressText}</p>}

                        <table className='w-full text-xs'>
                            <tbody>
                                <tr>
                                    <td className='py-0.5'>State Name</td>
                                    <td className='py-0.5'>: {companyInfo.stateName || ''}</td>
                                    <td className='py-0.5'>State Code</td>
                                    <td className='py-0.5'>: {companyInfo.stateCode || ''}</td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>GSTIN</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {companyInfo.gstin || ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>PAN No.</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {companyInfo.pan || ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>CIN No.</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {companyInfo.cin || ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>Contact Detail</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {companyInfo.phone || ''}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className='py-1'>
                        <p className='font-bold mb-1'>Billing Address</p>
                        {!!companyInfo.address && <p className='mb-0.5'>{companyInfo.address}</p>}

                        <table className='w-full text-xs mt-1'>
                            <tbody>
                                <tr>
                                    <td className='py-0.5'>State Name</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {companyInfo.stateName || ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>State Code</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {companyInfo.stateCode || ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>GSTIN</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {companyInfo.gstin || ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>PAN No.</td>
                                    <td className='py-0.5'>: {companyInfo.pan || ''}</td>
                                    <td className='py-0.5'>CIN</td>
                                    <td className='py-0.5'>: {companyInfo.cin || ''}</td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>Contact Detail</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {companyInfo.phone || ''}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Description of Goods Table */}
                <table className='w-full text-xs border border-gray-400'>
                    <thead>
                        <tr className='bg-gray-200'>
                            <th className='border-r border-b border-gray-400 px-1 py-0.5 text-center'>SNo.</th>
                            <th className='border-r border-b border-gray-400 px-1 py-0.5 text-center'>Description of Goods</th>
                            <th className='border-r border-b border-gray-400 px-1 py-0.5 text-center'>Order Qty.</th>
                            <th className='border-r border-b border-gray-400 px-1 py-0.5 text-center'>UOQ</th>
                            <th className='border-r border-b border-gray-400 px-1 py-0.5 text-center'>Rate(Per Unit)</th>
                            <th className='border-r border-b border-gray-400 px-1 py-0.5 text-center'>Tax on Amount</th>
                            <th className='border-r border-b border-gray-400 px-1 py-0.5 text-center'>CGST</th>
                            <th className='border-r border-b border-gray-400 px-1 py-0.5 text-center'>SGST</th>
                            <th className='border-r border-b border-gray-400 px-1 py-0.5 text-center'>IGST</th>
                            <th className='border-r border-b border-gray-400 px-1 py-0.5 text-center'>CESS</th>
                            <th className='border-b border-gray-400 px-1 py-0.5 text-center'>Net Amount</th>
                        </tr>
                    </thead>

                    <tbody>
                        {items.map((item: any, idx: number) => (
                            <tr key={`${item?.itemCode || 'item'}-${idx}`}>
                                <td className='align-top border-r border-gray-400 px-1 py-0.5 text-center'>{idx + 1}</td>
                                <td className='align-top border-r border-gray-400 px-1 py-0.5 w-1/4'>
                                    {item.itemDescription}
                                    <br />
                                    {item.techSpec}
                                    <br />
                                    Make: {item.make}
                                    <br />
                                    <b>Delivery Date: {formatDate(item.schedule as string)}</b>
                                    <br />
                                    <b>HSN/SAC No.: {item.hsnCode}</b>
                                </td>
                                <td className='align-top border-r border-gray-400 px-1 py-0.5 text-right'>{Number(item.qty || 0).toFixed(3)}</td>
                                <td className='align-top border-r border-gray-400 px-1 py-0.5 text-center'>{item.unit}</td>
                                <td className='align-top border-r border-gray-400 px-1 py-0.5 text-right'>{Number(item.rate || 0).toFixed(2)}</td>
                                <td className='align-top border-r border-gray-400 px-1 py-0.5 text-right'>{Number(item.amount?.basic || 0).toFixed(2)}</td>
                                <td className='align-top px-1 py-0.5 text-right'>{Number(item.amount?.total || 0).toFixed(2)}</td>
                            </tr>
                        ))}

                        <tr className='font-bold'>
                            <td className='border-y border-r border-gray-400 px-1 py-0.5'></td>
                            <td className='border-y border-r border-gray-400 px-1 py-0.5 text-right'>Total</td>
                            <td className='border-y border-r border-gray-400 px-1 py-0.5 text-right'>{totals.totalQty.toFixed(2)}</td>
                            <td className='border-y border-r border-gray-400 px-1 py-0.5'></td>
                            <td className='border-y border-r border-gray-400 px-1 py-0.5'></td>
                            <td className='border-y border-r border-gray-400 px-1 py-0.5 text-right'>{totals.totalBasic.toFixed(2)}</td>
                            <td className='border-y border-gray-400 px-1 py-0.5 text-right'>{totals.totalInvoice.toFixed(2)}</td>
                        </tr>

                        <tr>
                            <td className='border-b border-gray-400 px-1 py-0.5' colSpan={7}>
                                Total Invoice Value (In words): <b>{amountInWords(totals.totalInvoice)}</b>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div className='border-t border-black pt-2'>
                    <StaticTNC />

                    <div className='mt-2 text-right'>
                        <p className='font-bold pr-2'>For {companyInfo.name || '-'}</p>

                        {/* Keep signatures together if possible, but don't push TNC */}
                        <div className='mt-3 print:break-inside-avoid grid grid-cols-2 sm:grid-cols-3 gap-4 px-2 text-center'>
                            {safePo.authorize?.map((auth: any, idx: number) => (
                                <div key={idx} className='flex flex-col items-center break-inside-avoid'>
                                    <div className='h-14 w-20 flex items-center justify-center'>
                                        {auth.digitalSignature && auth.user ? (
                                            <img
                                                src={`${appConfig.apiPrefix}/file/download/${auth.user}/${auth.digitalSignature}`}
                                                alt='Signature'
                                                className='max-h-14 max-w-20 object-contain'
                                            />
                                        ) : (
                                            <div className='h-10 w-16 border border-black/30 rounded' />
                                        )}
                                    </div>

                                    <p className='font-bold mt-1 leading-tight'>{auth?.name}</p>
                                    <p className='text-[10px] leading-tight'>{auth?.assignOn ? formatDate(auth.assignOn as string) : ''}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PurchaseOrderPrint

const StaticTNC = () => {
    const special = [
        'Suppliers’ challans must mention our order reference, full item description and item code.',
        'Rejections due to quality/specification/delivery failure will be on supplier’s account.',
        'Rejected materials must be collected immediately upon receipt of rejection advice.',
        'Transit insurance: to be covered by you/us. Please inform dispatch particulars by email immediately.',
        'Supplier is expected to scrutinize the purchase order immediately on receipt.',
        'Objections regarding errors/omissions shall not be entertained after 10 days from receipt of the order.',
        'All bank commission charges are on supplier’s account.',
        'Bankers: Canara Bank Branch, G.E. Road, Raipur (C.G).',
        'All disputes are subject to Raipur jurisdiction only.',
    ]

    const general = [
        {
            title: 'CANCELLATION OF ORDER',
            body: 'The Company reserves the right to cancel this Order in full/part in case deliveries do not materialize as per the schedule given in this order or any amendment thereto subsequently, notwithstanding the liquidated damages clause incorporated in the Order.',
        },
        {
            title: 'RISK PURCHASE',
            body: 'If you fail to execute the Order to our satisfaction and within the delivery period indicated in the supply order (or any subsequent amendment) without valid and acceptable reasons, the Company shall arrange procurement of undelivered items at your risk and cost and such undelivered items shall be treated as cancelled from the Purchase Order placed on you.',
        },
        {
            title: 'INSPECTION',
            body: 'The material shall be subject to inspection at supplier’s place / consignee’s place before dispatch or on receipt at consignee’s place. Rejected material will be subject to replacement/removal by you at your risk, cost and responsibility. In case of outstation supplier, unaccepted goods shall be returned on freight-to-pay and any dues (like freight, etc.) paid by the Company shall be refunded by you.',
        },
        {
            title: 'WARRANTY',
            body: 'Goods/articles supplied under this purchase order shall be of best quality and workmanship and strictly in accordance with the specifications and particulars mentioned. Further, these shall be covered under warranty that goods/articles shall continue to conform to specifications/quality for a period of 12 months from the date of receipt/delivery of goods by the Company/supplier, notwithstanding inspection/approval at receipt. If during warranty goods are found non-conforming or deteriorated prematurely, supplier shall replace immediately within one month of intimation or refund total cost including freight, at Company’s discretion.',
        },
    ]

    return (
        <div className='px-3 py-2 text-[11px] leading-[1.35]'>
            {/* SPECIAL (keep this box intact if possible) */}
            <div className='print:break-inside-avoid border border-black/40 rounded-md'>
                <div className='px-2 py-1 border-b border-black/40'>
                    <p className='font-bold uppercase tracking-wide'>Special Terms &amp; Conditions</p>
                </div>

                <ol className='list-decimal pl-6 pr-2 py-2 space-y-1'>
                    {special.map((t, idx) => (
                        <li key={idx} className='text-gray-900'>
                            {t}
                        </li>
                    ))}
                </ol>
            </div>

            {/* GENERAL (allow page breaks between sections, not inside a section) */}
            <div className='mt-2 border border-black/40 rounded-md'>
                <div className='px-2 py-1 border-b border-black/40'>
                    <p className='font-bold uppercase tracking-wide'>General Terms &amp; Conditions</p>
                </div>

                <div className='px-2 py-2 space-y-2'>
                    {general.map((s, idx) => (
                        <div key={idx} className='print:break-inside-avoid'>
                            <p className='font-bold underline underline-offset-2'>{s.title}:</p>
                            <p className='mt-0.5 text-gray-900'>{s.body}</p>
                        </div>
                    ))}

                    <div className='pt-1 print:break-inside-avoid'>
                        <p className='font-bold'>Receipt of the Purchase Order may kindly be acknowledged.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
