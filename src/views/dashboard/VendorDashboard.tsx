import { Button, Table } from '@/components/ui'
import { MdOpenInNew } from 'react-icons/md'
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { MonthlyTrendType, POType, QuotationType, RFQType, TodayVs30DaysType } from '@/@types/app'
import { HiOutlineDocumentAdd, HiOutlineDocumentText } from 'react-icons/hi'
import { LuFileUser } from 'react-icons/lu'
import { HiOutlineDocumentCurrencyRupee } from 'react-icons/hi2'
import { LiaRupeeSignSolid } from 'react-icons/lia'
import { formatDate } from '@/utils/formatDate'
import { formatIndianAmount } from '@/utils/formatIndianAmount'
import ApiService from '@/services/ApiService'
import MonthlyTrends from './MonthlyTrends'

const { THead, Tr, Th, TBody, Td } = Table

type StatsType = {
    pendingRFQs: number
    totalRFQs: number
    totalQuotations: number
    initialQuotations: number
    totalPOs: number
}

type TablesDataType = {
    quotations: Partial<QuotationType & { itemDescription: string[]; totalAmount: number }>[]
    enquiriesReceived: Partial<RFQType>[]
    enquiriesExpiring: Partial<RFQType>[]
    rfq: Partial<RFQType & { amount: number; itemDescription: string[] }>[]
    po: Partial<Omit<POType, 'amount'> & { amount: number; itemDescription: string[] }>[]
}

