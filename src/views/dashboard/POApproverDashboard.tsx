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
        <div className='w-full min-w-0 space-y-4'>
            <div className='w-full sm:w-fit rounded-lg border border-gray-300 px-4 py-4 sm:px-5'>
                <div className='flex flex-col gap-3 text-gray-800 sm:flex-row sm:items-center sm:gap-6'>
                    <span className='block text-4xl font-semibold font-mono sm:text-5xl lg:text-6xl'>{data?.length}</span>
                    <span className='text-sm font-semibold sm:text-base'>
                        Unapproved
                        <br />
                        Purchase Order{data?.length === 1 ? '' : 's'}
                    </span>
                </div>
            </div>

            <div className='w-full min-w-0'>
                <span className='mb-3 inline-block text-sm font-semibold'>Pending Purchase Orders</span>
                <div className='overflow-x-auto rounded-md border border-gray-200'>
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
                                        <Td>{Array.isArray(i.itemDescription) ? i.itemDescription.join(', ') : i.itemDescription}</Td>
                                        <Td className='text-right'>₹{+i.amount?.toFixed(2)}</Td>
                                    </Tr>
                                ))
                            ) : (
                                <Tr>
                                    <Td colSpan={7}>
                                        <span className='block w-full py-1.5 text-center opacity-80'>
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
