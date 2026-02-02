import { Table } from '@/components/ui'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import ApiService from '@/services/ApiService'
import { POType } from '@/@types/app'
import { formatDate } from '@/utils/formatDate'
import { companies } from '@/utils/data'

const { THead, Tr, Th, TBody, Td } = Table

type PartialPOType = Pick<POType, '_id' | 'poNumber' | 'poDate' | 'sapPONumber' | 'company' | 'vendorCode' | 'vendorName'> & {
    itemDescription: string[]
    amount: number
}

const POApproverDashboard = () => {
    const navigate = useNavigate()
    const [data, setData] = useState<PartialPOType[]>([])

    useEffect(() => {
        ;(async () => {
            try {
                const response = await ApiService.fetchData<PartialPOType[]>({
                    method: 'get',
                    url: '/po/pending-po-approvals',
                })

                setData(
                    response.data?.map((i) => ({
                        ...i,
                        company: companies.find((c) => +c.plantCode === +i.company)?.companyName || i.company,
                    })),
                )
            } catch (error) {
                console.error(error)
            }
        })()
    }, [])

    return (
        <div className='space-y-4'>
            <div className='px-5 py-4 border border-gray-300 rounded-lg w-fit'>
                <div className='flex items-center gap-6 text-gray-800'>
                    <span className='block text-6xl font-semibold font-mono'>{data?.length}</span>
                    <span className='font-semibold text-base'>
                        Unapproved
                        <br />
                        Purchase Order{data?.length === 1 ? '' : 's'}
                    </span>
                </div>
            </div>

            <div className='w-full'>
                <span className='text-sm font-semibold mb-3 inline-block'>Pending Purchase Orders</span>
                <div className='rounded-md overflow-hidden border border-gray-200'>
                    <Table compact>
                        <THead>
                            <Tr>
                                <Th>PO No.</Th>
                                <Th>PO Date</Th>
                                <Th>SAP PO Number</Th>
                                <Th>Company</Th>
                                <Th>Vendor</Th>
                                <Th>Item Description</Th>
                                <Th className='text-right'>Amount</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {data?.length ? (
                                data?.map((i) => (
                                    <Tr key={i._id} className='cursor-pointer' onClick={() => navigate('/po-authorize?poNumber=' + i.poNumber)}>
                                        <Td>{i.poNumber}</Td>
                                        <Td>{formatDate(i.poDate as string)}</Td>
                                        <Td>{i.sapPONumber}</Td>
                                        <Td>{i.company}</Td>
                                        <Td>
                                            {i.vendorName} ({i.vendorCode})
                                        </Td>
                                        <Td>{i.itemDescription}</Td>
                                        <Td className='text-right'>₹{+i.amount?.toFixed(2)}</Td>
                                    </Tr>
                                ))
                            ) : (
                                <Tr>
                                    <Td colSpan={7}>
                                        <span className='block w-full opacity-80 text-center py-1.5'>
                                            <i>No pending purchase orders</i>
                                        </span>
                                    </Td>
                                </Tr>
                            )}
                        </TBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}

export default POApproverDashboard
