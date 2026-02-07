import { memo, useMemo, useState } from 'react'
import type { ColumnDef } from '@/components/shared/DataTable'
import { Checkbox, Button } from '../ui'
import { MdEdit } from 'react-icons/md'
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

    // ✅ NEW
    onEditIndent?: (row: IndentType) => void
}

function IndentsComponent({ disabled, indents, selection, handleSelection, handleSelectAll, onEditIndent }: IndentsProps) {
    const [pageData, setPageData] = useState({ pageIndex: 1, pageSize: 320 })

    const _indents: IndentType[] = useMemo(() => {
        return indents?.map((i) => ({
            ...i,
            _documentDate: formatDate(i.documentDate),
            lastChangedOn: formatDate(i.lastChangedOn),
            company: companies.find((c) => c.plantCode === i.company)?.alias || i.company,
            indentQty: (typeof i.indentQty === 'number' ? i.indentQty : Number(i.indentQty || 0)).toFixed(3),
            preRFQQty: (typeof i.preRFQQty === 'number' ? i.preRFQQty : Number(i.preRFQQty || 0)).toFixed(3),
            prePOQty: (typeof i.prePOQty === 'number' ? i.prePOQty : Number(i.prePOQty || 0)).toFixed(3),
            balanceQty: (typeof i.balanceQty === 'number' ? i.balanceQty : Number(i.balanceQty || 0)).toFixed(3),
        }))
    }, [indents])

    const columns: ColumnDef<IndentType>[] = useMemo(() => {
        return [
            { enableSorting: false, header: '#', cell: ({ cell }) => cell.row.index + 1 + '.' },

            {
                id: 'checkbox',
                meta: { sticky: true },
                enableSorting: false,
                header: () => (
                    <Checkbox
                        className="bg-white overflow-hidden rounded-sm"
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

            // ✅ NEW: Edit column (button opens modal)
            {
                id: 'edit',
                enableSorting: false,
                header: 'Edit',
                cell: ({ row }) => {
                    const r = row.original
                    const id = r.id || r._id || ''
                    const isSelected = Boolean(selection[String(id)])

                    // If you want "Edit only when selected", uncomment this:
                    // if (!isSelected) return null;

                    return (
                        <div className="flex justify-center">
                            <Button
                                type="button"
                                size="xs"
                                variant="twoTone"
                                disabled={disabled || !onEditIndent}
                                icon={<MdEdit className="size-4" />}
                                onClick={() => onEditIndent?.(r)}
                            >
                                Edit
                            </Button>
                        </div>
                    )
                },
            },

            // { enableSorting: false, header: 'Company', accessorKey: 'company' },
            { enableSorting: false, header: 'Indent No', accessorKey: 'indentNumber' },
            { enableSorting: false, header: 'Indent Date', accessorKey: '_documentDate' },
            // { enableSorting: false, header: 'Line No', accessorKey: 'lineNumber' },
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
                cell: ({ row }) => <span className="inline-block w-full text-right">{row.original.indentQty}</span>,
            },
            {
                enableSorting: false,
                header: 'Pre RFQ Qty',
                accessorKey: 'preRFQQty',
                cell: ({ row }) => <span className="inline-block w-full text-right">{row.original.preRFQQty}</span>,
            },
            {
                enableSorting: false,
                header: 'Pre PO Qty',
                accessorKey: 'prePOQty',
                cell: ({ row }) => <span className="inline-block w-full text-right">{row.original.prePOQty}</span>,
            },
            {
                enableSorting: false,
                header: 'Balance Qty',
                accessorKey: 'balanceQty',
                cell: ({ row }) => <span className="inline-block w-full text-right">{row.original.balanceQty}</span>,
            },
        ]
    }, [disabled, indents, selection, handleSelectAll, handleSelection, onEditIndent])

    return (
        <DataTable<IndentType>
            sliceRows
            columns={columns}
            data={_indents}
            className="max-h-[45vh] overflow-auto"
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

    // ✅ include onEditIndent ref change check (optional but safe)
    const onEditChanged = prev.onEditIndent !== next.onEditIndent

    return !selectionChanged && !disabledChanged && !indentsLengthChanged && !onEditChanged
})

export default Indents