const VendorDashboard = () => {
    const navigate = useNavigate()
    const [stats, setStats] = useState<StatsType>()
    const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendType>()
    const [todayVs30Days, setTodayVs30Days] = useState<TodayVs30DaysType>()
    const [tablesData, setTablesData] = useState<TablesDataType>()

    useEffect(() => {
        ;(async () => {
            try {
                const response = await ApiService.fetchData<{
                    stats: StatsType
                    monthlyTrend: MonthlyTrendType
                    todayVs30Days: TodayVs30DaysType
                }>({
                    method: 'get',
                    url: '/app/stats',
                })

                setStats(response.data.stats)
                setMonthlyTrend(response.data.monthlyTrend)
                setTodayVs30Days(response.data.todayVs30Days)

                const tableDataResponse = await ApiService.fetchData<TablesDataType>({
                    method: 'get',
                    url: '/app/table-data',
                })

                setTablesData(tableDataResponse.data)
            } catch (error) {
                console.error(error)
            }
        })()
    }, [])

    return (
        <div className='space-y-4'>
            <div className='flex gap-4'>
                <div className='px-5 py-4 w-full border border-gray-300 rounded-lg'>
                    <span className='font-semibold text-sm'>Pending Enquiries</span>
                    <div className='flex items-center gap-3.5 mt-3.5'>
                        <span className='block text-2xl font-bold'>{stats?.pendingRFQs}</span>
                        <Button size='xs' variant='twoTone' className='rounded-3xl flex items-center gap-2' onClick={() => navigate('/rfqs')}>
                            <span>View</span>
                            <MdOpenInNew className='size-4.5' />
                        </Button>
                    </div>
                    <span className='opacity-80'>
                        <b>{stats?.totalRFQs}</b> total enquiries received
                    </span>
                </div>

                <div className='px-5 py-4 w-full border border-gray-300 rounded-lg'>
                    <span className='font-semibold text-sm'>Submitted Quotations</span>
                    <div>
                        <div className='flex items-center gap-3.5 mt-3.5'>
                            <span className='block text-2xl font-bold'>{stats?.totalQuotations}</span>
                            <Button size='xs' variant='twoTone' className='rounded-3xl flex items-center gap-2' onClick={() => navigate('/quotations')}>
                                <span>View</span>
                                <MdOpenInNew className='size-4.5' />
                            </Button>
                        </div>
                        <span className='opacity-80'>
                            <b>{stats?.initialQuotations}</b> drafted quotations
                        </span>
                    </div>
                </div>

                <div className='px-5 py-4 w-full border border-gray-300 rounded-lg'>
                    <span className='font-semibold text-sm'>Purchase Orders</span>
                    <div>
                        <div className='flex items-center gap-3.5 mt-3.5'>
                            <span className='block text-2xl font-bold'>{stats?.totalPOs}</span>
                            <Button size='xs' variant='twoTone' className='rounded-3xl flex items-center gap-2' onClick={() => navigate('/purchase-orders')}>
                                <span>View</span>
                                <MdOpenInNew className='size-4.5' />
                            </Button>
                        </div>
                        <span className='opacity-80'>Number of total orders received</span>
                    </div>
                </div>
            </div>

            <div className='flex gap-4 w-full'>
                <div className='pr-4 pt-4 border border-gray-300 rounded-lg w-2/3'>
                    <MonthlyTrends monthlyTrend={monthlyTrend} />
                </div>
                <div className='py-4 border border-gray-300 rounded-lg w-1/3'>
                    <span className='pl-4 text-sm font-semibold mb-3 inline-block'>Today vs Last 30 Days</span>
                    <div>
                        <Table compact>
                            <THead>
                                <Tr>
                                    <Th className='bg-white'></Th>
                                    <Th className='py-3 text-right bg-white'>Today</Th>
                                    <Th className='text-right bg-white'>Last 30 Days</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                <Tr>
                                    <Td className='py-2 pl-4'>
                                        <div className='flex gap-2 items-center'>
                                            <Button size='xs' variant='twoTone' icon={<HiOutlineDocumentText size={20} />} className='pointer-events-none' />
                                            <span className='text-slate-700'>RFQs</span>
                                        </div>
                                    </Td>
                                    <Td className='text-right'>{todayVs30Days?.rfq?.today}</Td>
                                    <Td className='text-right pr-4'>{todayVs30Days?.rfq?.last30Days}</Td>
                                </Tr>
                                <Tr>
                                    <Td className='py-2 pl-4'>
                                        <div className='flex gap-2 items-center'>
                                            <Button size='xs' variant='twoTone' icon={<LuFileUser size={20} />} className='pointer-events-none' />
                                            <span className='text-slate-700'>Quotations</span>
                                        </div>
                                    </Td>
                                    <Td className='text-right'>{todayVs30Days?.quotation?.today}</Td>
                                    <Td className='text-right pr-4'>{todayVs30Days?.quotation?.last30Days}</Td>
                                </Tr>
                                <Tr>
                                    <Td className='py-2 pl-4'>
                                        <div className='flex gap-2 items-center'>
                                            <Button
                                                size='xs'
                                                variant='twoTone'
                                                icon={<HiOutlineDocumentCurrencyRupee size={20} />}
                                                className='pointer-events-none'
                                            />
                                            <span className='text-slate-700'>POs</span>
                                        </div>
                                    </Td>
                                    <Td className='text-right'>{todayVs30Days?.po?.today}</Td>
                                    <Td className='text-right pr-4'>{todayVs30Days?.po?.last30Days}</Td>
                                </Tr>
                                <Tr>
                                    <Td className='py-2 pl-4'>
                                        <div className='flex gap-2 items-center'>
                                            <Button size='xs' variant='twoTone' icon={<LiaRupeeSignSolid size={20} />} className='pointer-events-none' />
                                            <span className='text-slate-700'>PO Amount</span>
                                        </div>
                                    </Td>
                                    <Td className='text-right'>{formatIndianAmount(todayVs30Days?.poTotal?.today)}</Td>
                                    <Td className='text-right pr-4'>{formatIndianAmount(todayVs30Days?.poTotal?.last30Days)}</Td>
                                </Tr>
                            </TBody>
                        </Table>
                    </div>
                </div>
            </div>

            <div className='flex gap-4 w-full'>
                <div className='p-4 w-full border border-gray-300 rounded-lg'>
                    <div className='mb-3 flex items-center justify-between'>
                        <span className='text-sm font-semibold'>Latest Enquiries Received</span>
                        <Button size='xs' variant='twoTone' className='rounded-3xl flex items-center gap-2' onClick={() => navigate('/rfqs')}>
                            See All
                            <MdOpenInNew className='size-4.5' />
                        </Button>
                    </div>
                    <div className='rounded-md overflow-hidden border border-gray-200'>
                        <Table compact>
                            <THead>
                                <Tr>
                                    <Th>Enquiry No</Th>
                                    <Th>Enquiry Date</Th>
                                    <Th>Status</Th>
                                    <Th>Due Date</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {tablesData?.enquiriesReceived?.map((i) => (
                                    <Tr key={i._id}>
                                        <Td>{i.rfqNumber}</Td>
                                        <Td>{formatDate(i.rfqDate as string)}</Td>
                                        <Td>{i.status === 0 ? 'Pending' : 'Created'}</Td>
                                        <Td>{formatDate(i.dueDate as string)}</Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </div>
                </div>
                <div className='p-4 w-full border border-gray-300 rounded-lg'>
                    <div className='mb-3 flex items-center justify-between'>
                        <span className='text-sm font-semibold'>Enquiries Expiring Soon</span>
                    </div>
                    <div className='rounded-md overflow-hidden border border-gray-200'>
                        <Table compact>
                            <THead>
                                <Tr>
                                    <Th>Enquiry No</Th>
                                    <Th>Enquiry Date</Th>
                                    <Th>Due Date</Th>
                                    <Th></Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {tablesData?.enquiriesExpiring?.map((i) => (
                                    <Tr key={i._id}>
                                        <Td>{i.rfqNumber}</Td>
                                        <Td>{formatDate(i.rfqDate as string)}</Td>
                                        <Td>{formatDate(i.dueDate as string)}</Td>
                                        <Td>
                                            <Link to={`/quotation?rfqNumber=${i.rfqNumber}`}>
                                                <Button variant='twoTone' size='xs' icon={<HiOutlineDocumentAdd />} />
                                            </Link>
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </div>
                </div>
            </div>

            <div className='p-4 w-full border border-gray-300 rounded-lg'>
                <div className='mb-3 flex items-center justify-between'>
                    <span className='text-sm font-semibold'>Latest Quotations Submitted</span>
                </div>
                <div className='rounded-md overflow-hidden border border-gray-200'>
                    <Table compact>
                        <THead>
                            <Tr>
                                <Th>Quotation No</Th>
                                <Th>Quotation Date</Th>
                                <Th className='text-right'>Net Amount</Th>
                                <Th>Enquiry No</Th>
                                <Th>Item Description</Th>
                                <Th></Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {tablesData?.quotations?.map((i) => (
                                <Tr key={i._id}>
                                    <Td>{i.quotationNumber}</Td>
                                    <Td>{formatDate(i.quotationDate as string)}</Td>
                                    <Td className='text-right'>{i.totalAmount}</Td>
                                    <Td>{i.rfqNumber}</Td>
                                    <Td>{i.itemDescription?.join(', ')}</Td>
                                    <Td>
                                        <Button
                                            size='xs'
                                            variant='twoTone'
                                            icon={<MdOpenInNew className='size-4.5' />}
                                            className='rounded-3xl flex items-center gap-2'
                                            onClick={() => navigate('/quotation?quotationNumber=' + i.quotationNumber)}
                                        />
                                    </Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                </div>
            </div>

            <div className='p-4 w-full border border-gray-300 rounded-lg'>
                <span className='text-sm font-semibold mb-3 inline-block'>Latest POs Received</span>
                <div className='rounded-md overflow-hidden border border-gray-200'>
                    <Table compact>
                        <THead>
                            <Tr>
                                <Th>PO No.</Th>
                                <Th>PO Date</Th>
                                <Th>Quotation Number</Th>
                                <Th>Item Description</Th>
                                <Th className='text-right'>Amount</Th>
                                <Th></Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {tablesData?.po?.map((i) => (
                                <Tr key={i._id}>
                                    <Td>{i.poNumber}</Td>
                                    <Td>{formatDate(i.poDate as string)}</Td>
                                    <Td>{i.refDocumentNumber}</Td>
                                    <Td>{i.itemDescription?.join(', ')}</Td>
                                    <Td className='text-right'>{i.amount}</Td>
                                    <Td>
                                        <Button
                                            size='xs'
                                            variant='twoTone'
                                            icon={<MdOpenInNew className='size-4.5' />}
                                            className='rounded-3xl flex items-center gap-2'
                                            onClick={() => navigate('/purchase-order?poNumber=' + i.poNumber)}
                                        />
                                    </Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}

export default VendorDashboard
