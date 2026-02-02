import { useState, useEffect, SetStateAction, Dispatch, ReactNode, Fragment, ChangeEvent } from 'react'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, DataTableProps, OnSortParam } from '@/components/shared/DataTable'
import ApiService from '@/services/ApiService'
import { Button, DatePicker, Drawer, Dropdown, Input, InputGroup, Select, Spinner } from '@/components/ui'
import { FiFilter } from 'react-icons/fi'
import { OptionType } from '@/@types/app'
import { HiMiniChevronRight } from 'react-icons/hi2'
import { ConfirmDialog, Loading } from '../shared'
import { useNavigate } from 'react-router-dom'
import DebouncedSelect from './DebouncedSelect'
import axios from 'axios'
import { MultiValue } from 'react-select'

type FilterType = (
    | {
          type: 'date' | 'text' | 'number' | 'date-range'
          label: string
          value: string
      }
    | {
          type: 'select' | 'debounced-select'
          label: string
          value: string
          url?: string
          isMulti?: boolean
          options?: OptionType[]
      }
    | { type: 'input-row'; fields: FilterType[] }
) & {
    hidden?: boolean
}

type ActionType = {
    type: 'button' | 'link'
    title: string
    to?: string
    color?: string
    handler?: (params: { tableData: TableDataType; loading: boolean; setLoading: (flag: boolean) => void }) => void
    icon?: React.ReactNode
}

interface DataWithId {
    _id?: string
}

type DeleteStateEntity = {
    _id: string
    name: string
    info: string | ReactNode
}

type CustomDataTableProps<T extends DataWithId> = Omit<DataTableProps<T>, 'data'> & {
    className?: string
    fetchApi?: string
    title?: string
    data: T[]
    setData: Dispatch<SetStateAction<T[]>> | ((prev: T[]) => void)
    actions?: ActionType[]
    filters?: FilterType[]
    defaultFilters?: TableDataType['filters']
    onFreshSearch?: (filters: TableDataType['filters']) => void
    rowActions?: {
        edit?: {
            getPath?: (data: T) => string
            handler?: (data: T) => void
        }
        delete?: {
            deleteApi: string
            getEntityInfo: (data: T) => DeleteStateEntity
        }
    }
}

export type TableDataType = {
    pageIndex: number
    pageSize: number
    sort: {
        order: '' | 'asc' | 'desc'
        key: string | number
    }
    query: string
    total: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filters: { [key: string]: any }
}

type DeleteStateType = {
    isOpen: boolean
    entityDetails?: DeleteStateEntity
}

