import { useMemo, useState } from 'react'
import type { ColumnDef } from '@/components/shared/DataTable'

import CustomDataTable from '@/components/app/CustomDataTable'
import { QuotationType as _QType } from '@/@types/app'
import { formatDate } from '@/utils/formatDate'
import { AttachmentsDrawer } from '@/components/app/Attachments'
import { QuotationItemsDrawer } from '@/components/app/QuotationItems'
import { Link } from 'react-router-dom'
import { MdOutlineEdit } from 'react-icons/md'
import { Button, Tag } from '@/components/ui'
import { useAppSelector } from '@/store'
import { PERMISSIONS } from '@/utils/permissions'
import { TnCDrawer } from '@/components/app/TermsAndConditions'
import { QuotaionPrintComponent } from '@/components/app/VendorQuotations'
import TextAreaExtended from '@/components/app/TextAreaExtended'

type QuotationType = Omit<_QType, 'status'> & {
    status: number
    statusLabel?: string
    basic: string
    discount: string
    otherCharges: string
    igst: string
    cgst: string
    sgst: string
    total: string
    vendorName: string
}

const quotationStatus: Record<number, { label: string; color: string }> = {
    3: { label: 'Not Selected', color: 'orange' },
    2: { label: 'Completed', color: 'green' },
    1.5: { label: 'Authorized', color: 'blue' },
    1: { label: 'Authorized', color: 'blue' },
    0: { label: 'Initial', color: 'amber' },
}

export default function Quotations() {
    const user = useAppSelector((state) => state.auth.user)
    const [data, setData] = useState<QuotationType[]>([])
    const columns: ColumnDef<QuotationType>[] = useMemo(() => {
        return [
            { header: '#', cell: ({ cell }) => cell.row.index + 1 },
            ...(user?.authority?.includes(PERMISSIONS.VENDOR_ACCESS)
                ? [
                      {
                          id: 'edit',
                          cell: ({ row }) =>
                              user.vendorCode === row.original.vendorCode ? (
                                  <Link to={`/quotation?quotationNumber=${encodeURIComponent(row.original.quotationNumber)}`}>
                                      <Button variant='twoTone' size='xs' icon={<MdOutlineEdit />} color='red' />
                                  </Link>
                              ) : null,
                      },
                  ]
                : []),
            { header: 'quotation Number', accessorKey: 'quotationNumber' },
            { header: 'quotation Date', accessorKey: 'quotationDate' },
            { header: 'validity Date', accessorKey: 'validityDate' },
            { header: 'RFQ Number', accessorKey: 'rfqNumber' },
            {
                header: 'status',
                accessorKey: 'status',
                cell: ({ row }) => <Tag color={quotationStatus[row.original.status].color}>{row.original.statusLabel}</Tag>,
            },
            { header: 'credit Days', accessorKey: 'creditDays' },
            { header: 'freight Type', accessorKey: 'freightType' },
            { header: 'payment Mode', accessorKey: 'paymentMode' },
            { header: 'vendor', accessorKey: 'vendorCode' },
            { header: 'vendor Location', accessorKey: 'vendorLocation' },
            { header: 'contact Person Name', accessorKey: 'contactPersonName' },
            { header: 'contact Number', accessorKey: 'contactNumber' },
            { header: 'contact Email', accessorKey: 'contactEmail' },
            {
                header: 'Items',
                cell: ({ row }) => <QuotationItemsDrawer quotationId={row.original._id as string} />,
            },
            {
                header: 'Preview',
                cell: ({ row }) => <QuotaionPrintComponent quotation={row.original} vendorName={row.original.vendorName} />,
            },
            {
                header: 'TNC',
                cell: ({ row }) => <TnCDrawer data={row.original.termsConditions} />,
            },
            {
                header: 'Attachments',
                cell: ({ row }) => (
                    <AttachmentsDrawer id={row.original._id as string} url={`/quotation/attachments/${row.original._id}`} title={'Quotation Attachments'} />
                ),
            },
            { header: 'basic', accessorKey: 'basic', cell: ({ row }) => <span className='block text-right'>₹{row.original.basic}</span> },
            { header: 'discount', accessorKey: 'discount', cell: ({ row }) => <span className='block text-right'>₹{row.original.discount}</span> },
            { header: 'other Charges', accessorKey: 'otherCharges', cell: ({ row }) => <span className='block text-right'>₹{row.original.otherCharges}</span> },
            { header: 'igst', accessorKey: 'igst', cell: ({ row }) => <span className='block text-right'>₹{row.original.igst}</span> },
            { header: 'cgst', accessorKey: 'cgst', cell: ({ row }) => <span className='block text-right'>₹{row.original.cgst}</span> },
            { header: 'sgst', accessorKey: 'sgst', cell: ({ row }) => <span className='block text-right'>₹{row.original.sgst}</span> },
            { header: 'total', accessorKey: 'total', cell: ({ row }) => <span className='block text-right'>₹{row.original.total}</span> },
            {
                header: 'Remarks',
                cell: ({ row }) => <TextAreaExtended title={'Remarks'} content={row.original.remarks} />,
            },
            // {
            //     header: 'remarks',
            //     cell: ({ row }) => <AttachmentsDrawer url={`/rfq/attachments/${row.original._id}`} title={'RFQ Attachments'} />,
            // },
        ]
    }, [])

    return (
        <CustomDataTable<QuotationType>
            title='Quotations'
            filters={[
                { label: 'Quotation Number', type: 'text', value: 'quotationNumber' },
                { label: 'Quotation Date', type: 'date-range', value: 'quotationDate' },
                { label: 'RFQ Number', type: 'text', value: 'rfqNumber' },
                { label: 'RFQ Date', type: 'date-range', value: 'rfqDate' },
                { label: 'Vendor', type: 'debounced-select', value: 'vendorCode', url: '/vendor/values', hidden: Boolean(user.vendorCode) },
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
                    hidden: !user.vendorCode,
                    options: [
                        ...(user.vendorCode
                            ? [
                                  { label: 'Initial', value: 'initial' },
                                  { label: 'Authorized', value: 'authorized' },
                              ]
                            : []),
                        { label: 'In progress', value: 'inProgress' },
                        { label: 'Completed', value: 'completed' },
                    ],
                },
            ]}
            columns={columns}
            fetchApi={'/quotation/list'}
            data={data}
            setData={(_data: QuotationType[]) =>
                setData(
                    _data?.map((i) => ({
                        ...i,
                        validityDate: formatDate(i.validityDate as string),
                        quotationDate: formatDate(i.quotationDate as string),
                        statusLabel: quotationStatus[+i.status].label,
                        basic: i.amount.basic.toFixed(2),
                        discount: i.amount.discount.toFixed(2),
                        otherCharges: (i.amount.otherCharges || 0)?.toFixed(2),
                        igst: i?.amount?.igst?.toFixed(2) || '',
                        cgst: i?.amount?.cgst?.toFixed(2) || '',
                        sgst: i?.amount?.sgst?.toFixed(2) || '',
                        total: i?.amount?.total?.toFixed(2) || '',
                    })),
                )
            }
        />
    )
}
