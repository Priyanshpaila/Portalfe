import React, { useEffect, useMemo, useState } from 'react'
import { RFQType } from '@/@types/app'
import { companies } from '@/utils/data'
import { formatDate } from '@/utils/formatDate'
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

const RFQPrint = ({ rfq }: { rfq: Omit<RFQType, 'status'> }) => {
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

    const masterMatch = useMemo(() => {
        return (
            companies?.find((c: any) => c?.plantCode?.toString() === (rfq as any)?.company?.toString()) ||
            companies?.find((c: any) => c?.companyName?.toString() === (rfq as any)?.company?.toString()) ||
            companies?.find((c: any) => c?.companyName?.toString() === (rfq as any)?.companyName?.toString()) ||
            companies?.[0] ||
            {}
        )
    }, [rfq])

    const companyInfo = useMemo(() => {
        return {
            name: meCompanyName || masterMatch?.companyName || (rfq as any)?.companyName || (rfq as any)?.company || '',
            address: meCompanyAddress || masterMatch?.address || masterMatch?.companyAddress || '',
            gstin: meCompanyGstin || masterMatch?.gstin || masterMatch?.gstNo || '',
            pan: meCompanyPan || masterMatch?.pan || masterMatch?.panNo || '',
            phone: meCompanyPhone || masterMatch?.phone || '',
            email: meEmail || masterMatch?.email || '',
        }
    }, [meCompanyName, meCompanyAddress, meCompanyGstin, meCompanyPan, meCompanyPhone, meEmail, masterMatch, rfq])

    // safe (hooks already executed)
    if (!rfq) return null

    return (
        <div className="bg-gray-100 print:bg-white p-4 print:p-0">
            <div className="max-w-[820px] mx-auto bg-white border border-black text-[11px] leading-[1.35] shadow-sm print:shadow-none">
                {/* Header */}
                <div className="border-b border-black px-3 py-2 relative text-center">
                    <div className="text-[16px] font-extrabold uppercase tracking-wide">{companyInfo.name || '—'}</div>

                    {companyInfo.address ? <div className="mt-0.5 text-[11px]">{companyInfo.address}</div> : null}

                    <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[10.5px]">
                        {companyInfo.phone ? <span>Phone: {companyInfo.phone}</span> : null}
                        {companyInfo.email ? <span>Email: {companyInfo.email}</span> : null}
                        {companyInfo.gstin ? <span>GSTIN: {companyInfo.gstin}</span> : null}
                        {companyInfo.pan ? <span>PAN: {companyInfo.pan}</span> : null}
                    </div>

                    <img
                        src="/img/logo/logo-title.png"
                        className="absolute left-2 top-1/2 -translate-y-1/2 print:hidden"
                        width={120}
                        alt="logo"
                    />

                    <div className="mt-2 flex justify-center">
                        <div className="px-6 py-1 border border-black font-bold text-[14px] tracking-wide">
                            REQUEST FOR QUOTATION
                        </div>
                    </div>
                </div>

                {/* RFQ meta */}
                <div className="grid grid-cols-2 border-b border-black">
                    <div className="border-r border-black p-3 break-inside-avoid">
                        <div className="font-bold uppercase text-[11px] tracking-wide mb-1">Enquiry Details</div>
                        <table className="w-full">
                            <tbody>
                                <tr>
                                    <td className="w-[110px] font-semibold">Enquiry No.</td>
                                    <td className="px-1">:</td>
                                    <td className="font-bold">{rfq?.rfqNumber || '—'}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold">Enquiry Date</td>
                                    <td className="px-1">:</td>
                                    <td>{rfq?.rfqDate ? formatDate(rfq.rfqDate as any) : '—'}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold">Due Date</td>
                                    <td className="px-1">:</td>
                                    <td>{rfq?.dueDate ? formatDate(rfq.dueDate as any) : '—'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="p-3 break-inside-avoid">
                        <div className="font-bold uppercase text-[11px] tracking-wide mb-1">Contact Details</div>
                        <table className="w-full">
                            <tbody>
                                <tr>
                                    <td className="w-[110px] font-semibold">Contact Person</td>
                                    <td className="px-1">:</td>
                                    <td>{(rfq as any)?.contactPersonName || '—'}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold">Contact No.</td>
                                    <td className="px-1">:</td>
                                    <td>{(rfq as any)?.contactNumber || '—'}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold">Email</td>
                                    <td className="px-1">:</td>
                                    <td>{(rfq as any)?.contactEmail || '—'}</td>
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
                                <th className="border border-black px-1 py-1 w-[120px]">Item Code</th>
                                <th className="border border-black px-1 py-1">Description</th>
                                <th className="border border-black px-1 py-1 w-[120px]">Make</th>
                                <th className="border border-black px-1 py-1 w-[70px]">UOM</th>
                                <th className="border border-black px-1 py-1 w-[80px] text-right">Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(rfq?.items || []).map((item: any, idx: number) => (
                                <tr key={`${item.itemCode || 'item'}-${idx}`}>
                                    <td className="border border-black px-1 py-1 text-center">{idx + 1}</td>
                                    <td className="border border-black px-1 py-1 font-semibold">{item?.itemCode || '—'}</td>
                                    <td className="border border-black px-1 py-1">{item?.itemDescription || '—'}</td>
                                    <td className="border border-black px-1 py-1">{item?.rfqMake || '—'}</td>
                                    <td className="border border-black px-1 py-1 text-center">{item?.unit || '—'}</td>
                                    <td className="border border-black px-1 py-1 text-right">{item?.rfqQty ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Vendors */}
                <div className="p-3 break-inside-avoid border-t border-black">
                    <div className="font-bold uppercase text-[11px] tracking-wide mb-2">Vendor Details</div>

                    <table className="w-full border border-black border-collapse table-fixed">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="border border-black px-1 py-1 w-[44px]">#</th>
                                <th className="border border-black px-1 py-1 w-[280px]">Vendor Name</th>
                                <th className="border border-black px-1 py-1">Vendor Address / Contact</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(rfq?.vendors || []).map((v: any, vi: number) => {
                                const email =
                                    (Array.isArray(v?.contactPerson) ? v?.contactPerson?.[0]?.email : v?.contactPerson?.email) ||
                                    v?.email ||
                                    ''

                                return (
                                    <tr key={`${v.vendorCode || 'v'}-${vi}`}>
                                        <td className="border border-black px-1 py-1 text-center">{vi + 1}</td>
                                        <td className="border border-black px-1 py-1 font-semibold">
                                            {v?.name || '—'} {v?.vendorCode ? `(${v.vendorCode})` : ''}
                                        </td>
                                        <td className="border border-black px-1 py-1">
                                            <div>{v?.location || '—'}</div>
                                            {email ? (
                                                <div className="mt-0.5">
                                                    <span className="font-semibold">Email:</span> {email}
                                                </div>
                                            ) : null}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="border-t border-black px-3 py-2">
                    <div className="text-right font-bold">For, {companyInfo.name || '—'}</div>
                    <div className="h-10" />
                </div>
            </div>
        </div>
    )
}

export default RFQPrint