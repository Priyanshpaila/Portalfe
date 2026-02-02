import React from 'react'
import { RFQType } from '@/@types/app'
import { companies } from '@/utils/data'
import { formatDate } from '@/utils/formatDate'

const RFQPrint = ({ rfq }: { rfq: Omit<RFQType, 'status'> }) => {
    const companyInfo = {
        name: companies[0]?.companyName,
        address: '490/1 Urla Industrial Area, Urla, CHHATTISGARH, INDIA',
        phone: '0771-4082350',
        telefax: '0771-4082452',
        email: 'purchase@rrispat.com',
    }

    const signatories = {
        createdBy: 'C MURALIDHAR RAO',
        authorisedBy: 'C MURALIDHAR RAO',
    }

    return (
        <div>
            <div className='max-w-3xl mx-auto text-gray-800 border border-black text-sm'>
                {/* Company Info */}
                <div className='text-center border-b px-1 py-3 border-b-black relative'>
                    <h1 className='text-lg font-bold'>{companyInfo.name}</h1>
                    <p>{companyInfo.address}</p>
                    <p>
                        Phone: {companyInfo.phone} Telefax: {companyInfo.telefax} Email: {companyInfo.email}
                    </p>

                    <img src='/img/logo/logo-title.png' className='absolute left-0 top-1/2 -translate-y-1/2' width={140} />
                </div>

                {/* Title */}
                <div className='font-semibold p-2'>
                    <span className='text-lg font-bold block border border-black w-fit m-auto px-4' style={{ boxShadow: '5px 5px' }}>
                        Request For Quotation
                    </span>
                </div>

                {/* Info */}
                <div className='flex'>
                    <div className='flex-1 border-y border-r border-black'>
                        <table>
                            <tbody>
                                <tr>
                                    <td className='p-[2px] font-bold'>Enquiry No.</td>
                                    <td className='p-[2px]'>:</td>
                                    <td className='p-[2px]'>{rfq?.rfqNumber}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className='flex-1 border-y border-black'>
                        <table>
                            <tbody>
                                <tr>
                                    <td className='p-[2px] font-bold'>Enquiry Date</td>
                                    <td className='p-[2px]'>:</td>
                                    <td className='p-[2px]'>{formatDate(rfq?.rfqDate as string)}</td>
                                </tr>
                                <tr>
                                    <td className='p-[2px] font-bold'>Due Date</td>
                                    <td className='p-[2px]'>:</td>
                                    <td className='p-[2px]'>{formatDate(rfq?.dueDate as string)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Item Table */}
                <div>
                    <span className='p-[2px] font-bold block mt-2'>Item Details</span>
                    <table className='w-full border border-black '>
                        <thead>
                            <tr>
                                <th className='border border-l-transparent border-black p-[2px]'>Sl No</th>
                                <th className='border border-black p-[2px]'>Item Code</th>
                                <th className='border border-black p-[2px]'>Description</th>
                                <th className='border border-black p-[2px]'>Make</th>
                                <th className='border border-black p-[2px]'>UOM</th>
                                <th className='border border-r-transparent border-black p-[2px]'>Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rfq?.items?.map((item, idx) => (
                                <tr key={item.itemCode}>
                                    <td className='border border-l-transparent border-black p-[2px] text-center'>{idx + 1}</td>
                                    <td className='border border-black p-[2px]'>{item.itemCode}</td>
                                    <td className='border border-black p-[2px]'>{item.itemDescription}</td>
                                    <td className='border border-black p-[2px] text-right'>{item.rfqMake}</td>
                                    <td className='border border-black p-[2px]'>{item.unit}</td>
                                    <td className='border border-r-transparent border-black p-[2px]'>{item.rfqQty}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Vendor Details */}
                <div>
                    <span className='p-[2px] font-bold block mt-2'>Vendor Details</span>
                    <table className='w-full border border-black'>
                        <thead>
                            <tr className='whitespace-nowrap'>
                                <th className='border border-l-transparent border-black p-[2px]'>Sl No</th>
                                <th className='border border-black p-[2px]'>Vendor Name</th>
                                <th className='border border-r-transparent border-black p-[2px]'>Vendor Address</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rfq?.vendors?.map((vendor, vi) => (
                                <tr key={vendor.vendorCode}>
                                    <td className='border border-l-transparent border-black p-[2px] text-center'>{vi + 1}</td>
                                    <td className='border border-black p-[2px] font-bold w-2/5 align-baseline'>{vendor.name}</td>
                                    <td className='border border-r-transparent border-black p-[2px] w-3/5'>
                                        <p>{vendor.location}</p>
                                        <p>
                                            Email: <span>{vendor.contactPerson.email}</span>
                                        </p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Terms and Conditions */}
                <div>
                    <span className='font-bold p-[2px]'>Terms & Conditions</span>
                    <table className='w-full border-y border-black '>
                        <tbody>
                            {Object.keys(rfq?.termsConditions || {}).map((term, index) => (
                                <tr key={index}>
                                    <td className='px-[2px] whitespace-nowrap'>{term}</td>
                                    <td className='px-[2px]'>:</td>
                                    <td className='px-[2px] w-full'>{rfq?.termsConditions[term]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className='p-[2px]'>
                    <div>
                        <p className='text-right'>For, R.R. Ispat (A unit of GPIL)</p>
                    </div>
                    <div className='flex mt-8'>
                        <div className='flex-1'>
                            <p>Created By</p>
                            <p>{signatories.createdBy}</p>
                        </div>
                        <div className='flex-1'>
                            <p>Authorized By</p>
                            <p>{signatories.authorisedBy}</p>
                        </div>
                        <div className='flex-1'></div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RFQPrint
