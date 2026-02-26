import React, { useEffect, useMemo, useState } from 'react'
import { QuotationType } from '@/@types/app'
import { CHARGE_TYPES, companies } from '@/utils/data'
import { formatDate } from '@/utils/formatDate'
import { amountInWords } from '@/utils/numberInWords'
import { UserApi } from '@/services/user.api'

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

function fmtNum(n: any) {
    const x = Number(n)
    return Number.isFinite(x) ? x.toFixed(2) : ''
}

const QuotationPrint = ({ quotation, vendorName }: { quotation: QuotationType; vendorName: string }) => {
    const [meUser, setMeUser] = useState<MeUser | null>(null)

    useEffect(() => {
        ;(async () => {
            const u = await fetchMeUser()
            setMeUser(u)
        })()
    }, [])

    const meCompany = meUser?.company || {}
    const meCompanyName = String(meCompany?.name || '').trim()
    const meCompanyAddress = buildCompanyAddress(meCompany)
    const meCompanyPhone = String(meCompany?.phone || '').trim()
    const meCompanyGstin = String(meCompany?.gstin || '').trim()
    const meCompanyPan = String(meCompany?.pan || '').trim()
    const meEmail = String(meUser?.email || '').trim()

    const companyInfo = useMemo(() => {
        const match: any = companies?.find((i: any) => i?.plantCode === (quotation as any)?.companyCode) || companies?.[0] || {}

        return {
            name: meCompanyName || match?.companyName || '',
            address: meCompanyAddress || match?.address || match?.companyAddress || '',
            phone: meCompanyPhone || match?.phone || '',
            gstin: meCompanyGstin || match?.gstin || match?.gstNo || '',
            pan: meCompanyPan || match?.pan || match?.panNo || '',
            telefax: match?.telefax || match?.fax || '',
            email: meEmail || match?.email || '',
        }
    }, [quotation, meCompanyName, meCompanyAddress, meCompanyPhone, meCompanyGstin, meCompanyPan, meEmail])

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

    const safeTerms = useMemo(() => {
        return Object.entries(quotation?.termsConditions || {})
            .map(([k, v]) => [String(k), String(v ?? '')] as const)
            .filter(([k, v]) => k.trim() && v.trim())
    }, [quotation])

    const safeCharges = useMemo(() => {
        const entries = Object.entries(quotation?.charges || {})
            .map(([k, v]) => ({ key: String(k), val: v as any }))
            .filter((x) => x.key && x.val)
        return entries
    }, [quotation])

    const total = Number(quotation?.amount?.total || 0)

    // safe (hooks already executed)
    if (!quotation) return null

    return (
        <div className="bg-gray-100 print:bg-white p-4 print:p-0">
            <div className="max-w-[820px] mx-auto bg-white border border-black text-[11px] leading-[1.35] print:shadow-none shadow-sm">
                {/* Header */}
                <div className="border-b border-black px-3 py-2 text-center">
                    <div className="text-[16px] font-extrabold uppercase tracking-wide">{companyInfo.name || '—'}</div>

                    {companyInfo.address ? <div className="mt-0.5 text-[11px]">{companyInfo.address}</div> : null}

                    <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[10.5px]">
                        {companyInfo.phone ? <span>Phone: {companyInfo.phone}</span> : null}
                        {companyInfo.telefax ? <span>Fax: {companyInfo.telefax}</span> : null}
                        {companyInfo.email ? <span>Email: {companyInfo.email}</span> : null}
                        {companyInfo.gstin ? <span>GSTIN: {companyInfo.gstin}</span> : null}
                        {companyInfo.pan ? <span>PAN: {companyInfo.pan}</span> : null}
                    </div>

                    {/* Title */}
                    <div className="mt-2 flex justify-center">
                        <div className="px-6 py-1 border border-black font-bold text-[14px] tracking-wide">
                            QUOTATION
                        </div>
                    </div>
                </div>

                {/* Top info blocks */}
                <div className="grid grid-cols-2 border-b border-black">
                    {/* Party */}
                    <div className="border-r border-black p-3 break-inside-avoid">
                        <div className="font-bold uppercase text-[11px] tracking-wide">Party Details</div>
                        <div className="mt-1">
                            <div className="font-bold">M/s {meCompanyName || '—'}</div>
                            {companyInfo.address ? <div className="text-[11px] mt-0.5">{companyInfo.address}</div> : null}
                        </div>

                        <div className="mt-2">
                            <table className="w-full">
                                <tbody>
                                    <tr>
                                        <td className="w-[90px] font-semibold">Contact</td>
                                        <td className="px-1">:</td>
                                        <td>{quotation?.contactPersonName || '—'}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-semibold">Email</td>
                                        <td className="px-1">:</td>
                                        <td>{quotation?.contactEmail || '—'}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-semibold">Phone</td>
                                        <td className="px-1">:</td>
                                        <td>{quotation?.contactNumber || '—'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Quotation meta */}
                    <div className="p-3 break-inside-avoid">
                        <div className="font-bold uppercase text-[11px] tracking-wide">Quotation Details</div>

                        <table className="w-full mt-1">
                            <tbody>
                                <tr>
                                    <td className="w-[120px] font-semibold">Quotation No.</td>
                                    <td className="px-1">:</td>
                                    <td className="font-bold">{quotation?.quotationNumber || '—'}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold">Quotation Date</td>
                                    <td className="px-1">:</td>
                                    <td>{quotation?.quotationDate ? formatDate(quotation.quotationDate as any) : '—'}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold">Vendor</td>
                                    <td className="px-1">:</td>
                                    <td>
                                        {vendorName || '—'} {quotation?.vendorCode ? `(${quotation.vendorCode})` : ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="font-semibold">RFQ No.</td>
                                    <td className="px-1">:</td>
                                    <td>{quotation?.rfqNumber || '—'}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold">RFQ Date</td>
                                    <td className="px-1">:</td>
                                    <td>{quotation?.rfqDate ? formatDate(quotation.rfqDate as any) : '—'}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold">Validity</td>
                                    <td className="px-1">:</td>
                                    <td>{quotation?.validityDate ? formatDate(quotation.validityDate as any) : '—'}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold">Payment Mode</td>
                                    <td className="px-1">:</td>
                                    <td>{quotation?.paymentMode || '—'}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold">Freight</td>
                                    <td className="px-1">:</td>
                                    <td>{quotation?.freightType || '—'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Items */}
                <div className="p-3 break-inside-avoid">
                    <div className="font-bold uppercase text-[11px] tracking-wide mb-2">Item Details</div>

                    <table className="w-full border border-black border-collapse table-fixed">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="border border-black px-1 py-1 w-[44px]">#</th>
                                <th className="border border-black px-1 py-1">Item Description</th>
                                <th className="border border-black px-1 py-1 w-[60px]">UOM</th>
                                <th className="border border-black px-1 py-1 w-[80px]">Del. Days</th>
                                <th className="border border-black px-1 py-1 w-[70px] text-right">Qty</th>
                                <th className="border border-black px-1 py-1 w-[85px] text-right">Rate</th>
                                <th className="border border-black px-1 py-1 w-[95px] text-right">Disc/Chg</th>
                                <th className="border border-black px-1 py-1 w-[95px] text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(quotation?.items || []).map((item: any, idx: number) => (
                                <tr key={`${item.itemCode || 'item'}-${idx}`}>
                                    <td className="border border-black px-1 py-1 text-center">{idx + 1}</td>
                                    <td className="border border-black px-1 py-1">
                                        <div className="font-semibold">{item?.itemDescription || '—'}</div>
                                    </td>
                                    <td className="border border-black px-1 py-1 text-center">{item?.unit || '—'}</td>
                                    <td className="border border-black px-1 py-1 text-right">{item?.delivery ?? '—'}</td>
                                    <td className="border border-black px-1 py-1 text-right">{item?.qty ?? '—'}</td>
                                    <td className="border border-black px-1 py-1 text-right">{fmtNum(item?.rate)}</td>
                                    <td className="border border-black px-1 py-1 text-right">{fmtNum(item?.discountAmount)}</td>
                                    <td className="border border-black px-1 py-1 text-right font-semibold">{fmtNum(item?.amount?.total)}</td>
                                </tr>
                            ))}

                            <tr className="font-bold bg-gray-50">
                                <td className="border border-black px-1 py-1" colSpan={7}>
                                    Total Amount
                                </td>
                                <td className="border border-black px-1 py-1 text-right">{fmtNum(total)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="mt-2 flex items-start justify-between gap-2 border border-black p-2">
                        <div className="flex-1">
                            <span className="font-semibold">Amount (In Words): </span>
                            <span className="font-bold">{amountInWords(total)}</span>
                        </div>
                        <div className="min-w-[160px] text-right">
                            <div className="font-semibold">Net Amount</div>
                            <div className="font-bold">{fmtNum(total)}</div>
                        </div>
                    </div>
                </div>

                {/* Terms + Charges */}
                <div className="grid grid-cols-2 border-t border-black">
                    {/* Terms */}
                    <div className="border-r border-black p-3 break-inside-avoid">
                        <div className="font-bold uppercase text-[11px] tracking-wide mb-2">Terms &amp; Conditions</div>

                        {safeTerms.length ? (
                            <table className="w-full border border-black border-collapse">
                                <tbody>
                                    {safeTerms.map(([k, v], idx) => (
                                        <tr key={idx}>
                                            <td className="border border-black px-1 py-1 w-[45%] font-semibold capitalize">
                                                {k.replace(/[_-]+/g, ' ')}
                                            </td>
                                            <td className="border border-black px-1 py-1">{v}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="border border-black p-2 text-center opacity-70">No terms provided.</div>
                        )}
                    </div>

                    {/* Charges */}
                    <div className="p-3 break-inside-avoid">
                        <div className="font-bold uppercase text-[11px] tracking-wide mb-2">Other Charges</div>

                        {safeCharges.length ? (
                            <table className="w-full border border-black border-collapse table-fixed">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th className="border border-black px-1 py-1 w-[38%]">Charge</th>
                                        <th className="border border-black px-1 py-1">Description</th>
                                        <th className="border border-black px-1 py-1 w-[80px] text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {safeCharges.map((c, idx) => (
                                        <tr key={idx}>
                                            <td className="border border-black px-1 py-1 font-semibold">
                                                {CHARGE_TYPES.find((i) => i.value === c.key)?.label || c.key}
                                            </td>
                                            <td className="border border-black px-1 py-1">{String(c.val?.description || '—')}</td>
                                            <td className="border border-black px-1 py-1 text-right">{fmtNum(c.val?.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="border border-black p-2 text-center opacity-70">No charges.</div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-black px-3 py-2">
                    <div className="flex items-end justify-between">
                        <div className="text-[10.5px]">
                            <div className="font-semibold">Printed At</div>
                            <div>{printedAt}</div>
                        </div>

                        <div className="text-right">
                            <div className="font-bold">For, {companyInfo.name || '—'}</div>
                            <div className="mt-6 text-[10.5px]">(Authorized Signature)</div>
                        </div>
                    </div>

                    <div className="mt-3 border-t border-black pt-2 flex justify-between text-[10.5px]">
                        <span>Prepared By</span>
                        <span>Checked By</span>
                        <span>HOD Sign</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default QuotationPrint