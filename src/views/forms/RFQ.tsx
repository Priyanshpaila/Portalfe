import React, { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { Field, Form, Formik, FormikHelpers } from 'formik'
import { useNavigate } from 'react-router-dom'
import { IoIosAdd } from 'react-icons/io'
import { v4 as uuidv4 } from 'uuid'

import { Button, DatePicker, Dialog, FormContainer, FormItem, Input, Select, Spinner, Table, Tabs } from '@/components/ui'
import TabContent from '@/components/ui/Tabs/TabContent'
import TabList from '@/components/ui/Tabs/TabList'
import TabNav from '@/components/ui/Tabs/TabNav'
import DateTimepicker from '@/components/ui/DatePicker/DateTimepicker'
import { IndentType, RFQType, VendorType } from '@/@types/app'
import Indents from '@/components/app/Indents'
import VendorModal from '@/components/app/VendorModal'
import ApiService from '@/services/ApiService'
import { termsConditionsOptions } from '@/utils/data'
import { RFQItemsTable } from '@/components/app/RFQItems'
import { AttachmentsTable } from '@/components/app/Attachments'
import { MdClose, MdOutlineDownloadDone, MdOutlineSave } from 'react-icons/md'
import { showAlert, showError, showWarning } from '@/utils/hoc/showAlert'
import classNames from 'classnames'
import useQuery from '@/utils/hooks/useQuery'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Loading } from '@/components/shared'

const { Tr, Th, Td, THead, TBody } = Table

// ✅ IMPORTANT: Formik values (we force Date | null here)
type RFQFormValues = Omit<RFQType, 'dueDate' | 'rfqDate'> & {
    dueDate: Date | null
    rfqDate: Date | null
}

type IndentMetaValues = {
    company: string
    indentNumber: string
    indentDate: Date | null
    lineNumber: string
    costCenter: string
    requestedBy: string
    indentType: string
    itemDescription?: string
    techSpec?: string
    make?: string
    documentNumber?: string
    materialNumber?: string
    storageLocation?: string
    trackingNumber?: string
    indentQty: string
    preRFQQty: string
    prePOQty: string
}

type IndentTypeMasterRow = {
    _id?: string
    id?: string
    code?: string
    label?: string
    sortOrder?: number
    isActive?: boolean
}

// ✅ fallback (in case API fails)
const DEFAULT_INDENT_TYPE_OPTIONS = [
    { label: 'Standard', value: 'STANDARD' },
    { label: 'Service', value: 'SERVICE' },
    { label: 'Maintenance', value: 'MAINTENANCE' },
    { label: 'Capital', value: 'CAPITAL' },
]

const INDENT_TYPE_LIST_URL = '/indent-type/list'

