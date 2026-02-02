import { useMemo, useState } from 'react'
import type { ColumnDef } from '@/components/shared/DataTable'

import { RFQType } from '@/@types/app'
import { Button } from '@/components/ui'
import { formatDate } from '@/utils/formatDate'
import CustomDataTable from '@/components/app/CustomDataTable'
import { Link, useParams } from 'react-router-dom'

export default function Vendor() {
    const { id } = useParams()
    const [data, setData] = useState<RFQType[]>([])

    const columns: ColumnDef<RFQType>[] = useMemo(() => {
        return [
            { header: '#', accessorKey: '', cell: ({ cell }) => cell.row.index + 1 },
            { header: 'RFQ Number', accessorKey: 'rfqNumber' },
            {
                header: 'RFQ Date',
                accessorKey: 'rfqDate',
                cell: ({ row }) => formatDate(row.original.rfqDate as string),
            },
            {
                header: 'Items',
                cell: ({ row }) =>
                    row.original.items
                        ?.map((i) => i.itemDescription)
                        .filter((i) => i)
                        .join(', '),
            },
            {
                id: 'actions',
                cell: ({ row }) => (
                    <Link to={`/quotation/create?rfqNumber=${row.original.rfqNumber}&vendor=${id}`}>
                        <Button variant='twoTone' size='xs'>
                            Load
                        </Button>
                    </Link>
                ),
            },
        ]
    }, [])

    return (
        <>
            <h2 className='mb-5'>Vendor Latest RFQs</h2>
            <CustomDataTable<RFQType> columns={columns} fetchApi={`/rfq/vendor/list/${id}`} data={data} setData={setData} />
        </>
    )
}
