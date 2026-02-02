import { memo, useState } from 'react'
import type { ColumnDef } from '@/components/shared/DataTable'
import { Checkbox } from '../ui'
import { IndentType as _IndentType, IndentItemType, RFQItemType, RFQType } from '@/@types/app'
import { formatDate } from '@/utils/formatDate'
import { companies } from '@/utils/data'
import DataTable from '@/components/shared/DataTable'

export type IndentRowType = Omit<IndentType, 'items' | 'date'> & IndentItemType & RFQType & RFQItemType & { date: string }
type IndentType = Omit<_IndentType, 'indentQty' | 'preRFQQty' | 'prePOQty' | 'balanceQty' | 'lastChangedOn'> & {
    _id?: string
    _documentDate?: string
    lastChangedOn?: string
    indentQty: string
    preRFQQty: string
    prePOQty: string
    balanceQty: string
}

interface IndentsProps {
    indents: _IndentType[]
    disabled?: boolean
    className?: string
    selection: { [id: string]: boolean }
    handleSelection: (row: IndentType, selected: boolean) => void
    handleSelectAll: (selected: boolean) => void
}

function IndentsComponent({ disabled, indents, selection, handleSelection, handleSelectAll }: IndentsProps) {
    const [pageData, setPageData] = useState({ pageIndex: 1, pageSize: 320 })

    const _indents: IndentType[] = indents?.map((i) => ({
        ...i,
        _documentDate: formatDate(i.documentDate),
        lastChangedOn: formatDate(i.lastChangedOn),
        company: companies.find((c) => c.plantCode === i.company)?.alias || i.company,
        indentQty: i.indentQty.toFixed(3),
        preRFQQty: i.preRFQQty.toFixed(3),
        prePOQty: i.prePOQty.toFixed(3),
        balanceQty: i.balanceQty.toFixed(3),
    }))

    const columns: ColumnDef<IndentType>[] = [
        { enableSorting: false, header: '#', cell: ({ cell }) => cell.row.index + 1 + '.' },
        {
            id: 'checkbox',
            meta: {
                sticky: true,
            },
            enableSorting: false,
            header: () => (
                <Checkbox
                    className='bg-white overflow-hidden rounded-sm'
                    disabled={disabled || !indents?.[0]}
                    checked={Boolean(Object.values(selection).filter((i) => i).length === indents.length && indents.length)}
                    onChange={(value) => handleSelectAll(value)}
                />
            ),
            cell: ({ cell }) => (
                <Checkbox
                    disabled={disabled}
                    checked={Boolean(selection[cell.row.original.id || ''])}
                    onChange={(value) => handleSelection(cell.row.original, value)}
                />
            ),
        },
        { enableSorting: false, header: 'Company', accessorKey: 'company' },
        { enableSorting: false, header: 'Indent No', accessorKey: 'indentNumber' },
        { enableSorting: false, header: 'Indent Date', accessorKey: '_documentDate' },
        { enableSorting: false, header: 'Line No', accessorKey: 'lineNumber' },
        { enableSorting: false, header: 'Item Code', accessorKey: 'itemCode' },
        { enableSorting: false, header: 'Item Description', accessorKey: 'itemDescription' },
        { enableSorting: false, header: 'Tech Specification', accessorKey: 'techSpec' },
        { enableSorting: false, header: 'Make', accessorKey: 'make' },
        { enableSorting: false, header: 'Unit', accessorKey: 'unitOfMeasure' },
        { enableSorting: false, header: 'Indent Item Remark', accessorKey: 'remark' },
        { enableSorting: false, header: 'Cost Center', accessorKey: 'costCenter' },
        { enableSorting: false, header: 'Requested By', accessorKey: 'requestedBy' },
        { enableSorting: false, header: 'Indent Type', accessorKey: 'documentType' },
        { enableSorting: false, header: 'Last Changed On', accessorKey: 'lastChangedOn' },

        {
            enableSorting: false,
            header: 'Indent QTY',
            accessorKey: 'indentQty',
            cell: ({ row }) => <span className='inline-block w-full text-right'>{row.original.indentQty}</span>,
        },
        {
            enableSorting: false,
            header: 'Pre RFQ Qty',
            accessorKey: 'preRFQQty',
            cell: ({ row }) => <span className='inline-block w-full text-right'>{row.original.preRFQQty}</span>,
        },
        {
            enableSorting: false,
            header: 'Pre PO Qty',
            accessorKey: 'prePOQty',
            cell: ({ row }) => <span className='inline-block w-full text-right'>{row.original.prePOQty}</span>,
        },
        {
            enableSorting: false,
            header: 'Balance Qty',
            accessorKey: 'balanceQty',
            cell: ({ row }) => <span className='inline-block w-full text-right'>{row.original.balanceQty}</span>,
        },
    ]

    return (
        <DataTable<IndentType>
            sliceRows
            columns={columns}
            data={_indents}
            className='max-h-[45vh] overflow-auto'
            pagingData={{
                total: indents.length,
                pageIndex: pageData.pageIndex,
                pageSize: pageData.pageSize,
            }}
            onSelectChange={(pageSize) => setPageData((prev) => ({ ...prev, pageSize }))}
            onPaginationChange={(pageIndex) => setPageData((prev) => ({ ...prev, pageIndex }))}
        />
    )
}

const Indents = memo(IndentsComponent, (prev, next) => {
    const selectionChanged = JSON.stringify(prev.selection) !== JSON.stringify(next.selection)
    const disabledChanged = prev.disabled !== next.disabled
    const indentsLengthChanged = prev.indents.length !== next.indents.length
    return !selectionChanged && !disabledChanged && !indentsLengthChanged
})

export default Indents
