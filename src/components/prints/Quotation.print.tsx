import React, { useEffect, useMemo, useState } from 'react'
import { QuotationType } from '@/@types/app'
import { CHARGE_TYPES, companies } from '@/utils/data'
import { formatDate } from '@/utils/formatDate'
import { amountInWords } from '@/utils/numberInWords'

function safeJsonParse<T>(raw: string): T | null {
    try {
        return JSON.parse(raw) as T
    } catch {
        return null
    }
}

function pickName(obj: any): string {
    if (!obj || typeof obj !== 'object') return ''
    return (
        obj?.fullName ||
        obj?.name ||
        obj?.username ||
        obj?.userName ||
        obj?.displayName ||
        obj?.email ||
        ''
    ).toString()
}

function getLoggedInUserLabel(): string {
    try {
        if (typeof window === 'undefined') return ''
        const candidates = ['admin', 'user', 'userDetails', 'auth_user'] // ✅ add your real key if different
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

const QuotationPrint = ({ quotation, vendorName }: { quotation: QuotationType; vendorName: string }) => {
    const [userLabel, setUserLabel] = useState('')

    useEffect(() => {
        setUserLabel(getLoggedInUserLabel())
    }, [])

    const companyInfo = useMemo(() => {
        const match = companies?.find((i: any) => i?.plantCode === quotation?.companyCode) || companies?.[0] || {}
        return {
            name: match?.companyName || '',
    
            email: match?.email || '',
        }
    }, [quotation?.companyCode])

    const printedAt = useMemo(() => {
        const d = new Date()
        const dd = String(d.getDate()).padStart(2, '0')
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const yyyy = d.getFullYear()
        let hh = d.getHours()
        const min = String(d.getMinutes()).padStart(2, '0')
        const ampm = hh >= 12 ? 'PM' : 'AM'
        hh = hh % 12
        hh = hh ? hh : 12
        return `${dd}/${mm}/${yyyy} ${String(hh).padStart(2, '0')}:${min} ${ampm}`
    }, [])

    return (
        <div>
            <div className='max-w-3xl mx-auto text-gray-800 border border-black text-xs'>
                {/* ✅ Header (NO hardcoded address) */}
                <div className='text-center border-b p-1 border-b-black'>
                    <h1 className='text-lg font-bold'>{companyInfo.name}</h1>

                    {/* only show contact line if exists */}
                    {(companyInfo.phone || companyInfo.telefax || companyInfo.email) && (
                        <p>
                            {companyInfo.phone ? `Phone: ${companyInfo.phone} ` : ''}
                            {companyInfo.telefax ? `Telefax: ${companyInfo.telefax} ` : ''}
                            {companyInfo.email ? `Email: ${companyInfo.email}` : ''}
                        </p>
                    )}
                </div>

                {/* Title */}
                <div className='font-semibold p-2'>
                    <span className='text-lg font-bold block border border-black w-fit m-auto px-6' style={{ boxShadow: '5px 5px' }}>
                        Quotation
                    </span>
                </div>

                {/* Info */}
                <div className='flex'>
                    {/* ✅ Party Name block (NO hardcoded RR Ispat) */}
                    <div className='flex-1 border-y border-r border-black p-[2px]'>
                        <div>
                            <b>Party Name</b>
                        </div>
                        <div>M/s</div>

                        <table className='ml-6'>
                            <tbody>
                                <tr>
                                    <td colSpan={3}>
                                        <span className='font-bold'>{userLabel || '-'}</span>
                                    </td>
                                </tr>

                                {/* If you still want to show something like contact details, use quotation fields (not hardcoded) */}
                                {quotation?.contactEmail && (
                                    <tr>
                                        <td>Email</td>
                                        <td>:</td>
                                        <td>{quotation.contactEmail}</td>
                                    </tr>
                                )}
                                {quotation?.contactNumber && (
                                    <tr>
                                        <td>Phone</td>
                                        <td>:</td>
                                        <td>{quotation.contactNumber}</td>
                                    </tr>
                                )}

                                {/* Optional: if you have GST/state inside quotation, show it here */}
                                {(quotation as any)?.gstNo && (
                                    <tr>
                                        <td>GST No.</td>
                                        <td>:</td>
                                        <td>{(quotation as any).gstNo}</td>
                                    </tr>
                                )}
                                {(quotation as any)?.stateCode && (
                                    <tr>
                                        <td>State Code</td>
                                        <td>:</td>
                                        <td>{(quotation as any).stateCode}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className='flex-1 border-y border-black'>
                        <table>
                            <tbody>
                                <tr>
                                    <td className='px-[2px]'>Quotation No.</td>
                                    <td className='px-[2px]'>:</td>
                                    <td className='px-[2px]'>{quotation?.quotationNumber}</td>
                                </tr>
                                <tr>
                                    <td className='px-[2px]'>Quotation Date</td>
                                    <td className='px-[2px]'>:</td>
                                    <td className='px-[2px]'>{formatDate(quotation?.quotationDate as string)}</td>
                                </tr>
                                <tr>
                                    <td className='px-[2px]'>Vendor</td>
                                    <td className='px-[2px]'>:</td>
                                    <td className='px-[2px]'>
                                        {vendorName} ({quotation?.vendorCode})
                                    </td>
                                </tr>
                                <tr>
                                    <td className='px-[2px]'>RFQ No.</td>
                                    <td className='px-[2px]'>:</td>
                                    <td className='px-[2px]'>{quotation?.rfqNumber}</td>
                                </tr>
                                <tr>
                                    <td className='px-[2px]'>RFQ Date</td>
                                    <td className='px-[2px]'>:</td>
                                    <td className='px-[2px]'>{formatDate(quotation?.rfqDate as string)}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div className='flex border-t border-black'>
                            <table>
                                <tbody>
                                    <tr>
                                        <td className='px-[2px]'>Payment Mode</td>
                                        <td className='px-[2px]'>:</td>
                                        <td className='px-[2px]'>{quotation?.paymentMode}</td>
                                    </tr>
                                    <tr>
                                        <td className='px-[2px]'>Freight</td>
                                        <td className='px-[2px]'>:</td>
                                        <td className='px-[2px]'>{quotation?.freightType}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <table className='ml-auto'>
                                <tbody>
                                    <tr>
                                        <td className='px-[2px]'>Validity</td>
                                        <td className='px-[2px]'>:</td>
                                        <td className='px-[2px]'>{formatDate(quotation?.validityDate as string)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className='flex justify-evenly'>
                    <div>
                        <span>Party Contact Person :</span> <span>{quotation?.contactPersonName}</span>
                    </div>
                    <div>
                        <span>Email :</span> <span>{quotation?.contactEmail}</span>
                    </div>
                    <div>
                        <span>Contact No. :</span> <span>{quotation?.contactNumber}</span>
                    </div>
                </div>

                {/* Item Table */}
                <div>
                    <table className='w-full border border-black'>
                        <thead>
                            <tr>
                                <th className='border border-l-transparent border-black p-[2px]'>Sl No</th>
                                <th className='border border-black p-[2px]'>Item Description</th>
                                <th className='border border-black p-[2px]'>UOM</th>
                                <th className='border border-black p-[2px]'>Delivery Days</th>
                                <th className='border border-black p-[2px]'>Qty.</th>
                                <th className='border border-black p-[2px]'>Rate/Unit</th>
                                <th className='border border-black p-[2px]'>Disc/Charges</th>
                                <th className='border border-r-transparent border-black p-[2px]'>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotation?.items?.map((item, idx) => (
                                <tr key={`${item.itemCode}-${idx}`}>
                                    <td className='border border-l-transparent border-black p-[2px] text-center'>{idx + 1}</td>
                                    <td className='border border-black p-[2px]'>{item.itemDescription}</td>
                                    <td className='border border-black p-[2px]'>{item.unit}</td>
                                    <td className='border border-black p-[2px] text-right'>{item.delivery}</td>
                                    <td className='border border-black p-[2px] text-right'>{item.qty}</td>
                                    <td className='border border-black p-[2px] text-right'>{item.rate}</td>
                                    <td className='border border-black p-[2px] text-right'>{item.discountAmount}</td>
                                    <td className='border border-r-transparent border-black p-[2px] text-right'>{item.amount.total}</td>
                                </tr>
                            ))}
                            <tr className='font-bold'>
                                <td colSpan={7} className='p-[2px] text-right border border-black border-x-transparent'>
                                    Total Amount:
                                </td>
                                <td className='p-[2px] border border-black border-x-transparent text-right'>{quotation?.amount.total}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Terms and Conditions */}
                <div className='flex'>
                    <div className='w-2/5'>
                        <span className='font-bold p-[2px] underline'>Terms & Conditions</span>
                        <ul className='list-disc pl-5'>
                            {Object.keys(quotation?.termsConditions || {}).map((term, index) => (
                                <li key={index}>
                                    <div className='flex'>
                                        <span className='px-[2px] block'>{term}</span>
                                        <span className='px-[2px]'>:</span>
                                        <span className='px-[2px] w-full'>{(quotation as any)?.termsConditions?.[term]}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className='flex border-l border-black w-3/5'>
                        <table className='w-full h-fit'>
                            <thead>
                                <tr>
                                    <th className='border-r-black border-r'>Other Charges</th>
                                    <th className='border-r-black border-r'>Description</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(quotation?.charges || {}).map(([key, value], index) => (
                                    <tr key={index}>
                                        <td className='px-[2px] border-t border-r border-black'>{CHARGE_TYPES.find((i) => i.value === key)?.label}</td>
                                        <td className='px-[2px] border-t border-r border-black'>{(value as any)?.description}</td>
                                        <td className='px-[2px] border-t border-black text-right'>{(value as any)?.amount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className='flex space-between border-black border-y'>
                    <div className='flex-1 px-[2px]'>
                        <span>Rs. (In Words)</span>
                        <span className='px-2'>:</span>
                        <span className='font-bold'>{amountInWords(quotation?.amount.total)}</span>
                    </div>
                    <div className='text-right px-[2px]'>
                        <span className='font-bold'>Net Amount</span>
                        <span className='px-2'>:</span>
                        <span className='font-bold'>{quotation?.amount.total}</span>
                    </div>
                </div>

                {/* Footer (NO hardcoded RR Ispat) */}
                <div>
                    <div className='p-[2px]'>
                        {!!companyInfo.name && <p className='text-right font-bold'>For, {companyInfo.name}</p>}
                    </div>
                    <div className='pt-8 pb-1 px-[2px]'>
                        <p className='uppercase text-sm'>(Authorized Signature)</p>
                    </div>
                    <div className='pt-8 pb-1 flex justify-evenly border-y border-black'>
                        <span>Prepared By</span>
                        <span>Checked By</span>
                        <span>HOD Sign</span>
                    </div>
                </div>

                <div className='p-[2px] flex justify-between'>
                    <span>{printedAt}</span>
                    <span>Page 1/1</span>
                </div>
            </div>
        </div>
    )
}

export default QuotationPrint