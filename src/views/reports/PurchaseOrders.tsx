import { useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDef } from '@/components/shared/DataTable'
import { flushSync } from 'react-dom'

import CustomDataTable from '@/components/app/CustomDataTable'
import { POType as _POType, VendorType, UserType } from '@/@types/app'
import { formatDate, formatDateTime } from '@/utils/formatDate'
import { AttachmentsDrawer } from '@/components/app/Attachments'
import { useReactToPrint } from 'react-to-print'
import { Button, Tag, Input } from '@/components/ui'
import PurchaseOrderPrint from '@/components/prints/PurchaseOrder.print'
import ApiService from '@/services/ApiService'
import { Link } from 'react-router-dom'
import { MdOutlineEdit } from 'react-icons/md'
import { useAppSelector } from '@/store'
import { IoPrintOutline } from 'react-icons/io5'
import { showAlert, showError, showWarning } from '@/utils/hoc/showAlert'
import { refDocumentTypes } from '@/utils/data'
import { RiFileExcel2Line } from 'react-icons/ri'
import { exportTableToExcel } from '@/utils/exportTableToExcel'
import { freightTypes, priorities } from '@/utils/constants'

import { ConfirmDialog } from '@/components/shared'
import { BiSolidCheckSquare, BiSolidXSquare } from 'react-icons/bi'
import { UserApi } from '@/services/user.api'

type POType = _POType & {
  status: number | string
  progressCount: number
  authorizedBy?: string
  authorizedAt?: string
  freightType?: string
  scheduledDate?: string
  priority?: string
}

type MeCompany = {
  name?: string
  industry?: string
  gstin?: string
  pan?: string
  phone?: string
  website?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  pincode?: string
}

type MeUser = {
  _id?: string
  name?: string
  username?: string
  email?: string
  company?: MeCompany
  firmId?: any
  vendorCode?: any
  role?: any
}

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

function resolvePoCompanyName(po: any): string {
  const raw =
    po?.company ??
    po?.companyName ??
    po?.companyCode ??
    po?.shippingAccount?.company ??
    ''
  return String(raw || '').trim()
}

function normalizeVendorPayload(payload: any, vendorCode?: string): VendorType | undefined {
  if (!payload) return undefined
  if (Array.isArray(payload)) {
    if (vendorCode) return payload.find((v) => String(v?.vendorCode) === String(vendorCode))
    return payload[0]
  }
  return payload
}

/** ✅ SAME matching logic as Authorize.tsx */
function isRowForLoggedInUser(row: any, users: UserType[], loggedInUser: any) {
  const rowUserId =
    typeof row?.user === 'object' && row?.user !== null ? row.user?._id : row?.user

  return users.some(
    (u) => String(u?._id) === String(rowUserId) && String(u?.username) === String(loggedInUser?.username),
  )
}

function getMyAssignedAuthIndex(po: any, users: UserType[], loggedInUser: any) {
  const auth = po?.authorize || []
  return auth.findIndex((row: any) => isRowForLoggedInUser(row, users, loggedInUser))
}

function getPriorityChipMeta(priorityLabel?: string) {
  const key = String(priorityLabel || '').toLowerCase().trim()
  if (key.includes('urgent')) return { color: 'red', label: priorityLabel || 'Urgent' }
  if (key.includes('high')) return { color: 'amber', label: priorityLabel || 'High' }
  if (key.includes('medium')) return { color: 'indigo', label: priorityLabel || 'Medium' }
  if (key.includes('low')) return { color: 'green', label: priorityLabel || 'Low' }
  return { color: 'blue', label: priorityLabel || '—' }
}

