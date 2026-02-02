import { Button, Table } from '@/components/ui'
import { MdOpenInNew } from 'react-icons/md'
import { useNavigate } from 'react-router-dom'
import MonthlyTrends from './MonthlyTrends'
import POAmountChart from './POAmountChart'
import { useEffect, useState } from 'react'
import ApiService from '@/services/ApiService'
import { AmountTrendType, IndentType, MonthlyTrendType, POType, QuotationType, RFQType, StatsType, TodayVs30DaysType } from '@/@types/app'
import { formatDate } from '@/utils/formatDate'
import { useAppSelector } from '@/store'
import { PERMISSIONS } from '@/utils/permissions'
import { formatIndianAmount } from '@/utils/formatIndianAmount'
import { HiOutlineDocumentText } from 'react-icons/hi'
import { LuFileUser } from 'react-icons/lu'
import { HiOutlineDocumentCurrencyRupee } from 'react-icons/hi2'
import { LiaRupeeSignSolid } from 'react-icons/lia'

const { THead, Tr, Th, TBody, Td } = Table

type TablesDataType = {
    indents: Partial<IndentType>[]
    quotations: Partial<QuotationType>[]
    rfq: Partial<RFQType & { itemDescription: string[] }>[]
    po: Partial<Omit<POType, 'amount'> & { amount: number }>[]
}

