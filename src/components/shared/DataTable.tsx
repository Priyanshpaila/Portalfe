import { forwardRef, useMemo, useRef, useEffect, useState, useImperativeHandle } from 'react'
import classNames from 'classnames'
import Table from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Select from '@/components/ui/Select'
import Checkbox from '@/components/ui/Checkbox'
import TableRowSkeleton from './loaders/TableRowSkeleton'
import Loading from './Loading'
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    flexRender,
    ColumnDef,
    ColumnSort,
    Row,
    CellContext,
    ColumnFiltersState,
} from '@tanstack/react-table'
import type { SkeletonProps } from '@/components/ui/Skeleton'
import type { ForwardedRef, ChangeEvent, ReactNode } from 'react'
import type { CheckboxProps } from '@/components/ui/Checkbox'

export type OnSortParam = { order: 'asc' | 'desc' | ''; key: string | number }

export type DataTableProps<T> = {
    className?: string
    columns: ColumnDef<T>[]
    data?: unknown[]
    loading?: boolean
    sliceRows?: boolean
    onCheckBoxChange?: (checked: boolean, row: T) => void
    onIndeterminateCheckBoxChange?: (checked: boolean, rows: Row<T>[]) => void
    onPaginationChange?: (page: number) => void
    onSelectChange?: (num: number) => void
    onSort?: (sort: OnSortParam) => void
    pageSizes?: number[]
    selectable?: boolean
    skeletonAvatarColumns?: number[]
    skeletonAvatarProps?: SkeletonProps
    footer?: ReactNode
    pagingData?: {
        total: number
        pageIndex: number
        pageSize: number
    }
}

type CheckBoxChangeEvent = ChangeEvent<HTMLInputElement>

interface IndeterminateCheckboxProps extends Omit<CheckboxProps, 'onChange'> {
    onChange: (event: CheckBoxChangeEvent) => void
    indeterminate: boolean
    onCheckBoxChange?: (event: CheckBoxChangeEvent) => void
    onIndeterminateCheckBoxChange?: (event: CheckBoxChangeEvent) => void
}

const { Tr, Th, Td, THead, TBody, Sorter } = Table

const IndeterminateCheckbox = (props: IndeterminateCheckboxProps) => {
    const { indeterminate, onChange, onCheckBoxChange, onIndeterminateCheckBoxChange, ...rest } = props

    const ref = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (typeof indeterminate === 'boolean' && ref.current) {
            ref.current.indeterminate = !rest.checked && indeterminate
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ref, indeterminate])

    const handleChange = (e: CheckBoxChangeEvent) => {
        onChange(e)
        onCheckBoxChange?.(e)
        onIndeterminateCheckBoxChange?.(e)
    }

    return <Checkbox ref={ref} className='mb-0' onChange={(_, e) => handleChange(e)} {...rest} />
}

export type DataTableResetHandle = {
    resetSorting: () => void
    resetSelected: () => void
}