const POPrintComponent = (props: { po: POType }) => {
  const poPreviewRef = useRef<HTMLDivElement>(null)
  const [vendorData, setVendorData] = useState<VendorType>()
  const [loading, setLoading] = useState(false)

  const reactToPrintFn = useReactToPrint({
    contentRef: poPreviewRef,
    documentTitle: `PO_${props.po?.poNumber || ''}`,
  })

  const handlePrint = async () => {
    try {
      if (vendorData?.vendorCode && String(vendorData.vendorCode) === String(props.po?.vendorCode)) {
        reactToPrintFn?.()
        return
      }

      setLoading(true)

      const response = await ApiService.fetchData<any>({
        method: 'get',
        url: '/vendor/list',
        params: { vendorCode: props.po.vendorCode },
      })

      const vendor = normalizeVendorPayload(response?.data, props.po.vendorCode)
      if (!vendor) return showError('Vendor not found for this PO. Cannot print.')

      flushSync(() => setVendorData(vendor))
      reactToPrintFn?.()
    } catch (error) {
      console.error(error)
      showError('Failed to fetch vendor data to print. Please contact support.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="twoTone" size="xs" loading={loading} icon={<IoPrintOutline />} onClick={handlePrint}>
        Print
      </Button>

      <div ref={poPreviewRef} className="hidden print:block">
        <PurchaseOrderPrint po={props.po as any} vendor={vendorData as VendorType} />
      </div>
    </>
  )
}

export default function PurchaseOrders() {
  const sheetRef = useRef<HTMLDivElement>(null)
  const user = useAppSelector((state) => state.auth.user)

  // ✅ store raw list; we will filter for table view
  const [rawData, setRawData] = useState<POType[]>([])

  // ✅ logged-in firm/company from /user/me
  const [meUser, setMeUser] = useState<MeUser | null>(null)

  useEffect(() => {
    ;(async () => {
      const u = await fetchMeUser()
      setMeUser(u)
    })()
  }, [])

  // ✅ privilege detection (admin/superadmin)
  const roleName = useMemo(() => {
    const r = (user as any)?.role
    const name = typeof r === 'string' ? r : (r?.name || (user as any)?.roleName || '')
    return String(name || '').toLowerCase().trim()
  }, [user])

  const isPrivileged = useMemo(() => roleName === 'admin' || roleName === 'superadmin', [roleName])

  const meCompanyName = useMemo(() => String(meUser?.company?.name || '').trim(), [meUser])
  const meCompanyKey = useMemo(() => normCompany(meCompanyName), [meCompanyName])

  /** ✅ load same users list as Authorize.tsx */
  const [users, setUsers] = useState<UserType[]>([])
  const [usersLoading, setUsersLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        setUsersLoading(true)
        const res = await ApiService.fetchData<UserType[]>({ method: 'get', url: '/user/po-vendors' })
        setUsers(res.data || [])
      } catch (e) {
        console.error(e)
        setUsers([])
      } finally {
        setUsersLoading(false)
      }
    })()
  }, [])

  const [approvalDialog, setApprovalDialog] = useState<null | {
    poId: string
    poNumber: string
    idx: number
    status: 1 | 2
    statusLabel: 'Approve' | 'Reject'
    comment: string
  }>(null)

  const [actionFlags, setActionFlags] = useState<{ [poId: string]: { approving?: boolean; rejecting?: boolean } }>({})

  const runAuthorize = async (po: POType, idx: number, approvalStatus: 1 | 2, comment: string) => {
    try {
      setActionFlags((p) => ({
        ...p,
        [po._id as string]: { approving: approvalStatus === 1, rejecting: approvalStatus === 2 },
      }))

      const payload = {
        id: po._id,
        comment: comment || '',
        changedOn: new Date(),
        approvalStatus,
      }

      const response = await ApiService.fetchData<{ errorMessage?: string; authorize: any }>({
        method: 'patch',
        url: '/po/authorize',
        data: payload,
      })

      // ✅ update raw list
      setRawData((prev) =>
        prev.map((r) => {
          if (String(r._id) !== String(po._id)) return r

          const nextAuth = (r.authorize || []).map((a: any, i: number) =>
            i === idx ? { ...a, ...response.data.authorize } : a,
          )

          const progressCount = nextAuth.filter((x: any) => x.approvalStatus === 1).length
          const status = nextAuth.some((x: any) => x.approvalStatus === 2)
            ? 'Rejected'
            : progressCount === nextAuth.length
              ? 'Authorized'
              : 'Initial'

          return { ...r, authorize: nextAuth, progressCount, status }
        }),
      )

      if (response?.data?.errorMessage) showWarning(response.data.errorMessage)
      else showAlert((approvalStatus === 1 ? 'Approved' : 'Rejected') + ' purchase order successfully.')
    } catch (error: any) {
      const message = 'Failed to update approval status. Please contact support.'
      showError(error?.response?.data?.message || message)
    } finally {
      setActionFlags((p) => ({ ...p, [po._id as string]: {} }))
    }
  }

  // ✅ filter view by logged-in company ONLY for non-privileged users
  const tableData = useMemo(() => {
    if (!Array.isArray(rawData)) return []
    if (isPrivileged) return rawData
    if (!meCompanyKey) return rawData

    return rawData.filter((po) => {
      const poCompany = resolvePoCompanyName(po)
      return normCompany(poCompany) === meCompanyKey
    })
  }, [rawData, meCompanyKey, isPrivileged])

  const columns: ColumnDef<POType>[] = useMemo(() => {
    return [
      { header: '#', accessorKey: '', cell: ({ cell }: { cell: any }) => cell.row.index + 1 },

      ...(!user.vendorCode
        ? [
            {
              id: 'edit',
              cell: ({ row }: { row: any }) => (
                <Link to={`/purchase-order?poNumber=${encodeURIComponent(row?.original?.poNumber)}`}>
                  <Button variant="twoTone" size="xs" icon={<MdOutlineEdit />} color="red" />
                </Link>
              ),
            },
          ]
        : []),

      ...(!user.vendorCode
        ? [
            {
              header: 'Approval',
              id: 'approval',
              cell: ({ row }: { row: any }) => {
                const po: POType = row.original

                if (usersLoading) return <span className="opacity-60">…</span>
                if (!po?.authorize?.length) return <span className="opacity-60">—</span>

                const myIdx = getMyAssignedAuthIndex(po, users, user)
                if (myIdx < 0) return <span className="opacity-60">—</span>

                const prevOk = myIdx === 0 ? true : Boolean(po.authorize?.[myIdx - 1]?.approvalStatus)

                const isActionDisabled =
                  !prevOk || Boolean(po.authorize?.[myIdx]?.approvalStatus) || !Boolean(po?.readyForAuthorization)

                const levelLabel = `L${myIdx + 1}`

                return (
                  <div className="flex items-center gap-1">
                    <Tag className="mr-1" color="blue">
                      {levelLabel}
                    </Tag>

                    <Button
                      disabled={Boolean(isActionDisabled)}
                      variant="plain"
                      size="xs"
                      className="p-0 w-[29.33px] h-[29.33px]"
                      icon={<BiSolidCheckSquare className="text-green-500 size-7" />}
                      loading={actionFlags[po._id as string]?.approving}
                      onClick={() =>
                        setApprovalDialog({
                          poId: po._id as string,
                          poNumber: po.poNumber as string,
                          idx: myIdx,
                          status: 1,
                          statusLabel: 'Approve',
                          comment: '',
                        })
                      }
                    />

                    <Button
                      disabled={Boolean(isActionDisabled)}
                      variant="plain"
                      size="xs"
                      className="p-0 w-[29.33px] h-[29.33px]"
                      icon={<BiSolidXSquare className="text-red-600 size-7" />}
                      loading={actionFlags[po._id as string]?.rejecting}
                      onClick={() =>
                        setApprovalDialog({
                          poId: po._id as string,
                          poNumber: po.poNumber as string,
                          idx: myIdx,
                          status: 2,
                          statusLabel: 'Reject',
                          comment: '',
                        })
                      }
                    />
                  </div>
                )
              },
            },
          ]
        : []),

      { header: 'PO Number', accessorKey: 'poNumber' },
      { header: 'SAP PO Number', accessorKey: 'sapPONumber' },
      { header: 'Amend No', accessorKey: 'amendNumber' },
      { header: 'Preview', cell: ({ row }: { row: any }) => <POPrintComponent po={row.original} /> },
      {
        header: 'Attachments',
        cell: ({ row }: { row: any }) => (
          <AttachmentsDrawer id={row.original._id as string} url={`/po/attachments/${row.original._id}`} title={'PO Attachments'} />
        ),
      },
      { header: 'PO Date', accessorKey: 'poDate' },

      {
        header: 'Priority',
        accessorKey: 'priority',
        cell: ({ row }: { row: any }) => {
          const meta = getPriorityChipMeta(row.original.priority)
          if (!row.original.priority) return <span className="opacity-60">—</span>
          return (
            <Tag color={meta.color} className="capitalize">
              {meta.label}
            </Tag>
          )
        },
      },

      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }: { row: any }) => (
          <>
            <Tag
              color={
                row.original.status === 'Completed'
                  ? 'green'
                  : row.original.status === 'Authorized'
                    ? 'indigo'
                    : row.original.status === 'Rejected'
                      ? 'red'
                      : 'amber'
              }
            >
              {row.original.status}
            </Tag>{' '}
            ({row.original.progressCount}/{row.original.authorize.length})
          </>
        ),
      },
      { header: 'Last Authorized By', accessorKey: 'authorizedBy' },
      { header: 'Last Authorized At', accessorKey: 'authorizedAt' },
      { header: 'Company', accessorKey: 'company' },
      { header: 'Division', accessorKey: 'division' },
      { header: 'Purchase Type', accessorKey: 'purchaseType' },
      { header: 'Ref. Document Type', accessorKey: 'refDocumentType' },
      { header: 'Ref. Document No', accessorKey: 'refDocumentNumber' },
      { header: 'Vendor Name', accessorKey: 'vendorName' },
      { header: 'Vendor Location', accessorKey: 'vendorLocation' },
      { header: 'Freight Type', accessorKey: 'freightType' },
      { header: 'Scheduled Date', accessorKey: 'scheduledDate' },
      { header: 'Contact Person', accessorKey: 'contactPersonName' },
      { header: 'Serial No', accessorKey: 'serialNumber' },
      { header: 'Validity Date', accessorKey: 'validityDate' },
      { header: 'Department Name', accessorKey: 'departmentName' },
      { header: 'Remarks', accessorKey: 'remarks' },
    ]
  }, [user, users, usersLoading, actionFlags])

  const title = useMemo(() => {
    if (isPrivileged) return 'Purchase Orders'
    return `Purchase Orders${meCompanyName ? ` • ${meCompanyName}` : ''}`
  }, [isPrivileged, meCompanyName])

  return (
    <div ref={sheetRef}>
      <CustomDataTable<POType>
        title={title}
        columns={columns}
        fetchApi={'/po/list'}
        actions={[
          {
            type: 'button',
            icon: <RiFileExcel2Line />,
            color: 'green',
            title: 'Export to Excel',
            handler: () => exportTableToExcel(sheetRef, { ignoreColIndexes: [0] }),
          },
        ]}
        filters={[
          { label: 'PO Number', type: 'text', value: 'poNumber' },
          { label: 'SAP PO Number', type: 'text', value: 'sapPONumber' },
          { label: 'PO Date', type: 'date-range', value: 'poDate' },
          { label: 'Vendor', type: 'debounced-select', value: 'vendorCode', url: '/vendor/values', hidden: Boolean(user.vendorCode) },
          { label: 'Source Document', type: 'select', value: 'refDocumentType', options: refDocumentTypes },
          { label: 'Priority', type: 'select', value: 'priority', options: priorities },
          {
            type: 'input-row',
            fields: [
              { label: 'Indent Number', type: 'text', value: 'indentNumber' },
              { label: 'Item Code', type: 'text', value: 'itemCode' },
            ],
          },
          {
            type: 'input-row',
            fields: [
              { label: 'PO Amount - From', type: 'number', value: 'poAmountFrom' },
              { label: 'To Amount', type: 'number', value: 'poAmountTo' },
            ],
          },
          { label: 'Item Description', type: 'text', value: 'itemDescription' },
          {
            label: 'Status',
            type: 'select',
            value: 'status',
            hidden: !!user.vendorCode,
            options: [
              { label: 'Initial', value: 'initial' },
              { label: 'Authorized', value: 'authorized' },
            ],
          },
        ]}
        data={tableData}
        setData={(_data: POType[]) => {
          setRawData(
            (_data || [])?.map((i) => {
              const progressCount = i.authorize.filter((_i: any) => _i.approvalStatus === 1).length
              const sorted = (i.items || [])
                .slice()
                .sort((a: any, b: any) => new Date(a.schedule as string).getTime() - new Date(b.schedule as string).getTime())
              const priorityLabel = priorities.find((p) => p.value === i?.shippingAccount?.priority)?.label || ''

              return {
                ...i,
                poDate: formatDate(i.poDate as string),
                validityDate: formatDate(i.validityDate as string),
                freightType: freightTypes.find((ft) => ft.value === i?.shippingAccount?.freightType)?.label,
                scheduledDate: sorted?.[0]?.schedule ? formatDate(sorted[0].schedule as any) : '',
                priority: priorityLabel,
                authorizedBy:
                  i.status === 0
                    ? ''
                    : `${(i as any).authorizedBy} (${i.status === 1 ? 'Authorized' : i.status === 2 ? 'Rejected' : ''})`,
                authorizedAt: i.status === 0 ? '' : formatDateTime((i as any).authorizedAt as string),
                progressCount,
                status: i.status === 2 ? 'Rejected' : progressCount === i.authorize.length ? 'Authorized' : 'Initial',
              }
            }),
          )
        }}
      />

      <ConfirmDialog
        isOpen={approvalDialog !== null}
        closable={false}
        type="danger"
        title={`${approvalDialog?.statusLabel} PO (${approvalDialog?.poNumber})`}
        confirmText={`${approvalDialog?.statusLabel}`}
        cancelText="Cancel"
        confirmButtonColor={approvalDialog?.status === 1 ? 'green' : 'red'}
        onCancel={() => setApprovalDialog(null)}
        onConfirm={() => {
          if (!approvalDialog) return
          const po = tableData.find((p) => String(p._id) === String(approvalDialog.poId))
          if (!po) return showError('PO not found in table state.')

          if (approvalDialog.status === 2 && !approvalDialog.comment?.trim()?.length) {
            return showError('Comments must be provided for PO rejection')
          }

          const { idx, status, comment } = approvalDialog
          setApprovalDialog(null)
          runAuthorize(po, idx, status, comment)
        }}
      >
        <div className="space-y-2">
          <p>Are you sure you want to {approvalDialog?.statusLabel?.toLowerCase()} this PO? This action is irreversible.</p>

          <div>
            <p className="text-xs font-semibold mb-1">Comment {approvalDialog?.status === 2 ? '(required for reject)' : '(optional)'}</p>
            <Input
              textArea
              placeholder="Enter comment"
              value={approvalDialog?.comment || ''}
              onChange={(e: any) => setApprovalDialog((p) => (p ? { ...p, comment: e.target.value } : p))}
            />
          </div>
        </div>
      </ConfirmDialog>
    </div>
  )
}