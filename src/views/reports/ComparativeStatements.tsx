import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MdOutlineEdit } from 'react-icons/md'

import type { ColumnDef } from '@/components/shared/DataTable'
import CustomDataTable from '@/components/app/CustomDataTable'
import { CSType as _CSType } from '@/@types/app'
import { formatDate, formatDateTime } from '@/utils/formatDate'
import { Button, Tag } from '@/components/ui'
import { useAppSelector } from '@/store'
import classNames from 'classnames'

type CSType = Omit<_CSType, 'status'> & { status: number | string }

export default function ComparativeStatements() {
    const user = useAppSelector((state) => state.auth.user)
    const [data, setData] = useState<CSType[]>([])
    const columns: ColumnDef<CSType>[] = useMemo(() => {
        return [
            { header: '#', accessorKey: '', cell: ({ cell }) => cell.row.index + 1 },
            {
                id: 'edit',
                cell: ({ row }) => (
                    <Link to={`/comparative-statement?csNumber=${row.original.csNumber}`}>
                        <Button variant='twoTone' size='xs' icon={<MdOutlineEdit />} color='red' />
                    </Link>
                ),
            },
            { header: 'cs Number', accessorKey: 'csNumber' },
            { header: 'cs Date', accessorKey: 'csDate' },
            { header: 'cs Validity', accessorKey: 'csValidity' },
            { header: 'rfq Number', accessorKey: 'rfqNumber' },
            { header: 'rfq Date', accessorKey: 'rfqDate' },
            {
                header: 'status',
                accessorKey: 'status',
                cell: ({ row }) => (
                    <Tag color={row.original.status === 'Completed' ? 'green' : row.original.status === 'Authorized' ? 'indigo' : 'amber'}>
                        {row.original.status}
                    </Tag>
                ),
            },
            { header: 'authorized By', accessorKey: 'authorizedBy' },
            { header: 'authorized At', accessorKey: 'authorizedAt' },
            { header: 'remarks', accessorKey: 'remarks' },
        ]
    }, [])

    return (
        <CustomDataTable<CSType>
            title={'Comprative Statements'}
            columns={columns}
            fetchApi={'/cs/list'}
            filters={[
                { label: 'CS Number', type: 'text', value: 'csNumber' },
                { label: 'CS Date', type: 'date-range', value: 'csDate' },
                { label: 'RFQ Number', type: 'text', value: 'rfqNumber' },
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
                    options: [
                        { label: 'Initial', value: 'initial' },
                        { label: 'Authorized', value: 'authorized' },
                    ],
                },
            ]}
            data={data}
            setData={(_data: CSType[]) =>
                setData(
                    _data.map((i) => ({
                        ...i,
                        status: i.status === 2 ? 'Completed' : i.status === 1 ? 'Authorized' : 'Initial',
                        csDate: formatDate(i.csDate as string),
                        csValidity: formatDate(i.csValidity as string),
                        rfqDate: formatDate(i.rfqDate as string),
                        authorizedAt: formatDateTime(i.authorizedAt as string),
                    })),
                )
            }
        />
    )
}
