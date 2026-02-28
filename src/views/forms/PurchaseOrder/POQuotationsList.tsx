import { useEffect, useState, useCallback, useMemo } from 'react'
import { CSType, POType, QuotationType, RFQType, TaxChargeType } from '@/@types/app'
import { ColumnDef, DataTable, Loading } from '@/components/shared'
import { Button, Dialog, Radio, Table } from '@/components/ui'
import TFoot from '@/components/ui/Table/TFoot'
import ApiService from '@/services/ApiService'
import { handleAmountCalculation, handleItemAmount } from '@/utils/amountCalculation'
import { csTypes } from '@/utils/constants'
import { companies, getIndentID } from '@/utils/data'
import { formatDate } from '@/utils/formatDate'
import { showError } from '@/utils/hoc/showAlert'
import { useAppSelector } from '@/store'
import { UserApi } from '@/services/user.api'

const { Tr, Td } = Table

type RowType = {
    company: string
    csDate?: string | Date
    companyCode: string
    division: string
    csNumber: string
    rfqNumber: string
    rfqDate: string
    quotationNumber: string
    quotationDate: string
    vendorName: string
    items: string
}

type ApiDataType = Omit<CSType, 'items'> & {
    quotations: QuotationType[]
    rfq: RFQType
    items: (CSType['items'][0] & { company: string })[]
}

