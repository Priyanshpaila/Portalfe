import { useMemo, useRef, useState } from 'react'
import type { ColumnDef } from '@/components/shared/DataTable'
import { CSType, IndentType, POType, RFQItemType, RFQType } from '@/@types/app'
import { formatDate } from '@/utils/formatDate'
import { companies, divisons } from '@/utils/data'
import CustomDataTable from '@/components/app/CustomDataTable'
import { fetchToExportExcel as fetchToExportExcel } from '@/utils/exportTableToExcel'
import { RiFileExcel2Line } from 'react-icons/ri'

type IndentRegisterRow = Omit<IndentType, 'indentQty' | 'balanceQty'> & {
    _id?: string
    indentQty: number | string
    balanceQty: number | string
    rfqQty?: RFQItemType['rfqQty'] | string
    rfqNumber?: RFQType['rfqNumber']
    rfqDate?: RFQType['rfqDate']
    dueDate?: RFQType['dueDate']
    csNumber?: CSType['csNumber']
    poNumber?: POType['poNumber']
    poDate?: POType['poDate']

    status?: string
    sapCreationDate?: string
    sapAuthorized?: string
    // sapCreationDate?: POType['sapCreationDate'] | string
    // sapAuthorized?: POType['sapAuthorized'] | string
    expiryReason?: string
    department?: string
}

export default function IndentRegister() {
    const sheetRef = useRef<HTMLDivElement>(null)
    const [data, setData] = useState<IndentRegisterRow[]>([])

    const columns: ColumnDef<IndentRegisterRow>[] = useMemo(() => {
        return [
            { header: '#', cell: ({ cell }) => cell.row.index + 1 + '.' },

            { header: 'Company', accessorKey: 'company' },
            { header: 'Division', accessorKey: 'divison' },
            { header: 'Indent No', accessorKey: 'indentNumber' },
            { header: 'Indent Date', accessorKey: 'documentDate' },
            { header: 'Ref Doc No', accessorKey: 'documentNumber' },

            { header: 'Line No', accessorKey: 'lineNumber' },
            { header: 'Item Code', accessorKey: 'itemCode' },
            { header: 'Item Description', accessorKey: 'itemDescription' },
            { header: 'Tech Specification', accessorKey: 'techSpec' },
            { header: 'Make', accessorKey: 'make' },
            { header: 'Unit', accessorKey: 'unitOfMeasure' },
            { header: 'Indent Item Remark', accessorKey: 'remark' },
            { header: 'Cost Center', accessorKey: 'costCenter' },
            { header: 'Requested By', accessorKey: 'requestedBy' },
            { header: 'Indent Type', accessorKey: 'documentType' },

            {
                header: 'Indent Qty',
                accessorKey: 'indentQty',
                cell: ({ row }) => <span className='inline-block w-full text-right'>{row.original.indentQty}</span>,
            },
            {
                header: 'Balance Qty',
                accessorKey: 'balanceQty',
                cell: ({ row }) => <span className='inline-block w-full text-right'>{row.original.balanceQty}</span>,
            },
            {
                header: 'RFQ Qty',
                accessorKey: 'rfqQty',
                cell: ({ row }) => <span className='inline-block w-full text-right'>{row.original.rfqQty}</span>,
            },

            { header: 'RFQ No', accessorKey: 'rfqNumber' },
            { header: 'RFQ Date', accessorKey: 'rfqDate' },
            { header: 'RFQ Due Date', accessorKey: 'dueDate' },
            { header: 'Quotation No', accessorKey: 'quotationNumber' },
            { header: 'CS No', accessorKey: 'csNumber' },
            { header: 'PO No', accessorKey: 'poNumber' },
            { header: 'PO Date', accessorKey: 'poDate' },
        ]
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const transfromValues = (i: IndentRegisterRow) => ({
        ...i,
        company: companies.find((c) => c.plantCode === i.company)?.alias || i.company,
        division: divisons[0].label,
        documentDate: formatDate(i.documentDate),
        indentQty: (+i.indentQty)?.toFixed?.(3),
        balanceQty: (+i.balanceQty)?.toFixed?.(3),
        rfqQty: (i.rfqQty as number)?.toFixed?.(3),
        rfqDate: formatDate(i.rfqDate),
        dueDate: formatDate(i.dueDate),
        poDate: formatDate(i.poDate),
    })

    const fetchApi = '/indent/register'

    return (
        <div ref={sheetRef}>
            <CustomDataTable<IndentRegisterRow>
                title='Indent Register'
                fetchApi={fetchApi}
                className={'custom-data-table whitespace-nowrap'}
                filters={[
                    {
                        label: 'Company',
                        type: 'select',
                        value: 'company',
                        isMulti: true,
                        options: companies?.map((i) => ({
                            value: i.plantCode,
                            label: i.alias,
                        })),
                    },
                    { label: 'Indent Date', type: 'date-range', value: 'documentDate' },
                    {
                        type: 'input-row',
                        fields: [
                            { label: 'Indent Number', type: 'text', value: 'indentNumber' },
                            { label: 'Item Code', type: 'text', value: 'itemCode' },
                        ],
                    },
                    { label: 'Item Description', type: 'text', value: 'itemDescription' },
                    // { label: 'Expiring In (days)', type: 'number', value: 'expiringIn' },
                    {
                        label: 'Status',
                        type: 'select',
                        value: 'status',
                        options: [
                            { label: 'Pending', value: 'pending' },
                            { label: 'In Progress', value: 'inProgress' },
                            { label: 'Completed', value: 'completed' },
                            // { label: 'Expired', value: 'expired' },
                        ],
                    },
                ]}
                defaultFilters={{
                    status: 'completed',
                }}
                columns={columns}
                data={data}
                setData={(_data: IndentRegisterRow[]) => setData(_data.map(transfromValues))}
                actions={[
                    {
                        type: 'button',
                        icon: <RiFileExcel2Line />,
                        color: 'green',
                        title: 'Export to Excel',
                        handler: async ({ tableData, setLoading }) => {
                            setLoading(true)
                            await fetchToExportExcel<IndentRegisterRow>(fetchApi, tableData.filters, columns, transfromValues)
                            setLoading(false)
                        },
                    },
                ]}
            />
        </div>
    )
}
