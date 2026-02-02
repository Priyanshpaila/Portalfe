import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDef } from '@/components/shared/DataTable'

import CustomDataTable from '@/components/app/CustomDataTable'
import { RFQType as _RFQType, RFQItemType, RFQVendorType } from '@/@types/app'
import { Button, Dialog, Input, Table, Tag } from '@/components/ui'
import { formatDateTime, formatDate } from '@/utils/formatDate'
import { RFQItemsDrawer } from '@/components/app/RFQItems'
import { AttachmentsDrawer } from '@/components/app/Attachments'
import { VendorQuotationsDrawer } from '@/components/app/VendorQuotations'
import classNames from 'classnames'
import { MdOutlineEdit } from 'react-icons/md'
import ApiService from '@/services/ApiService'
import DateTimepicker from '@/components/ui/DatePicker/DateTimepicker'
import { useReactToPrint } from 'react-to-print'
import RFQPrint from '@/components/prints/RFQ.print'
import { useAppSelector } from '@/store'
import { Link } from 'react-router-dom'
import { HiOutlineDocumentAdd } from 'react-icons/hi'
import { PERMISSIONS } from '@/utils/permissions'
import { TnCDrawer } from '@/components/app/TermsAndConditions'
import { showError } from '@/utils/hoc/showAlert'
import { IoPrintOutline } from 'react-icons/io5'
import TextAreaExtended from '@/components/app/TextAreaExtended'

const { Tr, Th, Td, THead, TBody } = Table

type RFQType = Omit<_RFQType, 'status'> & { status: string | number; totalVendors: number }
type dueDateModalState = Pick<RFQType, 'rfqNumber' | 'prevDueDates' | 'dueDate' | 'dueDateRemarks'> | null