type Props = {
    isOpen: boolean
    onSubmit: (data: POType) => void
    onClose: () => void
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

export default function POQuotationsList({ isOpen, onSubmit, onClose }: Props) {
    const user = useAppSelector((state) => state.auth.user)

    const roleName = useMemo(() => {
        const r: any = (user as any)?.role
        return String(r?.name || r || '').toLowerCase()
    }, [user])

    const isAdminLike = useMemo(() => roleName === 'admin' || roleName === 'superadmin', [roleName])
    const isVendor = useMemo(() => Boolean((user as any)?.vendorCode), [user])

    // ✅ company name (prefer redux user.company.name, fallback to /user/me)
    const [meCompanyName, setMeCompanyName] = useState<string>(() => String((user as any)?.company?.name || '').trim())

    useEffect(() => {
        const fromStore = String((user as any)?.company?.name || '').trim()
        if (fromStore && fromStore !== meCompanyName) setMeCompanyName(fromStore)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])

    useEffect(() => {
        if (!isOpen) return
        if (isAdminLike) return
        if (isVendor) return
        if (meCompanyName) return

        ;(async () => {
            const me = await fetchMeUser()
            const c = String(me?.company?.name || '').trim()
            if (c) setMeCompanyName(c)
        })()
    }, [isOpen, isAdminLike, isVendor, meCompanyName])

    const meCompanyKey = useMemo(() => normCompany(meCompanyName), [meCompanyName])

    const [rawList, setRawList] = useState<RowType[]>([])
    const [selected, setSelected] = useState<RowType | null>(null)
    const [data, setData] = useState<ApiDataType[]>([])
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const buildRowList = (response: ApiDataType[]): RowType[] => {
        const rows: RowType[] = []

        response.forEach(({ items, selection, ...cs }) => {
            const vendors = cs.vendors.filter((v) => selection?.some((s) => s.vendorCode === v.vendorCode))

            const companyWiseItems = items.reduce<Record<string, CSType['items']>>((acc, i) => {
                acc[i.company] = [...(acc[i.company] || []), i]
                return acc
            }, {})

            Object.entries(companyWiseItems).forEach(([companyCode, companyItems]) => {
                vendors.forEach((v) => {
                    let vItems = [] as CSType['items']

                    if (cs.csType === csTypes[0].value) {
                        const vItemIds = selection?.filter((s) => s.vendorCode === v.vendorCode).map((s) => getIndentID(s)) || []
                        vItems = companyItems.filter((i) => vItemIds.includes(getIndentID(i)))
                    } else {
                        vItems = companyItems
                    }

                    if (!vItems.length) return

                    rows.push({
                        csDate: cs.csDate,
                        company: companies.find((c) => c.plantCode?.toString() === companyCode)?.alias || companyCode,
                        companyCode,
                        division: ' ',
                        csNumber: cs.csNumber,
                        rfqNumber: cs.rfqNumber,
                        rfqDate: formatDate(cs.rfqDate?.toString()),
                        quotationNumber: v.quotationNumber,
                        quotationDate: formatDate(v.quotationDate?.toString()),
                        vendorName: v.name,
                        items: vItems
                            .filter((i) => !i.poStatus)
                            .map((i) => i.itemDescription)
                            .join(', '),
                    })
                })
            })
        })

        return rows.sort((a, b) => new Date(a.csDate as string).getTime() - new Date(b.csDate as string).getTime())
    }

    useEffect(() => {
        if (!isOpen) {
            setSelected(null)
            setData([])
            setRawList([])
            return
        }

        const fetchQuotations = async () => {
            try {
                setLoading(true)
                const response = await ApiService.fetchData<ApiDataType[]>({ method: 'GET', url: '/cs/quotations' })
                setData(response.data)
                setRawList(buildRowList(response.data))
            } catch (error) {
                console.error(error)
                showError('Failed to load quotations.')
            } finally {
                setLoading(false)
            }
        }

        fetchQuotations()
    }, [isOpen])

    // ✅ filtered list for UI
    const list = useMemo(() => {
        if (!Array.isArray(rawList)) return []
        if (isAdminLike || isVendor) return rawList
        if (!meCompanyKey) return rawList // avoid empty flash until company loads

        return rawList.filter((r) => normCompany(r.companyCode) === meCompanyKey)
    }, [rawList, isAdminLike, isVendor, meCompanyKey])

    // ✅ if selected row disappears due to filter, reset it
    useEffect(() => {
        if (!selected) return
        const exists = list.some((r) => r.csNumber === selected.csNumber && r.quotationNumber === selected.quotationNumber && r.companyCode === selected.companyCode)
        if (!exists) setSelected(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [list])

    const mergeTaxDetails = (items: ReturnType<typeof handleItemAmount>[]): ReturnType<typeof handleItemAmount>[] => {
        const taxMap: Record<string, TaxChargeType> = {}

        items.forEach((i) => {
            i.taxDetails?.forEach((tax: TaxChargeType) => {
                if (!taxMap[tax.chargeName]) taxMap[tax.chargeName] = tax
            })
        })

        return items.map((i) => {
            const itemTaxMap = (i.taxDetails || []).reduce(
                (acc: Record<string, TaxChargeType>, tax: TaxChargeType) => {
                    acc[tax.chargeName] = tax
                    return acc
                },
                {} as Record<string, TaxChargeType>,
            )

            return {
                ...i,
                taxDetails: Object.values(taxMap).map((tax) =>
                    itemTaxMap[tax.chargeName] ? { ...itemTaxMap[tax.chargeName], status: 1 } : { ...tax, status: 0, chargeAmount: 0 },
                ),
            }
        })
    }

    const mapToPOItem = useCallback(async () => {
        if (!selected) return

        setSubmitting(true)
        try {
            const { csNumber, quotationNumber, division, companyCode } = selected
            const rowData = data.find((i) => i.csNumber === csNumber)
            if (!rowData) return showError('CS not found.')

            const { quotations, rfq, vendors, selection } = rowData
            const q = quotations.find((i) => i.quotationNumber === quotationNumber)
            if (!q) return showError(`Quotation ${quotationNumber} not found`)

            const v = vendors.find((i) => i.vendorCode.toString() === q.vendorCode?.toString())
            if (!v) return showError(`Vendor ${q.vendorCode} not found`)

            const isItemWise = rowData.csType === csTypes[0].value
            const items = rowData.items.filter(
                (i) =>
                    i.company === companyCode &&
                    i.poStatus !== 1 &&
                    (isItemWise
                        ? selection?.some((s) => s.quotationNumber === quotationNumber && s.indentNumber === i.indentNumber && s.itemCode === i.itemCode)
                        : true),
            )

            const poItems = items
                .map((i) => {
                    const itemVendor = i.vendors.find((_v) => _v.vendorCode === v.vendorCode)
                    const qItem = q.items.find((_i) => _i.itemCode === i.itemCode && _i.indentNumber === i.indentNumber)
                    const rfqItem = rfq.items?.find((_i) => _i.itemCode === i.itemCode)
                    if (!qItem || !rfqItem) return null

                    const sel = selection?.find((s) => s.indentNumber === i.indentNumber && s.itemCode === i.itemCode && s.vendorCode === v.vendorCode)
                    const totalPOQty = i.vendors.reduce((total, i) => total + (i.poQty || 0), 0)
                    const qty = (sel?.qty || i.qty) - totalPOQty

                    return handleItemAmount({
                        indentNumber: i.indentNumber,
                        itemCode: i.itemCode,
                        itemDescription: i.itemDescription,
                        qty: qty,
                        unit: i.unit,
                        originalQty: qty,

                        make: itemVendor?.make,
                        rate: itemVendor?.rateAfterDiscount,
                        tax: itemVendor?.amount?.taxable,
                        taxRate: itemVendor?.taxRate,

                        hsnCode: qItem?.hsnCode,
                        techSpec: rfqItem?.techSpec,
                        schedule: new Date(new Date(q.quotationDate as string).setHours((qItem?.delivery || 0) * 24, 0, 0, 0)),
                        taxDetails: qItem?.taxDetails,

                        amount: {
                            ...itemVendor?.amount,
                            discount: 0,
                            basic: itemVendor?.basicAfterDiscount,
                        },
                    })
                })
                .filter(Boolean)

            const result = handleAmountCalculation({
                company: companyCode,
                division,
                vendorName: v.name,
                vendorCode: v.vendorCode,
                vendorLocation: v.vendorLocation,
                refCSNumber: rowData.csNumber,
                refCSDate: rowData.csDate,
                refDocumentNumber: q.quotationNumber,
                contactPersonName: q.contactPersonName,
                termsConditions: q.termsConditions,
                charges: q.charges,
                amount: { ...q.amount, discount: 0 },
                items: mergeTaxDetails(poItems),
            }) as unknown as POType

            onSubmit(result)
        } finally {
            setSubmitting(false)
        }
    }, [selected, data, onSubmit])

    const columns: ColumnDef<RowType>[] = useMemo(() => {
        return [
            { header: '#', accessorKey: '', cell: ({ cell }) => cell.row.index + 1 + '.' },
            {
                id: 'selected',
                cell: ({ cell }) => {
                    const i = cell.row.original
                    return (
                        <Radio
                            name='selected'
                            checked={i.csNumber === selected?.csNumber && i.quotationNumber === selected?.quotationNumber && i.companyCode === selected?.companyCode}
                            onChange={() => setSelected(i)}
                        />
                    )
                },
            },
            { header: 'Company', accessorKey: 'company' },
            { header: 'Division', accessorKey: 'division' },
            { header: 'CS Number', accessorKey: 'csNumber' },
            { header: 'Quotation Number', accessorKey: 'quotationNumber' },
            { header: 'Quotation Date', accessorKey: 'quotationDate' },
            { header: 'RFQ Number', accessorKey: 'rfqNumber' },
            { header: 'RFQ Date', accessorKey: 'rfqDate' },
            { header: 'Vendor Name', accessorKey: 'vendorName' },
            { header: 'Items', accessorKey: 'items' },
        ]
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected])

    return (
        <Dialog isOpen={isOpen} width={window.innerWidth * 0.8} onClose={onClose} onRequestClose={onClose}>
            <h4 className='mb-4'>
                Select Documents
                {!isAdminLike && !isVendor && meCompanyName ? <span className="opacity-70"> • {meCompanyName}</span> : null}
            </h4>

            <Loading loading={loading}>
                <DataTable
                    className={'custom-data-table whitespace-nowrap h-[50vh]'}
                    columns={columns}
                    data={list}
                    footer={
                        <TFoot>
                            <Tr>
                                <Td colSpan={11} className='pb-0'>
                                    <Button loading={submitting} variant='solid' size='xs' onClick={mapToPOItem}>
                                        <span className='inline-block pl-2'>Select</span>
                                    </Button>
                                </Td>
                            </Tr>
                        </TFoot>
                    }
                />
            </Loading>
        </Dialog>
    )
}