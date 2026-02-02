import { CSType, CSVendor } from '@/@types/app'
import { Button, Dialog, Radio } from '@/components/ui'
import ApiService from '@/services/ApiService'
import { formatDate } from '@/utils/formatDate'
import { useEffect, useMemo, useState } from 'react'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef } from '@/components/shared/DataTable'

type RowType = {
    csNumber: string
    csDate: string
    rfqNumber: string
    rfqDate: string
    vendors: CSVendor
    items: Omit<CSType['items'][0], 'vendors'> & {
        vendors: CSType['items'][0]['vendors'][0]
    }
}

type TableDataType = Omit<RowType, 'vendors' | 'items'> & {
    _csDate: string
    quotationNumber: string
    quotationDate: string
    make: string
    qty: string
    unit: string
    rate: string
    amount: RowType['items']['vendors']['amount']
}

export default function POCSList({
    isOpen,
    vendorCode,
    indentNumber,
    itemCode,
    onSubmit,
    onClose,
}: {
    isOpen: boolean
    vendorCode: string
    indentNumber: string
    itemCode: string
    onSubmit: (data: TableDataType) => void
    onClose: () => void
}) {
    const [selected, setSelected] = useState<TableDataType>()
    const [data, setData] = useState<TableDataType[]>([])

    useEffect(() => {
        if (!isOpen) return
        ;(async () => {
            try {
                const response = await ApiService.fetchData<RowType[]>({
                    method: 'GET',
                    url: '/cs/list',
                    params: {
                        vendorCode,
                        indentNumber,
                        itemCode,
                    },
                })
                setSelected(undefined)
                setData(
                    response.data?.map((i) => ({
                        ...i,
                        _csDate: formatDate(i.csDate),
                        rfqDate: formatDate(i.rfqDate),
                        quotationDate: formatDate(i.vendors?.quotationDate as string),
                        quotationNumber: i.vendors?.quotationNumber,
                        qty: i.items?.qty?.toFixed(3),
                        unit: i.items?.unit,
                        make: i.items?.vendors?.make,
                        rate: i.items?.vendors?.rateAfterDiscount?.toFixed?.(2),
                        amount: {
                            ...i.items?.vendors?.amount,
                            basic: i.items.vendors.rateAfterDiscount * +i.items?.qty,
                        },
                    })) || [],
                )
            } catch (error) {
                console.error(error)
            }
        })()
    }, [isOpen, vendorCode, indentNumber, itemCode])

    const columns: ColumnDef<TableDataType>[] = useMemo(
        () => [
            {
                header: '#',
                cell: ({ cell }) => cell.row.index + '.',
            },
            {
                id: 'radio',
                header: '',
                cell: ({ row }) => (
                    <Radio
                        name='selected'
                        checked={row.original.csNumber === selected?.csNumber && row.original.quotationNumber === selected?.quotationNumber}
                        onChange={() => setSelected(row.original)}
                    />
                ),
                meta: { sticky: true },
            },
            { header: 'CS No.', accessorKey: 'csNumber' },
            { header: 'CS Date', accessorKey: 'csDate' },
            { header: 'RFQ No.', accessorKey: 'rfqNumber' },
            { header: 'RFQ Date', accessorKey: 'rfqDate' },
            { header: 'Quotation No.', accessorKey: 'quotationNumber' },
            { header: 'Quotation Date', accessorKey: 'quotationDate' },
            { header: 'Qty', accessorKey: 'qty', cell: ({ row }) => <span className='inline-block w-full text-right'>{row.original.qty}</span> },
            { header: 'Unit', accessorKey: 'unit' },
            { header: 'Rate', accessorKey: 'rate', cell: ({ row }) => <span className='inline-block w-full text-right'>{row.original.rate}</span> },
        ],
        [selected],
    )

    return (
        <Dialog isOpen={isOpen} width={window.innerWidth * 0.8} onClose={onClose} onRequestClose={onClose}>
            <h4 className='mb-4'>Select CS Reference</h4>
            <DataTable
                className='relative max-w-auto small-table w-full whitespace-nowrap'
                columns={columns}
                data={data}
                footer={
                    <div className='flex justify-end p-2'>
                        <Button variant='solid' size='xs' onClick={() => onSubmit(selected as TableDataType)}>
                            Submit
                        </Button>
                    </div>
                }
            />
        </Dialog>
    )
}