export default function RFQs() {
    const user = useAppSelector((state) => state.auth.user)
    const [data, setData] = useState<RFQType[]>([])
    const [dueDateModal, setDueDateModal] = useState<dueDateModalState>(null)

    const columns: ColumnDef<RFQType>[] = useMemo(() => {
        return [
            { header: '#', accessorKey: '', cell: ({ cell }) => cell.row.index + 1 },
            ...(user.vendorCode
                ? [
                      {
                          id: 'add_quotation',
                          cell: ({ row }) => (
                              <Link to={`/quotation?rfqNumber=${encodeURIComponent(row.original.rfqNumber)}`}>
                                  <Button variant='twoTone' size='xs' icon={<HiOutlineDocumentAdd />} />
                              </Link>
                          ),
                      },
                  ]
                : user.authority?.includes(PERMISSIONS.MANAGE_RFQ)
                  ? [
                        {
                            id: 'edit_rfq',
                            cell: ({ row }) => (
                                <Link to={`/rfq?rfqNumber=${encodeURIComponent(row.original.rfqNumber)}`}>
                                    <Button variant='twoTone' size='xs' icon={<MdOutlineEdit />} color='red' />
                                </Link>
                            ),
                        },
                    ]
                  : []),
            { header: 'RFQ Number', accessorKey: 'rfqNumber' },
            { header: 'RFQ Date', accessorKey: 'rfqDate' },
            {
                header: 'Due Date',
                accessorKey: 'dueDate',
                cell: ({ row }) => (
                    <div className='flex gap-2 items-center'>
                        {row.original.dueDate as string}
                        {!user.vendorCode && user.authority?.includes(PERMISSIONS.MANAGE_RFQ) && (
                            <Button
                                variant='twoTone'
                                size='xs'
                                icon={<MdOutlineEdit size={16} />}
                                onClick={() =>
                                    setDueDateModal({
                                        rfqNumber: row.original.rfqNumber,
                                        dueDate: row.original.dueDate,
                                        dueDateRemarks: row.original.dueDateRemarks,
                                        prevDueDates: row.original.prevDueDates,
                                    })
                                }
                            />
                        )}
                    </div>
                ),
            },
            {
                header: 'Preview',
                cell: ({ row }) => <RFQPrintComponent rfq={row.original} />,
            },
            ...(!user.vendorCode
                ? [
                      {
                          header: 'Status',
                          accessorKey: 'status',
                          cell: ({ row }) => (
                              <Tag
                                  color={row.original.status === 'Completed' ? 'green' : row.original.status === 'Authorized' ? 'indigo' : 'amber'}
                                  className='w-full justify-center'>
                                  {row.original.status}
                              </Tag>
                          ),
                      },
                      {
                          header: 'Quotations',
                          cell: ({ row }) => {
                              const isCompleted = row.original.quotations === row.original.totalVendors
                              return (
                                  <div className='flex items-center justify-between gap-2'>
                                      <span>
                                          <Tag
                                              className='w-fit border-none p-0'
                                              prefix={
                                                  <span
                                                      className={classNames(
                                                          'size-2.5 mr-1 rounded-full block border',
                                                          isCompleted ? 'bg-green-500 border-green-600' : 'bg-amber-500 border-amber-600/40',
                                                      )}
                                                  />
                                              }>
                                              {isCompleted ? 'Quotations Received' : 'Pending'}
                                          </Tag>{' '}
                                          ({row.original.quotations + (row.original.regretVendors || 0)}/{row.original.totalVendors})
                                      </span>
                                      <VendorQuotationsDrawer rfqId={row.original._id as string} rfqNumber={row.original.rfqNumber} />
                                  </div>
                              )
                          },
                      },
                  ]
                : []),

            {
                header: 'Items',
                cell: ({ row }) => <RFQItemsDrawer rfqId={row.original._id as string} />,
            },
            {
                header: 'TNC',
                cell: ({ row }) => <TnCDrawer data={row.original.termsConditions} />,
            },
            {
                header: 'Attachments',
                cell: ({ row }) => <AttachmentsDrawer id={row.original._id as string} url={`/rfq/attachments/${row.original._id}`} title='RFQ Attachments' />,
            },
            ...(!user.vendorCode
                ? [
                      { header: 'Created By', accessorKey: 'createdBy' },
                      { header: 'Created At', accessorKey: 'createdAt' },

                      { header: 'Authorized By', accessorKey: 'submittedBy' },
                      { header: 'Authorized At', accessorKey: 'submittedAt' },
                  ]
                : []),
            { header: 'Contact Person Name', accessorKey: 'contactPersonName' },
            { header: 'Contact Number', accessorKey: 'contactNumber' },
            { header: 'Contact Email', accessorKey: 'contactEmail' },
            {
                header: 'Remarks',
                cell: ({ row }) => <TextAreaExtended title={'Remarks'} content={row.original.remarks} />,
            },
        ]
    }, [user])

    return (
        <>
            <CustomDataTable<RFQType>
                title={user.vendorCode ? 'Pending RFQs' : 'RFQ Report'}
                filters={[
                    { label: 'RFQ Number', type: 'text', value: 'rfqNumber' },
                    { label: 'RFQ Date', type: 'date-range', value: 'rfqDate' },
                    {
                        type: 'input-row',
                        fields: [
                            { label: 'Indent Number', type: 'text', value: 'indentNumber' },
                            { label: 'Item Code', type: 'text', value: 'itemCode' },
                        ],
                    },
                    { label: 'Item Description', type: 'text', value: 'itemDescription' },
                    {
                        label: 'Status',
                        type: 'select',
                        value: 'status',
                        options: [
                            { label: 'Initial', value: 'initial' },
                            { label: 'Authorized', value: 'authorized' },
                            { label: 'In Progress', value: 'in-progress' },
                            { label: 'Completed', value: 'completed' },
                            { label: 'Expired', value: 'expired' },
                        ],
                    },
                ]}
                columns={columns}
                fetchApi={'/rfq/list'}
                data={data}
                setData={(_data: RFQType[]) =>
                    setData(
                        _data?.map((i) => ({
                            ...i,
                            rfqDate: formatDate(i.rfqDate as string),
                            dueDate: formatDate(i.dueDate as string),
                            createdAt: formatDate(i.createdAt as string),
                            submittedAt: formatDate(i.submittedAt as string),
                            status: i.status === 2 ? 'Completed' : i.status === 1 ? 'Authorized' : 'Initial',
                        })),
                    )
                }
            />
            <DueDateDialog
                isOpen={Boolean(dueDateModal)}
                rfqData={dueDateModal}
                close={() => setDueDateModal(null)}
                afterSubmit={(newDoc) => {
                    setData((prev) => prev.map((i) => (i.rfqNumber === newDoc.rfqNumber ? newDoc : i)))
                    setDueDateModal(null)
                }}
            />
        </>
    )
}

