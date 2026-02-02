import React from 'react'
import { QuotationType } from '@/@types/app'
import { CHARGE_TYPES, companies } from '@/utils/data'
import { formatDate } from '@/utils/formatDate'
import { amountInWords } from '@/utils/numberInWords'

const QuotationPrint = ({ quotation, vendorName }: { quotation: QuotationType; vendorName: string }) => {
    const companyInfo = {
        name: companies.find((i) => i.plantCode === quotation?.companyCode)?.companyName,
        address: '490/1 Urla Industrial Area, Urla, CHHATTISGARH, INDIA',
        phone: '0771-4082350',
        telefax: '0771-4082452',
        email: 'purchase@rrispat.com',
    }

    return (
        <div>
            <div className='max-w-3xl mx-auto text-gray-800 border border-black text-xs'>
                {/* Company Info */}
                <div className='text-center border-b p-1 border-b-black'>
                    <h1 className='text-lg font-bold'>{companyInfo.name}</h1>
                    <p>{companyInfo.address}</p>
                    <p>
                        Phone: {companyInfo.phone} Telefax: {companyInfo.telefax} Email: {companyInfo.email}
                    </p>
                </div>

                {/* Title */}
                <div className='font-semibold p-2'>
                    <span className='text-lg font-bold block border border-black w-fit m-auto px-6' style={{ boxShadow: '5px 5px' }}>
                        Quotation
                    </span>
                </div>

                {/* Info */}
                <div className='flex'>
                    <div className='flex-1 border-y border-r border-black p-[2px]'>
                        <div>
                            <span>
                                <b>Party Name</b>
                            </span>
                        </div>
                        <div>
                            <span>M/s</span>
                        </div>
                        <table className='ml-6'>
                            <tbody>
                                <tr>
                                    <td colSpan={3}>
                                        <span className='font-bold'>R.R.ISPAT ( A UNIT OF GODAWARI POWER & ISPAT LTD.)</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={3}>
                                        <span>490/1 Urla Industrial Area,Urla</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Email</td>
                                    <td>:</td>
                                    <td>purchase@rrispat.com</td>
                                </tr>
                                <tr>
                                    <td>Phone</td>
                                    <td>:</td>
                                    <td>0771-4082350</td>
                                </tr>
                                <tr>
                                    <td>Fax</td>
                                    <td>:</td>
                                    <td>0771-4082452</td>
                                </tr>
                                <tr>
                                    <td>Website</td>
                                    <td>:</td>
                                    <td>vendor.rrispatconsoul.in</td>
                                </tr>
                                <tr>
                                    <td>GST No.</td>
                                    <td>:</td>
                                    <td>22AAACI7189K2ZA</td>
                                </tr>
                                <tr>
                                    <td>State Code</td>
                                    <td>:</td>
                                    <td></td>
                                </tr>
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
                        <span>Party Contact Person :</span>
                        <span>{quotation?.contactPersonName}</span>
                    </div>
                    <div>
                        <span>Email :</span>
                        <span>{quotation?.contactEmail}</span>
                    </div>
                    <div>
                        <span>Contact No. :</span>
                        <span>{quotation?.contactNumber}</span>
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
                                <tr key={item.itemCode}>
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
                                        <span className='px-[2px] w-full'>{quotation?.termsConditions[term]}</span>
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
                                        <td className='px-[2px] border-t border-r border-black'>{value?.description}</td>
                                        <td className='px-[2px] border-t border-black text-right'>{value?.amount}</td>
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

                {/* Footer */}
                <div>
                    <div className='p-[2px]'>
                        <p className='text-right font-bold'>For, R.R. Ispat (A unit of GPIL)</p>
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
                    <span>23/05/2025 07:30 PM</span>
                    <span>Page 1/1</span>
                </div>
            </div>
        </div>
    )
}

export default QuotationPrint
