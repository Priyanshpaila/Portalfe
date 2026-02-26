import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MdOutlineEdit } from 'react-icons/md'
import classNames from 'classnames'

import type { ColumnDef } from '@/components/shared/DataTable'
import CustomDataTable from '@/components/app/CustomDataTable'
import { CSType as _CSType } from '@/@types/app'
import { formatDate, formatDateTime } from '@/utils/formatDate'
import { Button, Tag } from '@/components/ui'
import { useAppSelector } from '@/store'
import { UserApi } from '@/services/user.api'

type CSType = Omit<_CSType, 'status'> & {
  status: number | string
  company?: string // ✅ NEW (from backend)
}

type MeCompany = { name?: string }
type MeUser = { company?: MeCompany }

function unwrapResponse<T = any>(res: any): T {
  return (res?.data ?? res) as T
}

async function fetchMeUser(): Promise<MeUser | null> {
  try {
    const res = await UserApi.getMe()
    const raw = unwrapResponse<any>(res)
    if (raw && typeof raw === 'object') return raw as MeUser
    return null
  } catch {
    return null
  }
}

function normCompany(s: any) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function getStatusMeta(status: string) {
  const s = String(status || '').toLowerCase()
  if (s.includes('completed')) return { color: 'green', label: 'Completed' }
  if (s.includes('authorized')) return { color: 'indigo', label: 'Authorized' }
  return { color: 'amber', label: 'Initial' }
}

export default function ComparativeStatements() {
  const user = useAppSelector((state) => state.auth.user)

  // ✅ raw list from API; we will filter view by company
  const [rawData, setRawData] = useState<CSType[]>([])

  // ✅ resolve role
  const roleName = useMemo(() => {
    const r: any = (user as any)?.role
    return String(r?.name || r || '').toLowerCase()
  }, [user])

  // ✅ treat both admin + superadmin as "can see all"
  const isAdminLike = useMemo(() => {
    return roleName === 'admin' || roleName === 'superadmin'
  }, [roleName])

  // ✅ vendors don't have a firm company context for filtering
  const isVendor = useMemo(() => Boolean((user as any)?.vendorCode), [user])

  // ✅ company name (prefer redux user.company.name, fallback to /user/me)
  const [meCompanyName, setMeCompanyName] = useState<string>(() => {
    return String((user as any)?.company?.name || '').trim()
  })

  // keep in sync if redux user changes
  useEffect(() => {
    const fromStore = String((user as any)?.company?.name || '').trim()
    if (fromStore && fromStore !== meCompanyName) setMeCompanyName(fromStore)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // fallback fetch if needed (only for non-admin firm users)
  useEffect(() => {
    if (isAdminLike) return
    if (isVendor) return
    if (meCompanyName) return

    ;(async () => {
      const me = await fetchMeUser()
      const c = String(me?.company?.name || '').trim()
      if (c) setMeCompanyName(c)
    })()
  }, [isAdminLike, isVendor, meCompanyName])

  const meCompanyKey = useMemo(() => normCompany(meCompanyName), [meCompanyName])

  // ✅ filtered view
  const tableData = useMemo(() => {
    if (!Array.isArray(rawData)) return []

    // superadmin/admin => see all
    if (isAdminLike) return rawData

    // vendor => don't apply company filter here
    if (isVendor) return rawData

    // if company not ready yet => show all (prevents empty flash)
    if (!meCompanyKey) return rawData

    return rawData.filter((cs) => normCompany((cs as any)?.company) === meCompanyKey)
  }, [rawData, isAdminLike, isVendor, meCompanyKey])

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
      title={`Comparative Statements${!isAdminLike && meCompanyName ? ` • ${meCompanyName}` : ''}`}
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

        // ✅ OPTIONAL: only show company filter for admin-like users (so they can filter across firms)
        ...(isAdminLike ? [{ label: 'Company', type: 'text', value: 'company' } as any] : []),
      ]}
      data={tableData}
      setData={(_data: CSType[]) =>
        setRawData(
          (_data || []).map((i) => ({
            ...i,
            // ✅ keep company (for filtering)
            company: (i as any)?.company || '',

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