const UserDashboard = () => {
    const navigate = useNavigate()
    const userAuthority = useAppSelector((state) => state.auth.user.authority)
    const [stats, setStats] = useState<StatsType>()
    const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendType>()
    const [todayVs30Days, setTodayVs30Days] = useState<TodayVs30DaysType>()
    const [amountTrend, setAmountTrend] = useState<AmountTrendType>()
    const [tablesData, setTablesData] = useState<TablesDataType>()

    useEffect(() => {
        ;(async () => {
            try {
                const response = await ApiService.fetchData<{
                    stats: StatsType
                    monthlyTrend: MonthlyTrendType
                    todayVs30Days: TodayVs30DaysType
                    amountTrend: AmountTrendType
                }>({
                    method: 'get',
                    url: '/app/stats',
                })

                setStats(response.data.stats)
                setMonthlyTrend(response.data.monthlyTrend)
                setTodayVs30Days(response.data.todayVs30Days)
                setAmountTrend(response.data.amountTrend)

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
                    <span className='font-semibold text-sm'>Pending Indents</span>
                    <div className='flex items-center gap-3.5 mt-3.5'>
                        <span className='block text-2xl font-bold'>{stats?.pendingIndents}</span>
                        <Button size='xs' variant='twoTone' className='rounded-3xl flex items-center gap-2' onClick={() => navigate('/indent-register')}>
                            <span>View</span>
                            <MdOpenInNew className='size-4.5' />
                        </Button>
                    </div>
                    <span className='opacity-80'>
                        <b>{stats?.expiringIndents}</b> expiring within a week
                    </span>
                </div>

                <div className='px-5 py-4 w-full border border-gray-300 rounded-lg'>
                    <span className='font-semibold text-sm'>Pending RFQs</span>
                    <div className='flex items-center gap-3.5 mt-3.5'>
                        <span className='block text-2xl font-bold'>{stats?.pendingRFQs}</span>
                        <Button size='xs' variant='twoTone' className='rounded-3xl flex items-center gap-2' onClick={() => navigate('/rfqs')}>
                            <span>View</span>
                            <MdOpenInNew className='size-4.5' />
                        </Button>
                    </div>
                    <span className='opacity-80'>
                        <b>{stats?.initialRFQs}</b> in initial state
                    </span>
                </div>

                <div className='px-5 py-4 w-full border border-gray-300 rounded-lg'>
                    <span className='font-semibold text-sm'>Submitted Quotations</span>
                    <div>
                        <div className='flex items-center gap-3.5 mt-3.5'>
                            <span className='block text-2xl font-bold'>{stats?.submittedQuotations}</span>
                            <Button size='xs' variant='twoTone' className='rounded-3xl flex items-center gap-2' onClick={() => navigate('/quotations')}>
                                <span>View</span>
                                <MdOpenInNew className='size-4.5' />
                            </Button>
                        </div>
                        <span className='opacity-80'>
                            <b>{stats?.outstandingQuotations}</b> outstanding
                        </span>
                    </div>
                </div>

                <div className='px-5 py-4 w-full border border-gray-300 rounded-lg'>
                    <span className='font-semibold text-sm'>Unapproved POs</span>
                    <div>
                        <div className='flex items-center gap-3.5 mt-3.5'>
                            <span className='block text-2xl font-bold'>{stats?.unapprovedPOs}</span>
                            <Button size='xs' variant='twoTone' className='rounded-3xl flex items-center gap-2' onClick={() => navigate('/purchase-orders')}>
                                <span>View</span>
                                <MdOpenInNew className='size-4.5' />
                            </Button>
                        </div>
                        <span className='opacity-80'>
                            <b>{stats?.totalPOs}</b> total orders
                        </span>
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
                    {/* <span className='text-sm font-semibold mb-3 inline-block'>My Work List</span>
                    <div className='rounded-md overflow-hidden border border-gray-200'>
                        <Table compact>
                            <THead>
                                <Tr>
                                    <Th>Pending Area</Th>
                                    <Th className='text-right'>Work Count</Th>
                                    <Th className='text-center'>View</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                <Tr>
                                    <Td>Pending RFQs</Td>
                                    <Td className='text-right'>32</Td>
                                    <Td>
                                        <div className='flex justify-center w-full'>
                                            <Button size='xs' variant='twoTone' icon={<MdOpenInNew size={16} />} />
                                        </div>
                                    </Td>
                                </Tr>
                            </TBody>
                        </Table>
                    </div> */}
                </div>
            </div>

            <div className='flex gap-4 w-full'>
                <div className='p-4 border border-gray-300 rounded-lg w-full'>
                    <div className='mb-3 flex items-center justify-between'>
                        <span className='text-sm font-semibold'>Latest Quotations</span>
                        {userAuthority?.includes(PERMISSIONS.VIEW_QUOTATION) && (
                            <Button size='xs' variant='twoTone' className='flex gap-1 items-center'>
                                <span>See All</span>
                                <MdOpenInNew size={16} />
                            </Button>
                        )}
                    </div>
                    <div className='rounded-md overflow-hidden border border-gray-200'>
                        <Table compact>
                            <THead>
                                <Tr>
                                    <Th>Quotation No</Th>
                                    <Th>Quotation Date</Th>
                                    <Th>RFQ Number</Th>
                                    <Th>Vendor</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {tablesData?.quotations?.map((i) => (
                                    <Tr key={i._id}>
                                        <Td>{i.quotationNumber}</Td>
                                        <Td>{formatDate(i.quotationDate as string)}</Td>
                                        <Td>{i.rfqNumber}</Td>
                                        <Td>{i.vendorCode}</Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </div>
                </div>
                <div className='pt-4 pr-4 border border-gray-300 rounded-lg w-full'>
                    <POAmountChart amountTrend={amountTrend} />
                </div>
            </div>

            <div className='w-full'>
                <span className='text-sm font-semibold mb-3 inline-block'>Expiring Indents</span>
                <div className='rounded-md overflow-hidden border border-gray-200'>
                    <Table compact>
                        <THead>
                            <Tr>
                                <Th>Company</Th>
                                <Th>Indent No</Th>
                                <Th>Indent Date</Th>
                                <Th>Item Description</Th>
                                <Th>Tech. Spech.</Th>
                                <Th className='text-right'>Qty</Th>
                                <Th>Cost Center</Th>
                                <Th>Expire In</Th>
                                <Th>Status</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {tablesData?.indents?.map((i) => (
                                <Tr key={i.id}>
                                    <Td>{i.company}</Td>
                                    <Td>{i.indentNumber}</Td>
                                    <Td>{formatDate(i.documentDate)}</Td>
                                    <Td>{i.itemDescription}</Td>
                                    <Td>{i.techSpec}</Td>
                                    <Td className='text-right'>{i.indentQty?.toFixed(3)}</Td>
                                    <Td>{i.costCenter}</Td>
                                    <Td></Td>
                                    <Td></Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                </div>
            </div>

            <div className='flex gap-4 w-full'>
                <div className='w-full'>
                    <span className='text-sm font-semibold mb-3 inline-block'>Latest POs</span>
                    <div className='rounded-md overflow-hidden border border-gray-200'>
                        <Table compact>
                            <THead>
                                <Tr>
                                    <Th>PO No.</Th>
                                    <Th>PO Date</Th>
                                    <Th>Company</Th>
                                    <Th>Vendor</Th>
                                    <Th className='text-right'>Amount</Th>
                                    <Th></Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {tablesData?.po?.map((i) => (
                                    <Tr key={i._id}>
                                        <Td>{i.poNumber}</Td>
                                        <Td>{formatDate(i.poDate as string)}</Td>
                                        <Td>{i.company}</Td>
                                        <Td>{i.vendorName}</Td>
                                        <Td className='text-right'>{i.amount}</Td>
                                        <Td>
                                            {userAuthority?.includes(PERMISSIONS.MANAGE_PO) && (
                                                <Button
                                                    size='xs'
                                                    variant='twoTone'
                                                    icon={<MdOpenInNew className='size-4.5' />}
                                                    className='rounded-3xl flex items-center gap-2'
                                                    onClick={() => navigate('/purchase-order?poNumber=' + i.poNumber)}
                                                />
                                            )}
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </div>
                </div>
                <div className='w-full'>
                    <span className='text-sm font-semibold mb-3 inline-block'>Latest RFQs</span>
                    <div className='rounded-md overflow-hidden border border-gray-200'>
                        <Table compact>
                            <THead>
                                <Tr>
                                    <Th>RFQ No</Th>
                                    <Th>RFQ Date</Th>
                                    <Th>Item Description</Th>
                                    <Th></Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {tablesData?.rfq?.map((i) => (
                                    <Tr key={i._id}>
                                        <Td>{i.rfqNumber}</Td>
                                        <Td>{formatDate(i.rfqDate as string)}</Td>
                                        <Td>{i.itemDescription?.join(', ')}</Td>
                                        <Td>
                                            {userAuthority?.includes(PERMISSIONS.MANAGE_RFQ) && (
                                                <Button
                                                    size='xs'
                                                    variant='twoTone'
                                                    icon={<MdOpenInNew className='size-4.5' />}
                                                    className='rounded-3xl flex items-center gap-2'
                                                    onClick={() => navigate('/rfq?rfqNumber=' + i.rfqNumber)}
                                                />
                                            )}
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default UserDashboard
