import { Table } from '@/components/ui'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import ApiService from '@/services/ApiService'
import { POType } from '@/@types/app'
import { formatDate } from '@/utils/formatDate'
import { companies } from '@/utils/data'

const { THead, Tr, Th, TBody, Td } = Table

type PendingPOApprovalType = Pick<
    POType,
    '_id' | 'poNumber' | 'poDate' | 'sapPONumber' | 'company' | 'vendorCode' | 'vendorName'
> & {
    itemDescriptions?: string[]
    itemDescription?: string[] | string
    itemCodes?: string[]
    itemCount?: number
    amount: number
    currentApproval?: {
        user: string
        name: string
        assignOn: string
        approvalStatus: number
        comment?: string
    }
}

const resolveCompanyName = (company: string) => {
    const value = String(company || '').trim()

    const found = companies.find((c: any) => {
        return (
            String(c.plantCode || '').trim() === value ||
            String(c.companyName || '').trim().toLowerCase() === value.toLowerCase() ||
            String(c.alias || '').trim().toLowerCase() === value.toLowerCase()
        )
    })

    return found?.companyName || found?.alias || value || '-'
}

const formatAmount = (value: number) => {
    const n = Number(value || 0)
    return n.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
}

const POApproverDashboard = () => {
    const navigate = useNavigate()
    const [data, setData] = useState<PendingPOApprovalType[]>([])

    useEffect(() => {
        ;(async () => {
            try {
                const response = await ApiService.fetchData<{
                    data: PendingPOApprovalType[]
                    total: number
                    page: number
                    pageSize: number
                    totalPages: number
                }>({
                    method: 'get',
                    url: '/po/pending-po-approvals',
                })

                const raw = response.data as any
                const rows: PendingPOApprovalType[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []

                setData(
                    rows.map((i) => ({
                        ...i,
                        company: resolveCompanyName(i.company as string),
                    })),
                )
            } catch (error) {
                console.error(error)
            }
        })()
    }, [])

    return (
        <div className='w-full min-w-0 space-y-4'>
            <div className='w-full rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:w-fit sm:px-5'>
                <div className='flex flex-col gap-3 text-gray-800 sm:flex-row sm:items-center sm:gap-6'>
                    <span className='block font-mono text-4xl font-semibold sm:text-5xl lg:text-6xl'>{data.length}</span>
                    <span className='text-sm font-semibold leading-5 sm:text-base'>
                        Unapproved
                        <br />
                        Purchase Order{data.length === 1 ? '' : 's'}
                    </span>
                </div>
            </div>

            <div className='w-full min-w-0'>
                <div className='mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
                    <span className='inline-block text-sm font-semibold'>Pending Purchase Orders</span>
                    <span className='text-xs text-gray-500'>Showing POs waiting for your authorization</span>
                </div>

                <div className='overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm'>
                    <Table compact>
                        <THead>
                            <Tr>
                                <Th className='whitespace-nowrap'>PO No.</Th>
                                <Th className='whitespace-nowrap'>PO Date</Th>
                                <Th className='whitespace-nowrap'>SAP PO Number</Th>
                                <Th className='whitespace-nowrap'>Company</Th>
                                <Th className='whitespace-nowrap'>Vendor</Th>
                                <Th>Item Description</Th>
                                <Th className='whitespace-nowrap text-right'>Amount</Th>
                            </Tr>
                        </THead>

                        <TBody>
                            {data.length ? (
                                data.map((i) => {
                                    const descriptions = Array.isArray(i.itemDescriptions)
                                        ? i.itemDescriptions
                                        : Array.isArray(i.itemDescription)
                                          ? i.itemDescription
                                          : i.itemDescription
                                            ? [i.itemDescription]
                                            : []

                                    return (
                                        <Tr
                                            key={i._id}
                                            className='cursor-pointer transition hover:bg-blue-50/60'
                                            onClick={() => navigate('/po-authorize?poNumber=' + encodeURIComponent(String(i.poNumber)))}
                                        >
                                            <Td className='whitespace-nowrap font-semibold text-blue-700'>{i.poNumber}</Td>
                                            <Td className='whitespace-nowrap'>{formatDate(i.poDate as string)}</Td>
                                            <Td className='whitespace-nowrap'>{i.sapPONumber || '-'}</Td>
                                            <Td className='whitespace-nowrap'>{i.company || '-'}</Td>
                                            <Td>
                                                <div className='min-w-[160px]'>
                                                    <div className='font-medium'>{i.vendorName || '-'}</div>
                                                    <div className='text-[11px] text-gray-500'>{i.vendorCode || '-'}</div>
                                                </div>
                                            </Td>
                                            <Td>
                                                <div className='min-w-[220px] max-w-[420px] break-words'>
                                                    {descriptions.length ? descriptions.join(', ') : '-'}
                                                </div>
                                            </Td>
                                            <Td className='whitespace-nowrap text-right font-semibold'>₹{formatAmount(i.amount)}</Td>
                                        </Tr>
                                    )
                                })
                            ) : (
                                <Tr>
                                    <Td colSpan={7}>
                                        <span className='block w-full py-5 text-center text-sm opacity-80'>
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