function _DataTable<T>(props: DataTableProps<T>, ref: ForwardedRef<DataTableResetHandle>) {
    const {
        skeletonAvatarColumns,
        columns: columnsProp = [],
        data = [],
        loading = false,
        sliceRows = false,
        onCheckBoxChange,
        onIndeterminateCheckBoxChange,
        onPaginationChange,
        onSelectChange,
        onSort,
        pageSizes = [100, 150, 200, 350, 500, 1000, 1250, 1500, 1750, 2000],
        selectable = false,
        skeletonAvatarProps,
        className,
        footer,
        pagingData = {
            total: 0,
            pageIndex: 1,
            pageSize: 200,
        },
    } = props

    const { pageSize, pageIndex, total } = pagingData

    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [sorting, setSorting] = useState<ColumnSort[] | null>(null)

    const pageSizeOption = useMemo(
        () =>
            pageSizes.map((number) => ({
                value: number,
                label: `${number} / page`,
            })),
        [pageSizes],
    )

    const handleCheckBoxChange = (checked: boolean, row: T) => {
        if (!loading) {
            onCheckBoxChange?.(checked, row)
        }
    }

    const handleIndeterminateCheckBoxChange = (checked: boolean, rows: Row<T>[]) => {
        if (!loading) {
            onIndeterminateCheckBoxChange?.(checked, rows)
        }
    }

    const handlePaginationChange = (page: number) => {
        if (!loading) {
            onPaginationChange?.(page)
        }
    }

    const handleSelectChange = (value?: number) => {
        if (!loading) {
            onSelectChange?.(Number(value))
        }
    }

    useEffect(() => {
        if (Array.isArray(sorting)) {
            const sortOrder = sorting.length > 0 ? (sorting[0].desc ? 'desc' : 'asc') : ''
            const id = sorting.length > 0 ? sorting[0].id : ''
            onSort?.({ order: sortOrder, key: id })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sorting])

    const finalColumns: ColumnDef<T>[] = useMemo(() => {
        const columns = columnsProp

        if (selectable) {
            return [
                {
                    id: 'select',
                    header: ({ table }) => (
                        <IndeterminateCheckbox
                            checked={table.getIsAllRowsSelected()}
                            indeterminate={table.getIsSomeRowsSelected()}
                            onChange={table.getToggleAllRowsSelectedHandler()}
                            onIndeterminateCheckBoxChange={(e) => {
                                handleIndeterminateCheckBoxChange(e.target.checked, table.getRowModel().rows)
                            }}
                        />
                    ),
                    cell: ({ row }) => (
                        <IndeterminateCheckbox
                            checked={row.getIsSelected()}
                            disabled={!row.getCanSelect()}
                            indeterminate={row.getIsSomeSelected()}
                            onChange={row.getToggleSelectedHandler()}
                            onCheckBoxChange={(e) => handleCheckBoxChange(e.target.checked, row.original)}
                        />
                    ),
                },
                ...columns,
            ]
        }
        return columns
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [columnsProp, selectable])

    const table = useReactTable({
        data,
        // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        columns: finalColumns as ColumnDef<unknown | object | any[], any>[],

        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        manualPagination: true,
        manualSorting: true,
        onSortingChange: (sorter) => setSorting(sorter as ColumnSort[]),
        onColumnFiltersChange: setColumnFilters,
        debugTable: false,
        state: {
            sorting: sorting as ColumnSort[],
            columnFilters,
        },
    })

    const resetSorting = () => {
        table.resetSorting()
    }

    const resetSelected = () => {
        table.toggleAllRowsSelected(false)
    }

    useImperativeHandle(ref, () => ({
        resetSorting,
        resetSelected,
    }))

    return (
        <Loading loading={loading && data.length === 0} type='cover'>
            <Table compact containerClassName={className}>
                <THead className='sticky top-0 z-20'>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <Tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <Th
                                        key={header.id}
                                        colSpan={header.colSpan}
                                        className={classNames(
                                            header.column.columnDef.meta?.sticky ? 'sticky left-0 z-20 bg-[#dfe1e6]' : undefined,
                                            'align-text-top whitespace-nowrap',
                                        )}>
                                        {header.isPlaceholder ? null : (
                                            <div
                                                className={classNames(
                                                    header.column.getCanSort() && 'cursor-pointer select-none point',
                                                    loading && 'pointer-events-none',
                                                )}
                                                onClick={header.column.getToggleSortingHandler()}>
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {header.column.getCanSort() && <Sorter sort={header.column.getIsSorted()} />}
                                            </div>
                                        )}
                                        {header.column.getCanFilter() && (
                                            <div>
                                                <input
                                                    type='text'
                                                    className='bg-gray-50 rounded-sm focus:outline-blue-700 p-0.5 mt-1 !max-w-auto !w-full'
                                                    value={(header.column.getFilterValue() ?? '') as string}
                                                    onChange={(e) => header.column.setFilterValue(e.target.value)}
                                                />
                                            </div>
                                        )}
                                    </Th>
                                )
                            })}
                        </Tr>
                    ))}
                </THead>
                {loading && data.length === 0 ? (
                    <TableRowSkeleton
                        // eslint-disable-next-line  @typescript-eslint/no-explicit-any
                        columns={(finalColumns as Array<T>).length}
                        rows={2}
                        avatarInColumns={skeletonAvatarColumns}
                        avatarProps={skeletonAvatarProps}
                    />
                ) : (
                    <TBody>
                        {(!sliceRows ? table.getRowModel().rows : table.getRowModel().rows.slice((pageIndex - 1) * pageSize, pageIndex * pageSize)).map(
                            (row) => (
                                <Tr key={row.id}>
                                    {row.getVisibleCells().map((cell) => {
                                        return (
                                            <Td key={cell.id} className={cell.column.columnDef.meta?.sticky ? 'sticky left-0 z-10 bg-[#fff]' : undefined}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </Td>
                                        )
                                    })}
                                </Tr>
                            ),
                        )}
                    </TBody>
                )}
                {footer}
            </Table>
            {total / pageSize > 1 && (
                <div className='flex items-center justify-between mt-4'>
                    <Pagination pageSize={pageSize} currentPage={pageIndex} total={total} onChange={handlePaginationChange} />
                    <div style={{ minWidth: 130 }}>
                        <Select
                            size='xs'
                            menuPlacement='top'
                            isSearchable={false}
                            value={pageSizeOption.filter((option) => option.value === pageSize)}
                            options={pageSizeOption}
                            onChange={(option) => handleSelectChange(option?.value)}
                        />
                    </div>
                </div>
            )}
        </Loading>
    )
}

const DataTable = forwardRef(_DataTable) as <T>(
    props: DataTableProps<T> & {
        ref?: ForwardedRef<DataTableResetHandle>
    },
) => ReturnType<typeof _DataTable>

export type { ColumnDef, Row, CellContext }
export default DataTable