function CustomDataTable<T extends DataWithId>({
    columns,
    title,
    data,
    setData,
    onFreshSearch,
    fetchApi,
    actions,
    filters,
    defaultFilters = {},
    rowActions,
    ...props
}: CustomDataTableProps<T>) {
    const [loading, setLoading] = useState(false)
    const [deleteState, setDeleteState] = useState<DeleteStateType>({
        isOpen: false,
    })
    const [tableData, setTableData] = useState<TableDataType>({
        total: 0,
        pageIndex: 1,
        pageSize: 500,
        query: '',
        sort: {
            order: '',
            key: '',
        },
        filters: defaultFilters,
    })

    const navigate = useNavigate()

    const handlePaginationChange = (pageIndex: number) => {
        setTableData((prevData) => ({ ...prevData, ...{ pageIndex } }))
    }

    const handleSelectChange = (pageSize: number) => {
        setTableData((prevData) => ({ ...prevData, ...{ pageSize } }))
    }

    const handleSort = ({ order, key }: OnSortParam) => {
        setTableData((prevData) => ({
            ...prevData,
            sort: { order, key },
        }))
    }

    useEffect(() => {
        if (!fetchApi) return

        const controller = new AbortController()

        const fetchHandler = async () => {
            setLoading(true)
            try {
                if (onFreshSearch && tableData.pageIndex === 1) onFreshSearch(tableData.filters)

                const response = await ApiService.fetchData<{
                    data: T[]
                    total?: number
                }>({
                    method: 'POST',
                    url: fetchApi,
                    data: tableData,
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                })

                if (response.data) {
                    setData(response.data.data)
                    setTableData((prevData) => ({
                        ...prevData,
                        total: response.data.total || prevData.total,
                    }))
                }
            } catch (error) {
                if (axios.isCancel(error)) console.error('Request canceled:', error.message)
                else console.error('Other error', error)
            }
            setLoading(false)
        }

        fetchHandler()
        return () => controller.abort()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tableData.pageIndex, tableData.sort, tableData.pageSize, tableData.query, tableData.filters])

    const editCol: ColumnDef<T>[] = rowActions
        ? [
              {
                  id: 'actions',
                  cell: ({ row }) => (
                      <Dropdown trigger='hover' placement='middle-start-bottom' renderTitle={<HiMiniChevronRight size={18} />} menuClass='!translate-y-4'>
                          <Dropdown.Item
                              eventKey='delete'
                              className='hover:!bg-sky-700 hover:!text-white'
                              onClick={() => {
                                  if (rowActions?.edit?.getPath) navigate(rowActions?.edit?.getPath(row.original))
                                  else if (rowActions?.edit?.handler) rowActions?.edit?.handler(row.original)
                              }}>
                              Edit
                          </Dropdown.Item>
                          <Dropdown.Item
                              eventKey='delete'
                              className='hover:!bg-red-500 hover:!text-white'
                              onClick={() =>
                                  setDeleteState({
                                      isOpen: true,
                                      entityDetails: rowActions?.delete?.getEntityInfo(row.original),
                                  })
                              }>
                              Delete
                          </Dropdown.Item>
                      </Dropdown>
                  ),
              },
          ]
        : []

    const _cols: ColumnDef<T>[] = editCol.concat(columns)

    return (
        <div className='custom-data-table whitespace-nowrap'>
            <div className='flex justify-between items-center mb-2'>
                {title && <h2 className='text-xl'>{title}</h2>}
                <div className='flex items-center gap-2'>
                    {actions?.map((i) => (
                        <Button
                            key={'action:' + i.title}
                            size='sm'
                            variant='twoTone'
                            icon={loading ? <Spinner color={i.color} size={15} /> : i.icon}
                            color={i.color}
                            onClick={() => i.handler?.({ tableData, loading, setLoading: (_) => setLoading(_) })}>
                            {i.title}
                        </Button>
                    ))}
                    {filters?.length && (
                        <Filters
                            defaultValues={tableData.filters}
                            filters={filters}
                            onSearch={(filterValues: TableDataType['filters']) =>
                                setTableData((prev) => ({
                                    ...prev,
                                    filters: filterValues,
                                    pageIndex: 1,
                                }))
                            }
                        />
                    )}
                </div>
            </div>

            <DataTable<T>
                columns={_cols}
                data={data}
                loading={loading}
                pagingData={{
                    total: tableData.total,
                    pageIndex: tableData.pageIndex,
                    pageSize: tableData.pageSize,
                }}
                onPaginationChange={handlePaginationChange}
                onSelectChange={handleSelectChange}
                onSort={handleSort}
                {...props}
            />

            {rowActions?.delete && (
                <DeleteModal
                    isOpen={deleteState.isOpen}
                    entityDetails={deleteState.entityDetails}
                    deleteApi={rowActions.delete.deleteApi + deleteState?.entityDetails?._id}
                    onClose={() => setDeleteState((prev) => ({ ...prev, isOpen: false }))}
                    onAfterDelete={() => {
                        setData(data.filter((i) => i._id !== deleteState?.entityDetails?._id))
                        setDeleteState((prev) => ({ ...prev, isOpen: false }))
                    }}
                />
            )}
        </div>
    )
}

