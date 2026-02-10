import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MdOutlineEdit } from 'react-icons/md'
import classNames from 'classnames'

import type { ColumnDef } from '@/components/shared/DataTable'
import CustomDataTable from '@/components/app/CustomDataTable'
import { CSType as _CSType } from '@/@types/app'
import { formatDate, formatDateTime } from '@/utils/formatDate'
import { Button, Tag } from '@/components/ui'
import { useAppSelector } from '@/store'

type CSType = Omit<_CSType, 'status'> & { status: number | string }

function getStatusMeta(status: string) {
  const s = String(status || '').toLowerCase()
  if (s.includes('completed')) return { color: 'green', label: 'Completed' }
  if (s.includes('authorized')) return { color: 'indigo', label: 'Authorized' }
  return { color: 'amber', label: 'Initial' }
}

export default function ComparativeStatements() {
  const user = useAppSelector((state) => state.auth.user)
  const [data, setData] = useState<CSType[]>([])

  const columns: ColumnDef<CSType>[] = useMemo(() => {
    return [
      { header: '#', accessorKey: '', cell: ({ cell }) => cell.row.index + 1 },

      {
        id: 'edit',
        header: '',
        cell: ({ row }) => (
          <Link to={`/comparative-statement?csNumber=${encodeURIComponent(row.original.csNumber)}`}>
            <Button variant="twoTone" size="xs" icon={<MdOutlineEdit />} color="red" />
          </Link>
        ),
      },

      {
        header: 'CS',
        id: 'cs',
        cell: ({ row }) => {
          const meta = getStatusMeta(row.original.status as string)
          return (
            <div className="min-w-[260px]">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-slate-900">{row.original.csNumber}</div>
                <Tag color={meta.color} className="capitalize">
                  {meta.label}
                </Tag>
              </div>

              <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-2">
                <span className="px-2 py-0.5 rounded-full bg-slate-100">CS Date: {row.original.csDate}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100">Validity: {row.original.csValidity}</span>
              </div>
            </div>
          )
        },
      },

      {
        header: 'RFQ',
        id: 'rfq',
        cell: ({ row }) => (
          <div className="min-w-[220px]">
            <div className="font-semibold text-slate-900">{row.original.rfqNumber}</div>
            <div className="text-xs text-slate-600 mt-1">
              RFQ Date: <span className="font-medium text-slate-800">{row.original.rfqDate}</span>
            </div>
          </div>
        ),
      },

      {
        header: 'Authorized',
        id: 'auth',
        cell: ({ row }) => (
          <div className="min-w-[240px]">
            <div className={classNames('text-sm font-medium', row.original.authorizedBy ? 'text-slate-900' : 'text-slate-400')}>
              {row.original.authorizedBy || '—'}
            </div>
            <div className="text-xs text-slate-600 mt-1">{row.original.authorizedAt || '—'}</div>
          </div>
        ),
      },

      {
        header: 'Remarks',
        accessorKey: 'remarks',
        cell: ({ row }) => (
          <div className="min-w-[280px] max-w-[520px]">
            <div className="text-sm text-slate-700 line-clamp-2" title={(row.original.remarks as any) || ''}>
              {(row.original.remarks as any) || '—'}
            </div>
          </div>
        ),
      },
    ]
  }, [])

  return (
    <CustomDataTable<CSType>
      title={'Comparative Statements'}
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
            authorizedAt: i.authorizedAt ? formatDateTime(i.authorizedAt as string) : '',
          })),
        )
      }
    />
  )
}