const RFQPrintComponent = (props: { rfq: RFQType }) => {
    const rfqPreviewRef = useRef<HTMLDivElement>(null)
    const reactToPrintFn = useReactToPrint({ contentRef: rfqPreviewRef })

    const [rfqData, setRfqData] = useState<RFQType | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (rfqData?._id) reactToPrintFn()
    }, [reactToPrintFn, rfqData])

    const handlePrint = async () => {
        if (rfqData?._id === props.rfq?._id) return reactToPrintFn()
        setLoading(true)
        try {
            const [itemsRes, vendorsRes] = await Promise.all([
                ApiService.fetchData<RFQItemType[]>({ url: `/rfq/items/${props.rfq._id}` }),
                ApiService.fetchData<{ vendors: RFQVendorType[] }>({ url: `/rfq/vendors/${props.rfq._id}` }),
            ])
            setRfqData({
                ...props.rfq,
                items: itemsRes.data || [],
                vendors: vendorsRes.data?.vendors || [],
            })
        } catch (e) {
            showError('Failed to fetch rfq data to print. Please contact support.')
        }
        setLoading(false)
    }

    return (
        <>
            <Button variant='twoTone' size='xs' icon={<IoPrintOutline />} loading={loading} onClick={handlePrint}>
                RFQ
            </Button>
            <div ref={rfqPreviewRef} className='hidden print:block'>
                <RFQPrint rfq={rfqData as RFQType} />
            </div>
        </>
    )
}

function DueDateDialog({
    isOpen,
    rfqData,
    close,
    afterSubmit,
}: {
    isOpen: boolean
    rfqData: dueDateModalState
    close: () => void
    afterSubmit: (x: RFQType) => void
}) {
    const [formState, setFormState] = useState<{
        dueDate?: Date | null
        dueDateRemarks?: string
    }>({})

    const handleFormSubmit = async (e: FormEvent) => {
        try {
            e.preventDefault()
            const response = await ApiService.fetchData<RFQType>({
                method: 'PUT',
                url: '/rfq/dueDate',
                data: {
                    rfqNumber: rfqData?.rfqNumber,
                    ...formState,
                },
            })

            afterSubmit(response.data)
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => setFormState({}), [])

    return (
        <Dialog isOpen={isOpen} closable={false}>
            <h5>Update Due Date — {rfqData?.rfqNumber}</h5>
            <form onSubmit={handleFormSubmit}>
                <div className='mt-4 space-y-2'>
                    <div className='flex items-end justify-between'>
                        <div>
                            <span className='inline-block mb-1'>Due Date</span>
                            <DateTimepicker
                                size='sm'
                                value={formState?.dueDate || null}
                                placeholder='Pick date & time'
                                onChange={(newDate) => setFormState((prev) => ({ ...prev, dueDate: newDate }))}
                            />
                        </div>
                        <div className='flex gap-2 mt-2'>
                            <Button type='submit' variant='solid' size='sm'>
                                Update
                            </Button>
                            <Button type='button' variant='default' size='sm' onClick={close}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                    <div>
                        <Input
                            required
                            textArea
                            placeholder='Remarks'
                            className='resize-none max-h-auto h-15 min-h-auto p-1.5 px-2'
                            size='sm'
                            value={formState?.dueDateRemarks || ''}
                            onChange={(e) => setFormState((prev) => ({ ...prev, dueDateRemarks: e.target.value }))}
                        />
                    </div>
                </div>
            </form>

            <Table compact className='text-xs mt-2 relative' containerClassName='max-h-[40vh] overflow-auto relative'>
                <THead className='sticky top-0'>
                    <Tr>
                        <Th>#</Th>
                        <Th>Due Date</Th>
                        <Th>Remarks</Th>
                    </Tr>
                </THead>
                <TBody>
                    <Tr>
                        <Td>1.</Td>
                        <Td>{formatDate(rfqData?.dueDate as string)}</Td>
                        <Td>{rfqData?.dueDateRemarks}</Td>
                    </Tr>
                    {rfqData?.prevDueDates?.map((i, index) => (
                        <Tr key={'prev-due-date:' + index}>
                            <Td>{index + 2}.</Td>
                            <Td>{formatDateTime(i.dueDate as string)}</Td>
                            <Td>{i.dueDateRemarks}</Td>
                        </Tr>
                    ))}
                </TBody>
            </Table>
        </Dialog>
    )
}