function normalizeIndentTypeCode(code: any) {
    return String(code || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_')
        .replace(/[^A-Z0-9_]/g, '')
}

function codeToLabel(code: string) {
    const s = String(code || '')
        .trim()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .toLowerCase()

    if (!s) return ''
    return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

function buildIndentTypeOptions(rows: IndentTypeMasterRow[]) {
    const clean = (rows || [])
        .filter((r) => (r?.isActive ?? true) !== false)
        .map((r) => {
            const code = normalizeIndentTypeCode(r?.code)
            const label = String(r?.label || '').trim() || codeToLabel(code)
            if (!code) return null
            return {
                label,
                value: code,
                sortOrder: typeof r?.sortOrder === 'number' ? r.sortOrder : 9999,
            }
        })
        .filter(Boolean) as Array<{ label: string; value: string; sortOrder: number }>

    clean.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
    return clean.map(({ label, value }) => ({ label, value }))
}

const initialValues: RFQType = {
    rfqNumber: '',
    rfqDate: new Date(),
    dueDate: new Date(new Date().setHours(7 * 24, 0, 0, 0) - 1),
    remarks: '',
    contactPersonName: '',
    contactNumber: '',
    contactEmail: '',
    termsConditions: {},
    file: [],
    attachments: [],
    vendors: [],
    tempTnC: { key: '', value: '' },
    status: 0,
}

const tabs = ['General Information', 'Indents', 'Terms & Conditions', 'Vendor Details', 'Attachments']

let fileIndex: number

function pad5(n: number) {
    return String(n).padStart(5, '0')
}

function digitsOnly5(s: string) {
    return String(s ?? '')
        .replace(/\D/g, '')
        .slice(0, 5)
}

function safeJsonParse<T = any>(s: any): T | null {
    try {
        if (typeof s !== 'string') return null
        return JSON.parse(s) as T
    } catch {
        return null
    }
}

function pickName(u: any): string {
    return u?.name || u?.username || u?.fullName || u?.email || ''
}

function getLoggedInUserLabel() {
    try {
        const candidates = ['admin', 'user', 'userDetails', 'auth_user']
        for (const key of candidates) {
            const raw = localStorage.getItem(key)
            if (!raw) continue
            const outer = safeJsonParse<any>(raw)
            if (!outer) continue

            const direct = pickName(outer)
            if (direct) return direct

            if (typeof outer?.auth === 'string') {
                const authObj = safeJsonParse<any>(outer.auth)
                const fromAuthUser = pickName(authObj?.user)
                if (fromAuthUser) return fromAuthUser
            }

            const fromOuterUser = pickName(outer?.user)
            if (fromOuterUser) return fromOuterUser
        }
        return ''
    } catch {
        return ''
    }
}

function computeNextLineNumber(items: any[]) {
    const nums = (items || [])
        .map((i) => String(i?.lineNumber ?? '').replace(/\D/g, ''))
        .filter(Boolean)
        .map((x) => parseInt(x, 10))
        .filter((n) => Number.isFinite(n))

    const next = (nums.length ? Math.max(...nums) : 0) + 1
    return pad5(next)
}

/** ---------- select all helpers ---------- */

function isNonEmpty(v: any) {
    return String(v ?? '').trim().length > 0
}

function toNum0(x: any) {
    const n = Number(String(x ?? '').trim())
    return Number.isFinite(n) ? Math.max(0, n) : 0
}

function indentId(i: any) {
    return String(i?.id || i?._id || '')
}

function indentIndentType(i: any) {
    return String(i?.documentType ?? i?.documentCategory ?? i?.indentType ?? '').trim()
}

function isIndentComplete(i: any) {
    const company = i?.company
    const indentNumber = i?.indentNumber
    const docDate = i?.documentDate || i?.indentDate
    const lineNumber = digitsOnly5(String(i?.lineNumber ?? ''))
    const costCenter = i?.costCenter
    const requestedBy = i?.requestedBy
    const indentType = indentIndentType(i)

    if (!indentId(i)) return false
    if (!isNonEmpty(company)) return false
    if (!isNonEmpty(indentNumber)) return false
    if (!docDate) return false
    if (!lineNumber || lineNumber.length !== 5) return false
    if (!isNonEmpty(costCenter)) return false
    if (!isNonEmpty(requestedBy)) return false
    if (!isNonEmpty(indentType)) return false

    const iq = toNum0(i?.indentQty)
    const rq = toNum0(i?.preRFQQty)
    const pq = toNum0(i?.prePOQty)
    if (rq + pq > iq) return false

    return true
}

function buildMetaFromIndent(i: any, fallbackRequestedBy: string): Partial<IndentMetaValues> {
    const ln = digitsOnly5(String(i?.lineNumber ?? ''))
    return {
        company: String(i?.company ?? '').trim(),
        indentNumber: String(i?.indentNumber ?? '').trim(),
        indentDate: i?.documentDate ? new Date(i.documentDate) : new Date(),
        lineNumber: ln ? pad5(parseInt(ln, 10) || 0) : '00001',
        costCenter: String(i?.costCenter ?? '').trim(),
        requestedBy: String(i?.requestedBy ?? '').trim() || fallbackRequestedBy,
        indentType: indentIndentType(i),

        indentQty: String(i?.indentQty ?? '0'),
        preRFQQty: String(i?.preRFQQty ?? '0'),
        prePOQty: String(i?.prePOQty ?? '0'),

        itemDescription: String(i?.itemDescription ?? '').trim(),
        techSpec: String(i?.techSpec ?? '').trim(),
        make: String(i?.make ?? '').trim(),
        documentNumber: String(i?.documentNumber ?? '').trim(),
        materialNumber: String(i?.materialNumber ?? '').trim(),
        storageLocation: String(i?.storageLocation ?? '').trim(),
        trackingNumber: String(i?.trackingNumber ?? '').trim(),
    }
}

function itemKey(x: any) {
    return `${String(x?.indentNumber ?? '').trim()}__${String(x?.itemCode ?? '').trim()}`
}

/** ------------------------------------------------ */

export default function RFQ() {
    const query = useQuery()
    const navigate = useNavigate()

    const loggedInName = useMemo(() => getLoggedInUserLabel(), [])

    const [tab, setTab] = useState(tabs[0])
    const [indents, setIndents] = useState<IndentType[]>([])
    const [indentSelection, setIndentSelection] = useState<{ [id: string]: boolean }>({})
    const [vendors, setVendors] = useState<VendorType[]>([])
    const [formValues, setFormValues] = useState<RFQType>(initialValues)

    const [indentTypeOptions, setIndentTypeOptions] = useState<{ label: string; value: string }[]>(DEFAULT_INDENT_TYPE_OPTIONS)
    const [indentTypeLoading, setIndentTypeLoading] = useState(false)

    const [flags, setFlags] = useState<{
        loading?: boolean
        deleting?: boolean
        vendorModal?: boolean
        deleteDialog?: boolean
    }>({})

    // ✅ modal state when selecting/editing an indent
    const [indentMeta, setIndentMeta] = useState<{
        open: boolean
        loading: boolean
        indent: IndentType | null
        initial: IndentMetaValues | null
        mode: 'select' | 'edit'
    }>({
        open: false,
        loading: false,
        indent: null,
        initial: null,
        mode: 'select',
    })

    const rfqNumber = query.get('rfqNumber')
    const allowEdit = formValues?.status !== 1

    useEffect(() => {
        if (!rfqNumber) {
            ;(async () => {
                setFlags({ loading: true })
                try {
                    const rfqResponse = await ApiService.fetchData<{ rfqNumber: string }>({
                        method: 'get',
                        url: '/rfq/rfqNumber',
                    })
                    setFormValues({ ...initialValues, rfqNumber: rfqResponse?.data?.rfqNumber })
                } catch (error) {
                    console.error(error)
                }
                setFlags({})
            })()

            setTab(tabs[0])
            setIndentSelection({})
            setFormValues(initialValues)
            return
        }

        ;(async () => {
            setFlags({ loading: true })
            try {
                const rfqResponse = await ApiService.fetchData<RFQType>({
                    method: 'get',
                    url: '/rfq',
                    params: { rfqNumber },
                })
                setFormValues(rfqResponse.data)
            } catch (error) {
                console.error(error)
            }
            setFlags({})
        })()
    }, [rfqNumber])

    useEffect(() => {
        ;(async () => {
            try {
                setIndentTypeLoading(true)
                try {
                    const typeResp = await ApiService.fetchData<any>({
                        method: 'get',
                        url: INDENT_TYPE_LIST_URL,
                    })

                    const rows: IndentTypeMasterRow[] = typeResp?.data?.data || typeResp?.data || []
                    const opts = buildIndentTypeOptions(rows)
                    setIndentTypeOptions(opts?.length ? opts : DEFAULT_INDENT_TYPE_OPTIONS)
                } catch (e) {
                    console.error('Failed to fetch indent types:', e)
                    setIndentTypeOptions(DEFAULT_INDENT_TYPE_OPTIONS)
                } finally {
                    setIndentTypeLoading(false)
                }

                const indentResponse = await ApiService.fetchData<{
                    success: boolean
                    data: IndentType[]
                    page?: number
                    pageSize?: number
                    total?: number
                    totalPages?: number
                }>({
                    method: 'get',
                    url: '/indent/items',
                    params: { page: 1, pageSize: 500 },
                })

                const raw = indentResponse?.data?.data || []
                const normalized: IndentType[] = raw.map((d: any) => ({
                    ...d,
                    id: d?.id || d?._id,
                    balanceQty: typeof d?.balanceQty === 'number' ? d.balanceQty : 0,
                    indentQty: typeof d?.indentQty === 'number' ? d.indentQty : 0,
                    unitOfMeasure: d?.unitOfMeasure || d?.unit || '',
                }))

                setIndents(normalized)

                const vendorResponse = await ApiService.fetchData<VendorType[]>({
                    method: 'get',
                    url: '/vendor/list',
                })
                setVendors(vendorResponse.data)
            } catch (error) {
                console.error(error)
                setIndentTypeLoading(false)
            }
        })()
    }, [])

    const invokeFileInput = (index?: number) => {
        if (index !== undefined && index >= 0) fileIndex = index
        document.getElementById('file-input')?.click()
    }

    const addActionHandler = () => {
        if (tab === tabs[3]) setFlags({ vendorModal: true })
        else if (tab === tabs[4]) invokeFileInput()
    }

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>, setValues: FormikHelpers<RFQFormValues>['setValues']) => {
        let _file = e.target.files?.[0]
        if (!_file) return

        const originalFileName = _file.name
        _file = new File([_file], `${uuidv4()}-${Date.now()}.${_file.name.split('.').pop()}`, { type: _file.type })

        const index = fileIndex
        if (index >= 0) {
            setValues((prev) => ({
                ...prev,
                file: prev.file?.slice(0, index).concat(_file).concat(prev.file.slice(index + 1)),
                attachments: prev.attachments
                    ?.slice(0, index)
                    .concat({
                        file: _file.name,
                        description: originalFileName,
                        size: +(_file.size / 1000).toFixed(2),
                    })
                    .concat(prev.attachments?.slice(index + 1)),
            }))
            fileIndex = -1
        } else {
            setValues((prev) => ({
                ...prev,
                file: (prev.file || [])?.concat(_file),
                attachments: (prev.attachments || []).concat({
                    file: _file.name,
                    description: originalFileName,
                    size: +(_file.size / 1000).toFixed(2),
                }),
            }))
        }
    }

    const handleSubmit = (values: RFQFormValues) => handleSave({ ...values, status: 1 })

    const handleSave = async (values: RFQFormValues) => {
        if (!values.items?.length) return showError('Please add at least one item in the RFQ items table.')
        setFlags({ loading: true })

        try {
            const formData = new FormData()
            formData.append('data', JSON.stringify(values))
            if (values?.file && values?.file?.length > 0) for (const i of values.file) formData.append('file', i)

            const response = await ApiService.fetchData<{ errorMessage?: string }, FormData>({
                method: !rfqNumber ? 'POST' : 'PUT',
                url: '/rfq' + (!rfqNumber ? '' : `/${formValues?._id}`),
                headers: { 'Content-Type': 'multipart/form-data' },
                data: formData,
            })

            if (response?.data?.errorMessage) showWarning(response?.data?.errorMessage)
            else showAlert(`RFQ ${values.status === 1 ? 'submitted' : 'saved'} successfully`)

            navigate('/rfqs')
        } catch (error: any) {
            const errorMessage = error?.status !== 500 ? error?.response?.data?.message : null
            showError(errorMessage || `An error occurred while ${values.status === 1 ? 'submitting' : 'saving'} the RFQ`)
            setFlags({})
        }
    }

    const handleDelete = async () => {
        setFlags((prev) => ({ ...prev, deleting: true }))
        try {
            const response = await ApiService.fetchData<{ success: true }>({
                method: 'delete',
                url: '/rfq/' + formValues?._id,
            })
            if (response.data.success) {
                setFlags((prev) => ({ ...prev, deleting: false, deleteDialog: false }))
                showAlert(`RFQ ${rfqNumber} has been deleted successfully.`)
                navigate('/rfqs')
            }
        } catch (error: any) {
            setFlags((prev) => ({ ...prev, deleting: false }))
            if (error?.response?.status === 500) showError('Failed to delete RFQ. Please contact support.')
            else if (error?.response?.data?.message) showError(error?.response?.data?.message)
            console.error(error)
        }
    }

    const indentToItem = (i: any, meta?: Partial<IndentMetaValues>) => {
        const bal = typeof i.balanceQty === 'number' ? +i.balanceQty : 0
        const indentDate = meta?.indentDate || (i.documentDate ? new Date(i.documentDate) : null)

        return {
            indentNumber: meta?.indentNumber || i.indentNumber || '-',
            lineNumber: meta?.lineNumber || i.lineNumber || '-',
            company: meta?.company || i.company || '-',
            costCenter: meta?.costCenter || i.costCenter || '-',
            requestedBy: meta?.requestedBy || i.requestedBy || '-',
            indentType: meta?.indentType || '-',

            itemCode: i.itemCode || '-',
            itemDescription: i.itemDescription || '-',
            techSpec: i.techSpec || '-',
            hsnCode: i.hsnCode || '-',
            rfqMake: i.make || '-',
            rfqRemarks: '-',
            rfqTechSpec: '-',
            balanceQty: bal || '-',
            rfqQty: bal > 0 ? bal : 1,
            unit: i.unitOfMeasure || '-',

            indentDate: indentDate || '-',
            documentDate: indentDate || '-',
        } as any
    }

    return (
        <div>
            <title>Request For Quotation</title>

            <Loading type="cover" loading={flags?.loading}>
                <Formik<RFQFormValues>
                    enableReinitialize={true}
                    initialValues={{
                        ...(formValues as any),
                        dueDate: formValues.dueDate ? new Date(formValues.dueDate as any) : null,
                        rfqDate: formValues.rfqDate ? new Date(formValues.rfqDate as any) : null,
                    }}
                    onSubmit={handleSubmit}
                >
                    {(form) => {
                        const { values, setFieldValue: _setFieldValue, setValues: _setValues } = form

                        const noopSetValues: FormikHelpers<RFQFormValues>['setValues'] = async () => {}
                        const noopSetFieldValue: FormikHelpers<RFQFormValues>['setFieldValue'] = async () => {}

                        const setValues: FormikHelpers<RFQFormValues>['setValues'] = allowEdit ? _setValues : noopSetValues
                        const setFieldValue: FormikHelpers<RFQFormValues>['setFieldValue'] = allowEdit ? _setFieldValue : noopSetFieldValue

                        const openIndentMetaDialog = (indent: IndentType, mode: 'select' | 'edit' = 'select') => {
                            const existingIndentNo = String((indent as any)?.indentNumber ?? '').trim()

                            const nextLineFromMaster = computeNextLineNumber(indents as any[])
                            const existingLine = String((indent as any)?.lineNumber ?? '').trim()
                            const lineToUse = existingLine
                                ? pad5(parseInt(digitsOnly5(existingLine) || '0', 10) || 1)
                                : nextLineFromMaster

                            const initial: IndentMetaValues = {
                                company: String((indent as any)?.company ?? '').trim(),
                                indentNumber: existingIndentNo,
                                indentDate: (indent as any)?.documentDate ? new Date((indent as any).documentDate) : new Date(),
                                lineNumber: lineToUse,
                                costCenter: String((indent as any)?.costCenter ?? '').trim(),
                                requestedBy: String((indent as any)?.requestedBy ?? '').trim() || loggedInName,
                                indentType: String((indent as any)?.documentType ?? '').trim(),

                                itemDescription: String((indent as any)?.itemDescription ?? '').trim(),
                                techSpec: String((indent as any)?.techSpec ?? '').trim(),
                                make: String((indent as any)?.make ?? '').trim(),
                                documentNumber: String((indent as any)?.documentNumber ?? '').trim(),
                                materialNumber: String((indent as any)?.materialNumber ?? '').trim(),
                                storageLocation: String((indent as any)?.storageLocation ?? '').trim(),
                                trackingNumber: String((indent as any)?.trackingNumber ?? '').trim(),

                                indentQty: String((indent as any)?.indentQty ?? '0'),
                                preRFQQty: String((indent as any)?.preRFQQty ?? '0'),
                                prePOQty: String((indent as any)?.prePOQty ?? '0'),
                            }

                            setIndentMeta({
                                open: true,
                                loading: false,
                                indent,
                                initial,
                                mode,
                            })
                        }

                        // ✅ FIXED (includes mode reset)
                        const closeIndentMetaDialog = () => {
                            setIndentMeta({ open: false, loading: false, indent: null, initial: null, mode: 'select' })
                        }

                        const handleEditIndent = (indent: any) => {
                            openIndentMetaDialog(indent as IndentType, 'edit')
                        }

                        const saveIndentMeta = async (meta: IndentMetaValues, helpers: FormikHelpers<IndentMetaValues>) => {
                            const indent = indentMeta.indent
                            if (!indent?.id) return

                            setIndentMeta((p) => ({ ...p, loading: true }))

                            try {
                                const toNum0Local = (x: any) => {
                                    const n = Number(String(x ?? '').trim())
                                    return Number.isFinite(n) ? Math.max(0, n) : 0
                                }

                                const payload: any = {
                                    company: meta.company?.trim(),
                                    indentNumber: meta.indentNumber?.trim(),
                                    documentDate: meta.indentDate ? new Date(meta.indentDate) : new Date(),
                                    lineNumber: meta.lineNumber?.trim(),
                                    costCenter: meta.costCenter?.trim(),
                                    requestedBy: meta.requestedBy?.trim(),
                                    documentType: meta.indentType,
                                    indentQty: toNum0Local(meta.indentQty),
                                    preRFQQty: toNum0Local(meta.preRFQQty),
                                    prePOQty: toNum0Local(meta.prePOQty),
                                }

                                const resp = await ApiService.fetchData<any>({
                                    method: 'put',
                                    url: `/indent/add-item/${indent.id}`,
                                    data: payload,
                                })

                                const updated = resp?.data?.data || resp?.data || {}
                                const updatedId = String(updated.id || updated._id || indent.id)

                                setIndents((prev) =>
                                    prev.map((x: any) =>
                                        String(x.id || x._id) === updatedId ? { ...x, ...updated, id: updated.id || updated._id || x.id } : x,
                                    ),
                                )

                                const isCurrentlySelected = Boolean(indentSelection[String(indent.id)])

                                // ✅ select only in select-mode
                                if (indentMeta.mode === 'select') {
                                    setIndentSelection((prev) => ({ ...prev, [String(indent.id)]: true }))
                                }

                                const shouldTouchItems = indentMeta.mode === 'select' || isCurrentlySelected

                                if (shouldTouchItems) {
                                    setValues((prev) => {
                                        const existing = prev.items || []
                                        const newItem = indentToItem({ ...(indent as any), ...updated }, meta)

                                        const idx = existing.findIndex(
                                            (it: any) =>
                                                String(it?.indentNumber ?? '').trim() === String(newItem?.indentNumber ?? '').trim() &&
                                                String(it?.itemCode ?? '').trim() === String(newItem?.itemCode ?? '').trim(),
                                        )

                                        const nextItems = idx >= 0 ? existing.map((it: any, j: number) => (j === idx ? newItem : it)) : existing.concat([newItem])
                                        return { ...prev, items: nextItems }
                                    })
                                }

                                showAlert(indentMeta.mode === 'edit' ? 'Indent details updated.' : 'Indent details saved.')
                                closeIndentMetaDialog()
                                helpers.resetForm()
                            } catch (err: any) {
                                showError(err?.response?.data?.message || err?.message || 'Failed to save indent details.')
                                setIndentMeta((p) => ({ ...p, loading: false }))
                            }
                        }

                        return (
                            <>
                                <Form className={classNames('px-1', 'mt-3', allowEdit ? null : 'prevent-edit')}>
                                    <input hidden type="file" id="file-input" onChange={(e) => onFileSelect(e, setValues)} />

                                    <FormContainer className="text-xs">
                                        <Tabs variant="underline" value={tab} onChange={setTab}>
                                            <TabList>
                                                {tabs.map((i) => (
                                                    <TabNav key={i} className="pt-0" value={i}>
                                                        <span className="text-xs">{i}</span>
                                                    </TabNav>
                                                ))}

                                                <TabNav disabled className="p-0 opacity-100 cursor-auto flex-1 justify-end gap-1" value="actions">
                                                    {allowEdit && (
                                                        <>
                                                            {tabs[3] === tab && (
                                                                <>
                                                                    <Button
                                                                        disabled={!allowEdit}
                                                                        type="button"
                                                                        variant="twoTone"
                                                                        size="xs"
                                                                        icon={<IoIosAdd />}
                                                                        onClick={addActionHandler}
                                                                    >
                                                                        Add Vendor
                                                                    </Button>
                                                                    <hr className="h-4 w-[1.5px] bg-slate-200" />
                                                                </>
                                                            )}

                                                            <Button
                                                                disabled={!allowEdit}
                                                                type="button"
                                                                variant="solid"
                                                                size="xs"
                                                                icon={<MdOutlineSave />}
                                                                onClick={() => handleSave(values)}
                                                            >
                                                                Save
                                                            </Button>

                                                            <Button disabled={!allowEdit} type="submit" variant="solid" size="xs" icon={<MdOutlineDownloadDone />}>
                                                                Submit
                                                            </Button>
                                                        </>
                                                    )}

                                                    {formValues?._id && (
                                                        <Button type="button" variant="solid" size="xs" color="red" onClick={() => setFlags({ deleteDialog: true })}>
                                                            Delete
                                                        </Button>
                                                    )}
                                                </TabNav>
                                            </TabList>

                                            <TabContent value={tabs[0]}>
                                                <div className="flex w-full gap-2 mt-2">
                                                    <FormItem className="mb-3" labelClass="text-xs" label="RFQ Number">
                                                        <Field
                                                            disabled
                                                            type="text"
                                                            className="px-1"
                                                            name="rfqNumber"
                                                            component={Input}
                                                            size={'xs'}
                                                            value={values.rfqNumber}
                                                            onChange={() => null}
                                                        />
                                                    </FormItem>

                                                    <FormItem className="mb-3" labelClass="text-xs" label="RFQ Date">
                                                        <Field
                                                            disabled
                                                            name="rfqDate"
                                                            component={DatePicker}
                                                            inputFormat="DD/MM/YYYY"
                                                            size={'xs'}
                                                            value={values.rfqDate || null}
                                                            onChange={() => null}
                                                        />
                                                    </FormItem>

                                                    <FormItem asterisk className="mb-3" labelClass="text-xs" label="Due Date">
                                                        <Field
                                                            disabled={!allowEdit}
                                                            name="dueDate"
                                                            component={DateTimepicker}
                                                            inputFormat="DD/MM/YYYY hh:mm a"
                                                            clearable={false}
                                                            size={'xs'}
                                                            value={values.dueDate || null}
                                                            onChange={(newDate: Date) => setFieldValue('dueDate', newDate)}
                                                        />
                                                    </FormItem>

                                                    <FormItem className="mb-3" labelClass="text-xs" label="Contact Person Name">
                                                        <Field
                                                            disabled={!allowEdit}
                                                            type="text"
                                                            className="px-1"
                                                            name="contactPersonName"
                                                            component={Input}
                                                            size={'xs'}
                                                            value={values.contactPersonName}
                                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue(e.target.name, e.target.value)}
                                                        />
                                                    </FormItem>

                                                    <FormItem className="mb-3" labelClass="text-xs" label="Contact Number">
                                                        <Field
                                                            disabled={!allowEdit}
                                                            type="number"
                                                            className="px-1"
                                                            name="contactNumber"
                                                            component={Input}
                                                            size={'xs'}
                                                            value={values.contactNumber}
                                                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                                e.target.value?.length <= 10 ? setFieldValue(e.target.name, e.target.value) : null
                                                            }
                                                        />
                                                    </FormItem>

                                                    <FormItem className="mb-3" labelClass="text-xs" label="Contact Email">
                                                        <Field
                                                            disabled={!allowEdit}
                                                            type="email"
                                                            className="px-1"
                                                            name="contactEmail"
                                                            component={Input}
                                                            size={'xs'}
                                                            value={values.contactEmail}
                                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue(e.target.name, e.target.value)}
                                                        />
                                                    </FormItem>
                                                </div>

                                                <FormItem labelClass="text-xs" label="Remarks">
                                                    <Field
                                                        textArea
                                                        disabled={!allowEdit}
                                                        type="text"
                                                        className="p-1"
                                                        name="remarks"
                                                        component={Input}
                                                        size={'xs'}
                                                        value={values.remarks}
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue(e.target.name, e.target.value)}
                                                    />
                                                </FormItem>
                                            </TabContent>

                                            <TabContent value={tabs[1]}>
                                                <Indents
                                                    className="h-[45vh] overflow-auto"
                                                    indents={indents || []}
                                                    disabled={!allowEdit}
                                                    selection={indentSelection}
                                                    onEditIndent={handleEditIndent}
                                                    handleSelectAll={(selectionFlag) => {
                                                        // ✅ Unselect all
                                                        if (!selectionFlag) {
                                                            setIndentSelection({})
                                                            setValues((prev) => ({ ...prev, items: [] }))
                                                            return
                                                        }

                                                        // ✅ Select all only if ALL are complete
                                                        const incomplete = (indents || []).filter((i: any) => !isIndentComplete(i))
                                                        if (incomplete.length) {
                                                            showWarning(`${incomplete.length} indents are missing required details. Please fill them first (select one-by-one).`)
                                                            return
                                                        }

                                                        // ✅ mark all selected
                                                        const map: Record<string, boolean> = {}
                                                        for (const i of indents || []) {
                                                            const id = indentId(i)
                                                            if (id) map[id] = true
                                                        }
                                                        setIndentSelection(map)

                                                        // ✅ add items for all indents (no duplicates)
                                                        setValues((prev) => {
                                                            const existing = prev.items || []
                                                            const keys = new Set(existing.map(itemKey))
                                                            const nextItems = [...existing]

                                                            for (const i of indents || []) {
                                                                const meta = buildMetaFromIndent(i, loggedInName)
                                                                const it = indentToItem(i, meta)
                                                                const k = itemKey(it)
                                                                if (!keys.has(k)) {
                                                                    keys.add(k)
                                                                    nextItems.push(it)
                                                                }
                                                            }
                                                            return { ...prev, items: nextItems }
                                                        })
                                                    }}
                                                    handleSelection={(val: any, selectionFlag) => {
                                                        const id = indentId(val)

                                                        // ✅ selecting single row
                                                        if (selectionFlag) {
                                                            // if complete -> select directly (no modal)
                                                            if (isIndentComplete(val)) {
                                                                setIndentSelection((prev) => ({ ...prev, [id]: true }))

                                                                setValues((prev) => {
                                                                    const existing = prev.items || []
                                                                    const keys = new Set(existing.map(itemKey))

                                                                    const meta = buildMetaFromIndent(val, loggedInName)
                                                                    const it = indentToItem(val, meta)
                                                                    const k = itemKey(it)

                                                                    if (keys.has(k)) return prev
                                                                    return { ...prev, items: existing.concat([it]) }
                                                                })
                                                                return
                                                            }

                                                            // otherwise -> open modal
                                                            openIndentMetaDialog(val, 'select')
                                                            return
                                                        }

                                                        // ✅ unselect -> remove immediately (no modal)
                                                        setIndentSelection((prev) => ({ ...prev, [id]: false }))

                                                        setValues((prev) => {
                                                            const existing = prev.items || []
                                                            const removeIndentNumber = String(val?.indentNumber ?? '').trim()
                                                            const removeItemCode = String(val?.itemCode ?? '').trim()

                                                            return {
                                                                ...prev,
                                                                items: existing.filter((i: any) => {
                                                                    const inNo = String(i?.indentNumber ?? '').trim()
                                                                    const ic = String(i?.itemCode ?? '').trim()
                                                                    return !(inNo === removeIndentNumber && ic === removeItemCode)
                                                                }),
                                                            }
                                                        })
                                                    }}
                                                />
                                            </TabContent>

                                            <TabContent value={tabs[2]}>
                                                <div className="h-[45vh] overflow-auto">
                                                    <Table compact className="text-xs" containerClassName="h-full">
                                                        <THead className="sticky top-0">
                                                            <Tr>
                                                                <Th className="border-r  border-r-slate-400/80">Type</Th>
                                                                <Th className="w-full ">Terms & Conditions</Th>
                                                            </Tr>
                                                        </THead>
                                                        <TBody>
                                                            {termsConditionsOptions.map(({ value: key }) => (
                                                                <Tr key={key}>
                                                                    <Td className="border-r border-r-slate-400/80 whitespace-nowrap">
                                                                        <div className="flex items-center gap-2">
                                                                            <span>{termsConditionsOptions.find((i) => i.value === key)?.label}</span>
                                                                        </div>
                                                                    </Td>
                                                                    <Td className="py-0">
                                                                        <Input
                                                                            disabled={!allowEdit}
                                                                            size="xs"
                                                                            name={`termsConditions.${key}`}
                                                                            className="border-none !p-0 ring-0 outline-0 m-0"
                                                                            placeholder="Terms & Conditions"
                                                                            value={(values.termsConditions as any)[key]}
                                                                            onChange={(e) => setFieldValue(e.target.name, e.target.value)}
                                                                        />
                                                                    </Td>
                                                                </Tr>
                                                            ))}
                                                        </TBody>
                                                    </Table>
                                                </div>
                                            </TabContent>

                                            <TabContent value={tabs[3]}>
                                                <div className="h-[45vh] overflow-auto">
                                                    <Table compact className="text-xs">
                                                        <THead className="sticky top-0">
                                                            <Tr>
                                                                <Th>#</Th>
                                                                <Th>Vendor Name</Th>
                                                                <Th>Location</Th>
                                                                <Th>Contact Person</Th>
                                                                <Th>Email</Th>
                                                                <Th>Status</Th>
                                                                <Th>Preview</Th>
                                                                {values.status === 0 && <Th></Th>}
                                                            </Tr>
                                                        </THead>
                                                        <TBody>
                                                            {values.vendors?.map((i, index) => (
                                                                <Tr key={i.vendorCode}>
                                                                    <Td>{index + 1}</Td>
                                                                    <Td>{i.name}</Td>
                                                                    <Td>{i.location}</Td>
                                                                    <Td>{i.contactPerson.name}</Td>
                                                                    <Td>{i.contactPerson.email}</Td>
                                                                    <Td>Pending</Td>
                                                                    <Td></Td>
                                                                    {values.status === 0 && (
                                                                        <Td>
                                                                            <Button
                                                                                type="button"
                                                                                variant="twoTone"
                                                                                color="red"
                                                                                size="xs"
                                                                                icon={<MdClose className="size-4" />}
                                                                                onClick={() =>
                                                                                    setValues((prev) => ({
                                                                                        ...prev,
                                                                                        vendors: prev?.vendors?.filter((_i) => _i.vendorCode !== i.vendorCode) || [],
                                                                                    }))
                                                                                }
                                                                            />
                                                                        </Td>
                                                                    )}
                                                                </Tr>
                                                            ))}
                                                        </TBody>
                                                    </Table>
                                                </div>
                                            </TabContent>

                                            <TabContent value={tabs[4]}>
                                                <div className="flex gap-2 h-[45vh] overflow-auto">
                                                    <AttachmentsTable id={values._id || 'uploaded'} info="Uploaded" isSmall={true} attachments={values.attachments || []} />
                                                    <AttachmentsTable
                                                        id={values._id || 'selected'}
                                                        info="Selected"
                                                        isEditable={true}
                                                        isDisabled={!allowEdit}
                                                        attachments={values.attachments || []}
                                                        setValues={setValues}
                                                    />
                                                </div>
                                            </TabContent>
                                        </Tabs>

                                        <div className="max-h-[35vh] overflow-auto mt-2">
                                            <RFQItemsTable isEditable={allowEdit} items={values.items || []} setFieldValue={setFieldValue} />
                                        </div>
                                    </FormContainer>

                                    <VendorModal
                                        isOpen={Boolean(flags?.vendorModal)}
                                        vendors={vendors?.filter((i) => !values.vendors?.some((v) => v.vendorCode === i.vendorCode))}
                                        addVendor={(vendor, shouldClose) => {
                                            setValues((prev) => ({
                                                ...prev,
                                                vendors: (prev.vendors || [])?.concat([vendor]),
                                            }))
                                            if (shouldClose) setFlags({})
                                        }}
                                        onClose={() => setFlags({})}
                                    />
                                </Form>

                                <IndentMetaDialog
                                    open={indentMeta.open}
                                    loading={indentMeta.loading}
                                    indent={indentMeta.indent}
                                    initialValues={indentMeta.initial}
                                    onClose={closeIndentMetaDialog}
                                    onSubmit={saveIndentMeta}
                                    indentTypeOptions={indentTypeOptions}
                                    indentTypeLoading={indentTypeLoading}
                                />
                            </>
                        )
                    }}
                </Formik>
            </Loading>

            <ConfirmDialog
                isOpen={!!flags?.deleteDialog}
                type="danger"
                title="Delete RFQ"
                confirmText="Delete"
                cancelText="Cancel"
                confirmButtonColor="red"
                loading={flags?.deleting}
                closable={!false}
                onCancel={() => setFlags({})}
                onConfirm={handleDelete}
            >
                Are you sure you want to delete this RFQ? This action cannot be undone.
            </ConfirmDialog>
        </div>
    )
}

