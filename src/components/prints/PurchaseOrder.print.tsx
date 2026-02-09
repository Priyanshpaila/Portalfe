import React, { useEffect, useMemo, useState } from 'react'
import { POType as _POType, VendorType } from '@/@types/app'
import { formatDate } from '@/utils/formatDate'
import { amountInWords } from '@/utils/numberInWords'
import appConfig from '@/configs/app.config'
import { companies } from '@/utils/data'

type POType = Omit<_POType, 'authorize'> & {
    status: number | string
    progressCount: number
    authorize: (_POType['authorize'][0] & { name: string; digitalSignature: string })[]
}

function safeJsonParse<T>(raw: string): T | null {
    try {
        return JSON.parse(raw) as T
    } catch {
        return null
    }
}

function pickName(obj: any): string {
    if (!obj || typeof obj !== 'object') return ''
    return (obj?.fullName || obj?.name || obj?.username || obj?.userName || obj?.displayName || obj?.email || '').toString()
}

function getLoggedInUserLabel(): string {
    try {
        if (typeof window === 'undefined') return ''
        const candidates = ['admin', 'user', 'userDetails', 'auth_user']
        for (const key of candidates) {
            const raw = localStorage.getItem(key)
            if (!raw) continue

            const outer = safeJsonParse<any>(raw)
            if (!outer) continue

            const direct = pickName(outer)
            if (direct) return direct

            if (typeof outer?.auth === 'string') {
                const authObj = safeJsonParse<any>(outer.auth)
                const fromAuthUser = pickName(authObj?.user)
                if (fromAuthUser) return fromAuthUser
            }

            const fromOuterUser = pickName(outer?.user)
            if (fromOuterUser) return fromOuterUser
        }
        return ''
    } catch {
        return ''
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
    // ✅ hooks MUST be called unconditionally, before any early return
    const [userLabel, setUserLabel] = useState('')

    useEffect(() => {
        setUserLabel(getLoggedInUserLabel())
    }, [])

    const companyInfo = useMemo(() => {
        if (!po) return EMPTY_COMPANY

        const match: any =
            companies?.find((i: any) => i?.plantCode?.toString?.() === (po as any)?.company?.toString?.()) ||
            companies?.find((i: any) => i?.plantCode?.toString?.() === (po as any)?.companyCode?.toString?.()) ||
            companies?.[0] ||
            {}

        return {
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
    }, [po])

    const deliveryAddressText = useMemo(() => {
        if (!po) return ''
        return (po as any)?.shippingAccount?.shippingAddress || companyInfo.address || ''
    }, [po, companyInfo.address])

    // ✅ after hooks are declared, you can safely early return
    if (!po || !vendor) return null

    const items = po.items || []
    const totalQty = items.reduce((sum, item) => sum + +(item.qty || 0), 0)
    const totalBasic = items.reduce((sum, item) => sum + (item.amount?.basic || 0), 0)
    const totalCgst = items.reduce((sum, item) => sum + (item.amount?.cgst || 0), 0)
    const totalSgst = items.reduce((sum, item) => sum + (item.amount?.sgst || 0), 0)
    const totalIgst = items.reduce((sum, item) => sum + (item.amount?.igst || 0), 0)

    return (
        <div className='flex justify-center bg-gray-100 print:bg-white p-4 print:p-0'>
            <div className=' bg-white shadow-md print:shadow-none print:p-0 font-sans text-xs border border-black'>
                {/* ✅ Top header */}
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
                    <span className='absolute right-2 top-1/2 -translate-y-[50%]'>Portal PO No: {po.sapPONumber}</span>
                </div>

                {/* Supplier Details */}
                <div className='flex gap-2 border-y border-black px-2'>
                    <div className='w-3/5 border-r border-black py-1'>
                        <p className='font-bold mb-1'>Details Of Supplier</p>
                        <p className='font-bold mb-0.5'>{po.vendorName}</p>
                        <p className='mb-0.5'>{po.vendorLocation}</p>
                        <table className='w-full text-xs mt-1'>
                            <tbody>
                                <tr>
                                    <td className='py-0.5 whitespace-nowrap'>State Name</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {vendor.district}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5 whitespace-nowrap'>State Code</td>
                                    <td className='py-0.5'>: {vendor.region}</td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>GSTIN</td>
                                    <td className='py-0.5'>: {vendor.gstin}</td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>MSME No.</td>
                                    <td className='py-0.5'>: {vendor.msme}</td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>PAN No.</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {vendor.panNumber}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>Contact Detail</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : Contact Name: {po.contactPersonName || '-'} | Mo.No: {(vendor as any)?.mobile || (vendor as any)?.phone || '-'}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>Email</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {(vendor as any)?.email || '-'}
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
                                        : {po.poNumber}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>Date</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {formatDate(po.poDate as string)}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>Amend No.</td>
                                    <td className='py-0.5'>: {po.amendNumber}</td>
                                </tr>
                                <tr>
                                    <td className='py-0.5'>Date</td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {(po as any)?.amendDate ? formatDate((po as any).amendDate as string) : ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5' colSpan={1}>
                                        Party Ref No.
                                    </td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {po.partyRefNumber || ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td className='py-0.5' colSpan={1}>
                                        Party Ref Date
                                    </td>
                                    <td className='py-0.5' colSpan={3}>
                                        : {po.partyRefDate ? formatDate(po.partyRefDate as string) : ''}
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
                        <p className='font-bold mb-0.5'>{userLabel || companyInfo.name || '-'}</p>
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
                        <tr className='bg-gray-200'>
                            <th className='border-r border-gray-400 px-1 py-0.5 text-center'>#</th>
                            <th className='border-r border-gray-400 px-1 py-0.5 text-center'></th>
                            <th className='border-r border-gray-400 px-1 py-0.5 text-center'></th>
                            <th className='border-r border-gray-400 px-1 py-0.5 text-center'></th>
                            <th className='border-r border-gray-400 px-1 py-0.5 text-center'></th>
                            <th className='border-r border-gray-400 px-1 py-0.5 text-center'></th>
                            <th className='border-r border-gray-400 px-1 py-0.5 text-center'>Value</th>
                            <th className='border-r border-gray-400 px-1 py-0.5 text-center'>Value</th>
                            <th className='border-r border-gray-400 px-1 py-0.5 text-center'>Value</th>
                            <th className='border-r border-gray-400 px-1 py-0.5 text-center'>Value</th>
                            <th className='border-gray-400 px-1 py-0.5 text-center'></th>
                        </tr>
                    </thead>

                    <tbody>
                        {po.items.map((item, idx) => (
                            <tr key={item.itemCode + idx}>
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
                                <td className='align-top border-r border-gray-400 px-1 py-0.5 text-right'>{(+item.qty)?.toFixed?.(3)}</td>
                                <td className='align-top border-r border-gray-400 px-1 py-0.5 text-center'>{item.unit}</td>
                                <td className='align-top border-r border-gray-400 px-1 py-0.5 text-right'>{(+item.rate)?.toFixed?.(2)}</td>
                                <td className='align-top border-r border-gray-400 px-1 py-0.5 text-right'>{item.amount?.basic?.toFixed?.(2)}</td>

                                <td className='align-top border-r border-gray-400 px-1 py-0.5 text-right'>
                                    {item.taxDetails?.find((t) => t.taxField === 'cgst')?.chargeValue
                                        ? `${item.taxDetails.find((t) => t.taxField === 'cgst')?.chargeValue}%`
                                        : ''}
                                </td>
                                <td className='align-top border-r border-gray-400 px-1 py-0.5 text-right'>
                                    {item.taxDetails?.find((t) => t.taxField === 'sgst')?.chargeValue
                                        ? `${item.taxDetails.find((t) => t.taxField === 'sgst')?.chargeValue}%`
                                        : ''}
                                </td>
                                <td className='align-top border-r border-gray-400 px-1 py-0.5 text-right'>
                                    {item.taxDetails?.find((t) => t.taxField === 'igst')?.chargeValue
                                        ? `${item.taxDetails.find((t) => t.taxField === 'igst')?.chargeValue}%`
                                        : ''}
                                </td>
                                <td className='align-top border-r border-gray-400 px-1 py-0.5 text-right'>
                                    {item.taxDetails?.find((t) => t.chargeName?.toLowerCase().includes('cess'))?.chargeValue
                                        ? `${item.taxDetails.find((t) => t.chargeName?.toLowerCase().includes('cess'))?.chargeValue}%`
                                        : ''}
                                </td>
                                <td className='align-top px-1 py-0.5 text-right'>{(+item.amount?.total)?.toFixed(2)}</td>
                            </tr>
                        ))}

                        <tr className='font-bold'>
                            <td className='border-y border-r border-gray-400 px-1 py-0.5'></td>
                            <td className='border-y border-r border-gray-400 px-1 py-0.5 text-right'>Total</td>
                            <td className='border-y border-r border-gray-400 px-1 py-0.5 text-right'>{totalQty?.toFixed?.(2)}</td>
                            <td className='border-y border-r border-gray-400 px-1 py-0.5'></td>
                            <td className='border-y border-r border-gray-400 px-1 py-0.5'></td>
                            <td className='border-y border-r border-gray-400 px-1 py-0.5 text-right'>{totalBasic?.toFixed?.(2)}</td>
                            <td className='border-y border-r border-gray-400 px-1 py-0.5 text-right'>{totalCgst?.toFixed?.(2)}</td>
                            <td className='border-y border-r border-gray-400 px-1 py-0.5 text-right'>{totalSgst?.toFixed?.(2)}</td>
                            <td className='border-y border-r border-gray-400 px-1 py-0.5 text-right'>{totalIgst?.toFixed?.(2)}</td>
                            <td className='border-y border-r border-gray-400 px-1 py-0.5'></td>
                            <td className='border-y border-gray-400 px-1 py-0.5 text-right'>{po.amount.total?.toFixed?.(2)}</td>
                        </tr>

                        {/* the rest unchanged */}
                        <tr>
                            <td className='border-r border-b border-gray-400 px-1 py-0.5' colSpan={6}></td>
                            <td className='border-r border-b border-gray-400 px-1 py-0.5' colSpan={3}>
                                <span className='block'>CENTRAL GST</span>
                                <span className='block'>STATE GST</span>
                            </td>
                            <td className='border-b border-gray-400 px-1 py-0.5 text-right' colSpan={2}>
                                <span className='block'>{po.amount.total?.toFixed?.(2)}</span>
                                <span className='block'>{totalSgst?.toFixed?.(2)}</span>
                            </td>
                        </tr>

                        <tr>
                            <td className='border-r border-b border-gray-400 px-1 py-0.5' colSpan={6}></td>
                            <td className='border-r border-b border-gray-400 px-1 py-0.5 font-bold' colSpan={3}>
                                TOTAL STATE GST
                            </td>
                            <td className='border-b border-gray-400 px-1 py-0.5 text-right' colSpan={2}>
                                {totalSgst?.toFixed?.(2)}
                            </td>
                        </tr>

                        <tr>
                            <td className='border-r border-b border-gray-400 px-1 py-0.5' colSpan={2}>
                                Total Invoice Value (In words)
                            </td>
                            <td className='border-r border-b border-gray-400 px-1 py-0.5 font-bold' colSpan={4}>
                                {amountInWords(po.amount?.total || 0)}
                            </td>
                            <td className='border-r border-b border-gray-400 px-1 py-0.5 font-bold' colSpan={3}>
                                TOTAL INVOICE VALUE
                            </td>
                            <td className='border-b border-gray-400 px-1 py-0.5 text-right' colSpan={2}>
                                {(po.amount?.total || 0)?.toFixed?.(2)}
                            </td>
                        </tr>

                        <tr>
                            <td className='border-b font-bold border-gray-400 px-1 py-0.5' colSpan={11}>
                                Remarks
                            </td>
                        </tr>
                        <tr>
                            <td className='border-b border-gray-400 px-1 py-0.5' colSpan={11}>
                                {po.remarks}
                            </td>
                        </tr>

                        <tr>
                            <td className='border-b font-bold border-gray-400 px-1 py-0.5' colSpan={11}>
                                Payment Terms
                            </td>
                        </tr>
                        <tr>
                            <td className='border-b border-gray-400 px-1 py-0.5' colSpan={11}>
                                {po.paymentTerms?.map((pt, i) => (
                                    <div key={i}>
                                        {pt.paymentType} -- {pt.payValuePercent?.toFixed?.(2)}% on {pt.payOn} within {pt.days} Days
                                    </div>
                                ))}
                            </td>
                        </tr>

                        <tr>
                            <td className='border-b font-bold border-gray-400 px-1 py-0.5' colSpan={11}>
                                Terms & Conditions
                            </td>
                        </tr>
                        <tr>
                            <td className='border-b border-gray-400 px-1 py-0.5' colSpan={11}>
                                {Object.entries(po.termsConditions || {}).map(([k, v], i) => (
                                    <div key={'tnc:' + i}>
                                        <span className='font-bold capitalize'>{k.replace(/-/g, ' ')}:</span> {v as any}
                                    </div>
                                ))}
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div>
                    <StaticTNC />

                    <div className=' border-t border-black'>
                        <div className='text-right'>
                            <p className='font-bold mt-2 pr-2'>For {companyInfo.name || '-'}</p>

                            <div className='flex justify-evenly gap-4 p-2 text-center mt-4'>
                                {po.authorize?.map((auth, idx) => (
                                    <div key={idx} className='flex flex-col items-center'>
                                        {auth.digitalSignature && (
                                            <div className='w-12 h-12 overflow-hidden mb-2'>
                                                <img
                                                    src={`${appConfig.apiPrefix}/file/download/${auth.user}/${auth.digitalSignature}`}
                                                    alt='Signature'
                                                    className='object-cover w-full h-full'
                                                />
                                            </div>
                                        )}
                                        <p className='font-bold'>{auth?.name}</p>
                                        <p>{formatDate(auth.assignOn as string)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PurchaseOrderPrint

const StaticTNC = () => {
    return (
        <div className='p-1 pl-3'>
            {/* unchanged */}
            <p className='font-bold mb-1'>SPECIAL TERMS AND CONDITIONS :-</p>
            <ul className='list-none pl-0 space-y-0.5'>
                <li>1.Suppliers All Challans should bear our order references, full descriptions of items, and code there of.</li>
                <li>2.Rejected on account of quality, specification, delivery failure will be on your A/c.</li>
                <li>3.Rejected materials must be collected from our work immediately on receipt of rejection advice,</li>
                <li>4.TRANSIT INSURANCE: To be converted by you/us.please inform dispatch particular by e-mail immediately.</li>
                <li>5. The supplier is expected to scrutinize the purchase order immediately on receipt thereof.</li>
                <li>
                    6.Objection regarding errors & ommision, if any, shall not be entertained after the expiry of 10 days from date of the receipt of order.
                </li>
                <li>7.All Bank commission on your account.</li>
                <li>8.BANKERS: (1) Canara Bank Branch, G.E Road, Raipur (C.G)</li>
                <li>9.All disputes are subject to Raipur jurisdiction only.</li>
            </ul>

            <div>
                <p className='font-bold mt-2 mb-1'>GENERAL TERMS AND CONDITIONS :-</p>
            </div>

            {/* rest unchanged */}
            <p className='font-bold underline mb-1'>CANCELLATION OF ORDER:</p>
            <p className='mb-1'>
                The Company reserves the right to cancel this Order in full / part indentQty in case deliveries do not materialize as per schedule given in this
                order or any amendment there to subsequently, notwithstanding the liquidated damages clause incorporated in the Order.
            </p>

            <p className='font-bold underline mb-1'>RISK PURCHASE:</p>
            <p className='mb-1'>
                If you fail to execute the Order to our satisfaction and within the delivery period indicated in the supply order or any amendment there of
                subsequently issued, without valid and acceptable reasons, this company shall arrange procurement of undelivered items at your risk and cost and
                such undelivered items shall automatically be treated as cancelled from the purchase Order placed on you.
            </p>

            <p className='font-bold underline mb-1'>INSPECTION:</p>
            <p className='mb-1'>
                The material shall be subject to inspection at firm{"'"}s place/at consignee{"'"}s place before dispatch/on receipt at consignee{"'"}s place.
                The rejected materials will be subject to replacement/ removal by you at your risk, cost and responsibility. In case of outstation firm,
                unaccepted goods shall be returned on freight to pay and dues, if any, like freight etc. paid by the Company are refunded by you.
            </p>

            <p className='font-bold underline mb-1'>WARRANTY:</p>
            <p className='mb-1'>
                Goods / articles to be supplied under this purchase order shall be of the best quality and workmanship and shall be strictly in accordance with
                the specifications and particulars mentioned in the purchase order. Further, these shall be covered under the warranty that goods / articles
                under this order would continue to confirm to the specifications and quality mentioned in the supply order for a period of 12 month from the
                date of receipt/delivery of goods by the Company/supplier, notwithstanding the fact that the Company inspector may have initially inspected or
                approved the goods on receipt. If during the period of warranty, the goods are found to be not conforming to the specifications/quality
                mentioned in the supply order or found to have deteriorated prematurely it shall be binding on the supplier to replace the goods immediately and
                within a period of the month of receipt of intimation from the Company or refund the total cost of the goods including freight charges etc, to
                the Company at our discretion.
            </p>

            {/* ... keep rest as-is ... */}
            <p className='mb-1 font-bold'>Receipt of the Purchase Order may kindly be acknowledged.</p>
        </div>
    )
}