const DeleteModal = ({
    isOpen,
    entityDetails,
    deleteApi,
    onAfterDelete,
    onClose,
}: DeleteStateType & {
    deleteApi: string
    onAfterDelete: () => void
    onClose: () => void
}) => {
    const [loading, setLoading] = useState(false)
    const onDelete = async () => {
        try {
            setLoading(true)
            await ApiService.fetchData({
                method: 'delete',
                url: deleteApi,
            })
            onAfterDelete()
        } catch (error) {
            console.error(error)
        }
        setLoading(false)
    }

    return (
        <ConfirmDialog
            loading={loading}
            closable={false}
            isOpen={!!isOpen}
            type='danger'
            confirmText='Yes, delete'
            confirmButtonColor='red'
            title={'Delete ' + entityDetails?.name}
            onConfirm={onDelete}
            onCancel={onClose}
            onClose={onClose}>
            <b>{entityDetails?.info}</b>
            <p>Are you sure to delete this {entityDetails?.name.toLowerCase()}? On confirm, data will be deleted permanently. This action is irreversible.</p>
        </ConfirmDialog>
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Filters = ({
    filters,
    defaultValues,
    onSearch,
}: {
    filters: FilterType[]
    defaultValues: TableDataType['filters']
    onSearch: (filterValues: TableDataType['filters']) => void
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [options, setOptions] = useState<{ [key: string]: OptionType[] }>({})
    const [values, _setValues] = useState<TableDataType['filters']>({})

    const setValues = (key: string, value: TableDataType['filters']['key']) => _setValues((prevValues) => ({ ...prevValues, [key]: value || '' }))

    useEffect(() => {
        _setValues(defaultValues)
    }, [defaultValues])

    useEffect(() => {
        ;(async () => {
            for (const filter of filters) {
                if (!filter.hidden && filter.type === 'select' && filter.url) {
                    const response = await ApiService.fetchData<OptionType[]>({
                        method: 'get',
                        url: filter.url,
                    })
                    setOptions((prevOptions) => ({
                        ...prevOptions,
                        [filter.value]: response.data,
                    }))
                } else if (filter.type === 'select' && filter.options?.[0]) {
                    setOptions((prevOptions) => ({
                        ...prevOptions,
                        [filter.value]: filter.options || [],
                    }))
                }
            }
        })()
    }, [filters])

    const onSearchWrapper = () => {
        onSearch(values)
        setIsOpen(false)
    }

    const onClose = () => {
        setIsOpen(false)
        _setValues(defaultValues)
    }

    const getFilter = (filter: FilterType) => {
        if (filter.hidden) return null
        if (filter.type === 'select') {
            return (
                <div key={filter.value}>
                    <label className='inline-block mb-1 font-bold'>{filter.label}</label>
                    <Select
                        isClearable
                        size='sm'
                        menuPosition='fixed'
                        isMulti={filter.isMulti}
                        closeMenuOnSelect={!filter.isMulti}
                        options={options?.[filter.value]}
                        styles={{
                            control: (base) => (filter.isMulti ? { ...base, height: 'auto' } : base),
                            menuPortal: (base) => ({ ...base, zIndex: 50 }),
                        }}
                        value={
                            filter.isMulti
                                ? options?.[filter.value]?.filter((option) => values?.[filter.value]?.includes(option.value))
                                : options?.[filter.value]?.filter((option) => option.value === values?.[filter.value])
                        }
                        onChange={(option) => {
                            if (filter.isMulti) setValues(filter.value, (option as MultiValue<OptionType>)?.map((i) => i.value))
                            else setValues(filter.value, (option as OptionType)?.value)
                        }}
                    />
                </div>
            )
        }
        if (filter.type === 'debounced-select') {
            return (
                <div key={filter.value}>
                    <label className='inline-block mb-1 font-bold'>{filter.label}</label>
                    <DebouncedSelect
                        isClearable
                        size='sm'
                        menuPosition='fixed'
                        url={filter.url || ''}
                        value={values?.[filter.value]}
                        onChange={(option) => setValues(filter.value, option?.value)}
                    />
                </div>
            )
        }
        if (filter.type === 'date-range') {
            return (
                <div key={filter.value}>
                    <label className='inline-block mb-1 font-bold'>{filter.label}</label>
                    <InputGroup className='w-full'>
                        <DatePicker
                            clearable
                            size='sm'
                            placeholder='From'
                            inputFormat='DD/MM/YYYY'
                            value={values?.[filter.value]?.[0]}
                            onChange={(date) => setValues(filter.value, [date, values?.[filter.value]?.[1]])}
                        />
                        <DatePicker
                            clearable
                            size='sm'
                            placeholder='To'
                            inputFormat='DD/MM/YYYY'
                            value={values?.[filter.value]?.[1]}
                            onChange={(date) => setValues(filter.value, [values?.[filter.value]?.[0], date])}
                        />
                    </InputGroup>
                </div>
            )
        }
        if (filter.type === 'text') {
            return (
                <div key={filter.value}>
                    <label className='inline-block mb-1 font-bold'>{filter.label}</label>
                    <Input
                        type='text'
                        size='sm'
                        className='pl-1.5'
                        value={values?.[filter.value]}
                        onChange={({ target }: ChangeEvent<HTMLInputElement>) => setValues(filter.value, target.value)}
                    />
                </div>
            )
        }
        if (filter.type === 'number') {
            return (
                <div key={filter.value}>
                    <label className='inline-block mb-1 font-bold'>{filter.label}</label>
                    <Input
                        type='number'
                        size='sm'
                        className='pl-1.5'
                        value={values?.[filter.value]}
                        onChange={({ target }: ChangeEvent<HTMLInputElement>) => setValues(filter.value, target.value)}
                    />
                </div>
            )
        }
    }

    const filtersCount = Object.values(defaultValues || {}).filter((i) =>
        !i ? false : Array.isArray(i) ? i.length > 0 : typeof i === 'object' ? Object.values(i).filter(Boolean).length > 0 : null,
    ).length

    return (
        <>
            <Button variant='twoTone' size='sm' icon={<FiFilter size={18} />} onClick={() => setIsOpen(true)}>
                Filters{filtersCount ? <span className='font-mono'> ({filtersCount})</span> : null}
            </Button>
            <Drawer
                title='Filters'
                isOpen={isOpen}
                placement={'right'}
                footer={
                    <Button variant='solid' size='sm' className='w-20' onClick={onSearchWrapper}>
                        Search
                    </Button>
                }
                onClose={onClose}
                onRequestClose={onClose}>
                <div className='flex flex-col gap-4 text-xs'>
                    {filters.map((filter, idx) => (
                        <Fragment key={filter.type + idx}>
                            {filter.type === 'input-row' ? (
                                <div className='flex gap-2 items-center flex-1'>{filter.fields.map(getFilter)}</div>
                            ) : (
                                getFilter(filter)
                            )}
                        </Fragment>
                    ))}
                </div>
            </Drawer>
        </>
    )
}

export default CustomDataTable