// kept; not used currently
function pad10(n: number) {
    return String(n).padStart(10, '0')
}

const generateIndentNumber = (lastIndentNumber: string) => {
    const raw = String(lastIndentNumber || '').trim()
    const base = raw && raw.length >= 3 ? raw : 'IN00000000'
    const numericStr = base.startsWith('IN') ? base.slice(2) : base.replace(/\D/g, '')
    const numericPart = parseInt(numericStr || '0', 10)
    const safe = Number.isFinite(numericPart) ? numericPart : 0
    const incrementedNumber = (safe + 1).toString().padStart(8, '0')
    return `IN${incrementedNumber}`
}

const IndentMetaDialog = ({
    open,
    loading,
    indent,
    initialValues,
    onClose,
    onSubmit,
    indentTypeOptions,
    indentTypeLoading,
}: {
    open: boolean
    loading: boolean
    indent: IndentType | null
    initialValues: IndentMetaValues | null
    onClose: () => void
    onSubmit: (values: IndentMetaValues, helpers: FormikHelpers<IndentMetaValues>) => Promise<void>
    indentTypeOptions: { label: string; value: string }[]
    indentTypeLoading?: boolean
}) => {
    const [lastIndentNumber, setLastIndentNumber] = useState<string>('')

    const loggedInName = useMemo(() => getLoggedInUserLabel(), [])

    useEffect(() => {
        if (!open) return

        const fetchLastIndentNumber = async () => {
            try {
                const response = await ApiService.fetchData<any>({
                    method: 'get',
                    url: '/indent/last-indent-number',
                })

                const d = response?.data || {}
                const last =
                    d?.lastIndentNumber ||
                    d?.lastindentNumber ||
                    d?.lastindentnumber ||
                    d?.lastIndentNO ||
                    d?.lastIndentNo ||
                    d?.lastIndent ||
                    ''

                setLastIndentNumber(String(last || '').trim())
            } catch (error) {
                console.error('Failed to fetch last indent number:', error)
                setLastIndentNumber('')
            }
        }

        fetchLastIndentNumber()
    }, [open])

    const generatedIndentNo = useMemo(() => {
        return lastIndentNumber ? generateIndentNumber(lastIndentNumber) : 'IN00000001'
    }, [lastIndentNumber])

    const toNum = (x: any) => {
        const n = Number(String(x ?? '').trim())
        return Number.isFinite(n) ? n : NaN
    }
    const toNum0Local = (x: any) => {
        const n = Number(String(x ?? '').trim())
        return Number.isFinite(n) ? Math.max(0, n) : 0
    }

    const initial: IndentMetaValues = useMemo(() => {
        const defaultIndentType = indentTypeOptions?.[0]?.value || 'STANDARD'

        const base: IndentMetaValues =
            initialValues || {
                company: (indent as any)?.company || '',
                indentNumber: (indent as any)?.indentNumber || '',
                indentDate: (indent as any)?.documentDate ? new Date((indent as any).documentDate) : new Date(),
                lineNumber: (indent as any)?.lineNumber || '00001',
                costCenter: (indent as any)?.costCenter || '',
                requestedBy: (indent as any)?.requestedBy || '',
                indentType: String((indent as any)?.documentType ?? '').trim() || defaultIndentType,

                itemDescription: (indent as any)?.itemDescription || '',
                techSpec: (indent as any)?.techSpec || '',
                make: (indent as any)?.make || '',
                documentNumber: (indent as any)?.documentNumber || '',
                materialNumber: (indent as any)?.materialNumber || '',
                storageLocation: (indent as any)?.storageLocation || '',
                trackingNumber: (indent as any)?.trackingNumber || '',

                indentQty: String((indent as any)?.indentQty ?? '0'),
                preRFQQty: String((indent as any)?.preRFQQty ?? '0'),
                prePOQty: String((indent as any)?.prePOQty ?? '0'),
            }

        return {
            ...base,
            indentNumber: base.indentNumber?.trim() ? base.indentNumber : generatedIndentNo,
            lineNumber: base.lineNumber?.trim() ? pad5(parseInt(digitsOnly5(base.lineNumber) || '0', 10) || 1) : '00001',
            requestedBy: base.requestedBy?.trim() ? base.requestedBy : loggedInName,

            indentQty: String((base as any).indentQty ?? '0'),
            preRFQQty: String((base as any).preRFQQty ?? '0'),
            prePOQty: String((base as any).prePOQty ?? '0'),
        }
    }, [initialValues, indent, generatedIndentNo, loggedInName, indentTypeOptions])

    return (
        <Dialog isOpen={open} onClose={onClose} width={760}>
            <div className="flex max-h-[85vh] flex-col">
                <div className="pb-3">
                    <h6 className="text-xl font-semibold">Indent Details</h6>
                    <div className="mt-1 text-xs opacity-80">
                        <b>{indent?.itemCode}</b> — {(indent as any)?.itemDescription}
                    </div>
                </div>

                <Formik<IndentMetaValues>
                    enableReinitialize
                    initialValues={initial}
                    validate={(v) => {
                        const errors: Partial<Record<keyof IndentMetaValues, any>> = {}

                        if (!v.company?.trim()) errors.company = 'Required'
                        if (!v.indentNumber?.trim()) errors.indentNumber = 'Required'
                        if (!v.indentDate) errors.indentDate = 'Required'
                        if (!v.costCenter?.trim()) errors.costCenter = 'Required'
                        if (!v.requestedBy?.trim()) errors.requestedBy = 'Required'
                        if (!v.indentType?.trim()) errors.indentType = 'Required'

                        const ln = digitsOnly5(v.lineNumber)
                        if (!ln || ln.length !== 5) errors.lineNumber = 'Line number must be 5 digits'

                        const iq = toNum(v.indentQty)
                        const rq = toNum(v.preRFQQty)
                        const pq = toNum(v.prePOQty)

                        if (!Number.isFinite(iq) || iq < 0) errors.indentQty = 'Enter a valid non-negative number'
                        if (!Number.isFinite(rq) || rq < 0) errors.preRFQQty = 'Enter a valid non-negative number'
                        if (!Number.isFinite(pq) || pq < 0) errors.prePOQty = 'Enter a valid non-negative number'

                        if (Number.isFinite(iq) && Number.isFinite(rq) && Number.isFinite(pq)) {
                            if (rq + pq > iq) errors.prePOQty = 'Pre RFQ + Pre PO cannot exceed Indent Qty'
                        }

                        return errors
                    }}
                    onSubmit={onSubmit}
                >
                    {({ values, setFieldValue, errors, touched }) => {
                        const computedBalance = Math.max(0, toNum0Local(values.indentQty) - toNum0Local(values.preRFQQty) - toNum0Local(values.prePOQty))

                        const opts = indentTypeOptions?.length ? indentTypeOptions : DEFAULT_INDENT_TYPE_OPTIONS
                        const has = opts.some((o) => o.value === values.indentType)
                        const safeOpts = has || !values.indentType ? opts : [{ label: `${values.indentType} (unknown)`, value: values.indentType }, ...opts]

                        return (
                            <Form className="min-h-0 flex flex-col">
                                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                                    <FormContainer>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <FormItem
                                                asterisk
                                                label="Company"
                                                labelClass="text-xs !mb-1"
                                                className="mb-2.5"
                                                invalid={!!(touched.company && errors.company)}
                                                errorMessage={errors.company}
                                            >
                                                <Input size="sm" value={values.company} onChange={(e) => setFieldValue('company', e.target.value)} />
                                            </FormItem>

                                            <FormItem
                                                asterisk
                                                label="Indent Number"
                                                labelClass="text-xs !mb-1"
                                                className="mb-2.5"
                                                invalid={!!(touched.indentNumber && errors.indentNumber)}
                                                errorMessage={errors.indentNumber}
                                            >
                                                <Input size="sm" value={values.indentNumber} onChange={(e) => setFieldValue('indentNumber', e.target.value)} />
                                            </FormItem>

                                            <FormItem
                                                asterisk
                                                label="Indent Date"
                                                labelClass="text-xs !mb-1"
                                                className="mb-2.5"
                                                invalid={!!(touched.indentDate && errors.indentDate)}
                                                errorMessage={errors.indentDate}
                                            >
                                                <DatePicker size="sm" inputFormat="DD/MM/YYYY" value={values.indentDate} onChange={(d) => setFieldValue('indentDate', d)} />
                                            </FormItem>

                                            <FormItem
                                                asterisk
                                                label="Line Number"
                                                labelClass="text-xs !mb-1"
                                                className="mb-2.5"
                                                invalid={!!(touched.lineNumber && errors.lineNumber)}
                                                errorMessage={errors.lineNumber}
                                            >
                                                <Input
                                                    size="sm"
                                                    value={values.lineNumber}
                                                    onChange={(e) => setFieldValue('lineNumber', digitsOnly5(e.target.value))}
                                                    onBlur={() => setFieldValue('lineNumber', pad5(parseInt(digitsOnly5(values.lineNumber) || '0', 10) || 0))}
                                                />
                                            </FormItem>

                                            <FormItem
                                                asterisk
                                                label="Cost Centre"
                                                labelClass="text-xs !mb-1"
                                                className="mb-2.5"
                                                invalid={!!(touched.costCenter && errors.costCenter)}
                                                errorMessage={errors.costCenter}
                                            >
                                                <Input size="sm" value={values.costCenter} onChange={(e) => setFieldValue('costCenter', e.target.value)} />
                                            </FormItem>

                                            <FormItem
                                                asterisk
                                                label="Requested By"
                                                labelClass="text-xs !mb-1"
                                                className="mb-2.5"
                                                invalid={!!(touched.requestedBy && errors.requestedBy)}
                                                errorMessage={errors.requestedBy}
                                            >
                                                <Input
                                                    size="sm"
                                                    disabled={Boolean(loggedInName)}
                                                    value={values.requestedBy}
                                                    onChange={(e) => setFieldValue('requestedBy', e.target.value)}
                                                />
                                            </FormItem>

                                            <FormItem
                                                asterisk
                                                label="Indent Type"
                                                labelClass="text-xs !mb-1"
                                                className="mb-2.5 md:col-span-2"
                                                invalid={!!(touched.indentType && errors.indentType)}
                                                errorMessage={errors.indentType}
                                            >
                                                <Select size="sm" options={safeOpts} value={safeOpts.find((o) => o.value === values.indentType)} onChange={(opt) => setFieldValue('indentType', opt?.value)} />
                                                {indentTypeLoading ? <div className="mt-1 text-[11px] opacity-70">Loading indent types…</div> : null}
                                            </FormItem>

                                            <FormItem label="Item Description" labelClass="text-xs !mb-1" className="mb-2.5">
                                                <Input size="sm" value={values.itemDescription} onChange={(e) => setFieldValue('itemDescription', e.target.value)} />
                                            </FormItem>

                                            <FormItem label="Tech Specification" labelClass="text-xs !mb-1" className="mb-2.5">
                                                <Input size="sm" value={values.techSpec} onChange={(e) => setFieldValue('techSpec', e.target.value)} />
                                            </FormItem>

                                            <FormItem label="Make" labelClass="text-xs !mb-1" className="mb-2.5">
                                                <Input size="sm" value={values.make} onChange={(e) => setFieldValue('make', e.target.value)} />
                                            </FormItem>

                                            <div className="md:col-span-2 mt-1 rounded-lg border bg-gray-50 p-3">
                                                <div className="text-sm font-semibold mb-2">Quantities</div>

                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                                    <FormItem
                                                        asterisk
                                                        label="Indent Qty"
                                                        labelClass="text-xs !mb-1"
                                                        className="mb-0"
                                                        invalid={!!(touched.indentQty && (errors as any).indentQty)}
                                                        errorMessage={(errors as any).indentQty}
                                                    >
                                                        <Input size="sm" type="number" inputMode="decimal" value={values.indentQty} onChange={(e) => setFieldValue('indentQty', e.target.value)} />
                                                    </FormItem>

                                                    <FormItem
                                                        label="Pre RFQ Qty"
                                                        labelClass="text-xs !mb-1"
                                                        className="mb-0"
                                                        invalid={!!(touched.preRFQQty && (errors as any).preRFQQty)}
                                                        errorMessage={(errors as any).preRFQQty}
                                                    >
                                                        <Input size="sm" type="number" inputMode="decimal" value={values.preRFQQty} onChange={(e) => setFieldValue('preRFQQty', e.target.value)} />
                                                    </FormItem>

                                                    <FormItem
                                                        label="Pre PO Qty"
                                                        labelClass="text-xs !mb-1"
                                                        className="mb-0"
                                                        invalid={!!(touched.prePOQty && (errors as any).prePOQty)}
                                                        errorMessage={(errors as any).prePOQty}
                                                    >
                                                        <Input size="sm" type="number" inputMode="decimal" value={values.prePOQty} onChange={(e) => setFieldValue('prePOQty', e.target.value)} />
                                                    </FormItem>

                                                    <FormItem label="Balance Qty (auto)" labelClass="text-xs !mb-1" className="mb-0">
                                                        <Input size="sm" disabled value={String(computedBalance)} />
                                                    </FormItem>
                                                </div>

                                                <div className="mt-2 text-[11px] opacity-70">Balance = Indent Qty − Pre RFQ Qty − Pre PO Qty (min 0)</div>
                                            </div>
                                        </div>

                                        <div className="h-2" />
                                    </FormContainer>
                                </div>

                                <div className="sticky bottom-0 border-t bg-white/95 py-3 backdrop-blur flex justify-end gap-2">
                                    <Button type="button" size="sm" variant="plain" disabled={loading} onClick={onClose}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" size="sm" variant="solid" disabled={loading}>
                                        {loading ? <Spinner size={16} /> : 'Save'}
                                    </Button>
                                </div>
                            </Form>
                        )
                    }}
                </Formik>
            </div>
        </Dialog>
    )
}
