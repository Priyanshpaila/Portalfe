import { useMemo, useRef, useState } from 'react'
import type { ColumnDef } from '@/components/shared/DataTable'
import { flushSync } from 'react-dom'

import CustomDataTable from '@/components/app/CustomDataTable'
import { POType as _POType, VendorType } from '@/@types/app'
import { formatDate, formatDateTime } from '@/utils/formatDate'
import { AttachmentsDrawer } from '@/components/app/Attachments'
import { useReactToPrint } from 'react-to-print'
import { Button, Tag } from '@/components/ui'
import PurchaseOrderPrint from '@/components/prints/PurchaseOrder.print'
import ApiService from '@/services/ApiService'
import { Link } from 'react-router-dom'
import { MdOutlineEdit } from 'react-icons/md'
import { useAppSelector } from '@/store'
import { IoPrintOutline } from 'react-icons/io5'
import { showError } from '@/utils/hoc/showAlert'
import { refDocumentTypes } from '@/utils/data'
import { RiFileExcel2Line } from 'react-icons/ri'
import { exportTableToExcel } from '@/utils/exportTableToExcel'
import { freightTypes } from '@/utils/constants'

type POType = _POType & {
    status: number | string
    progressCount: number
    authorizedBy?: string
    authorizedAt?: string
    freightType?: string
    scheduledDate?: string
}

function normalizeVendorPayload(payload: any, vendorCode?: string): VendorType | undefined {
    if (!payload) return undefined
    if (Array.isArray(payload)) {
        if (vendorCode) {
            return payload.find((v) => String(v?.vendorCode) === String(vendorCode))
        }
        return payload[0]
    }
    return payload
}

const POPrintComponent = (props: { po: POType }) => {
    const poPreviewRef = useRef<HTMLDivElement>(null)
    const [vendorData, setVendorData] = useState<VendorType>()
    const [loading, setLoading] = useState(false)

    // ✅ compatible with react-to-print v2/v3
    const reactToPrintFn = useReactToPrint({
        contentRef: poPreviewRef,
        documentTitle: `PO_${props.po?.poNumber || ''}`,
        // removeAfterPrint: true, // optional
    })

    const handlePrint = async () => {
        try {
            // If vendor already loaded for this PO, print immediately
            if (vendorData?.vendorCode && String(vendorData.vendorCode) === String(props.po?.vendorCode)) {
                reactToPrintFn?.()
                return
            }

            setLoading(true)

            // NOTE: your endpoint might return array or object. We handle both.
            const response = await ApiService.fetchData<any>({
                method: 'get',
                url: '/vendor/list',
                params: { vendorCode: props.po.vendorCode },
            })

            const vendor = normalizeVendorPayload(response?.data, props.po.vendorCode)

            if (!vendor) {
                showError('Vendor not found for this PO. Cannot print.')
                return
            }

            // ✅ ensure vendorData is committed before printing
            flushSync(() => {
                setVendorData(vendor)
            })

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

            {/* ✅ Keep it mounted; print media will show it */}
            <div ref={poPreviewRef} className="hidden print:block">
                <PurchaseOrderPrint po={props.po as any} vendor={vendorData as VendorType} />
            </div>
        </>
    )
}

export default function PurchaseOrders() {
    const sheetRef = useRef<HTMLDivElement>(null)
    const user = useAppSelector((state) => state.auth.user)
    const [data, setData] = useState<POType[]>([])

    const columns: ColumnDef<POType>[] = useMemo(() => {
        return [
            {
                header: '#',
                accessorKey: '',
                cell: ({ cell }: { cell: any }) => cell.row.index + 1,
            },
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
                header: 'Status',
                accessorKey: 'status',
                cell: ({ row }: { row: any }) => (
                    <>
                        <Tag color={row.original.status === 'Completed' ? 'green' : row.original.status === 'Authorized' ? 'indigo' : 'amber'}>
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
    }, [user.vendorCode])

    return (
        <div ref={sheetRef}>
            <CustomDataTable<POType>
                title="Purchase Orders"
                columns={columns}
                fetchApi={'/po/list'}
                actions={[
                    {
                        type: 'button',
                        icon: <RiFileExcel2Line />,
                        color: 'green',
                        title: 'Export to Excel',
                        handler: () => exportTableToExcel(sheetRef, { ignoreColIndexes: [0, 1, 5, 6] }),
                    },
                ]}
                filters={[
                    { label: 'PO Number', type: 'text', value: 'poNumber' },
                    { label: 'SAP PO Number', type: 'text', value: 'sapPONumber' },
                    { label: 'PO Date', type: 'date-range', value: 'poDate' },
                    { label: 'Vendor', type: 'debounced-select', value: 'vendorCode', url: '/vendor/values', hidden: Boolean(user.vendorCode) },
                    {
                        label: 'Source Document',
                        type: 'select',
                        value: 'refDocumentType',
                        options: refDocumentTypes,
                    },
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
                data={data}
                setData={(_data: POType[]) =>
                    setData(
                        _data?.map((i) => {
                            const progressCount = i.authorize.filter((_i) => _i.approvalStatus === 1).length
                            const sorted = (i.items || []).slice().sort((a, b) => new Date(a.schedule as string).getTime() - new Date(b.schedule as string).getTime())
                            return {
                                ...i,
                                poDate: formatDate(i.poDate as string),
                                validityDate: formatDate(i.validityDate as string),
                                freightType: freightTypes.find((ft) => ft.value === i?.shippingAccount?.freightType)?.label,
                                scheduledDate: sorted?.[0]?.schedule ? formatDate(sorted[0].schedule as any) : '',
                                authorizedBy: i.status === 0 ? '' : `${i.authorizedBy} (${i.status === 1 ? 'Authorized' : i.status === 2 ? 'Rejected' : ''})`,
                                authorizedAt: i.status === 0 ? '' : formatDateTime(i.authorizedAt as string),
                                progressCount,
                                status: progressCount === i.authorize.length ? 'Authorized' : 'Initial',
                            }
                        }),
                    )
                }
            />
        </div>
    )
}