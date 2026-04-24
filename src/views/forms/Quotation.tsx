import React, { ChangeEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, FieldProps, Form, Formik, FormikHelpers, setIn } from 'formik'
import { TiArrowForwardOutline } from 'react-icons/ti'

import { Button, DatePicker, FormContainer, FormItem, Input, Select, Table, Tabs } from '@/components/ui'
import TabContent from '@/components/ui/Tabs/TabContent'
import TabList from '@/components/ui/Tabs/TabList'
import TabNav from '@/components/ui/Tabs/TabNav'
import { AttachmentsTable } from '@/components/app/Attachments'
import useQuery from '@/utils/hooks/useQuery'
import {
    IndentType,
    NegotiationType,
    OptionType,
    QuotationItemType,
    QuotationType,
    RFQItemType,
    RFQType,
    VendorType,
} from '@/@types/app'
import ApiService from '@/services/ApiService'
import { QuotationItemsTable } from '@/components/app/QuotationItems'
import { freightTypes, paymentModes } from '@/utils/constants'
import ChargesTable from '@/components/app/ChargesTable'
import { useAppSelector } from '@/store'
import { showAlert, showError } from '@/utils/hoc/showAlert'
import { formatDateTime } from '@/utils/formatDate'
import { ConfirmDialog, Loading } from '@/components/shared'
import { clubItems, deClubItems } from '@/utils/clubItems'
import { termsConditionsOptions, getIndentID } from '@/utils/data' // ✅ NEW: getIndentID
import { QuotationNegotiation } from '@/components/app/QuotationNegotiation'
import { MdLabelImportant } from 'react-icons/md'

const { Tr, Th, Td, THead, TBody } = Table

const initialValues: QuotationType = {
    rfqNumber: '',
    validityDate: new Date(new Date().setHours(24 * 7, 0, 0, 0) - 1),
    quotationNumber: '',
    quotationDate: new Date(),
    creditDays: 0,
    freightType: '',
    paymentMode: '',
    remarks: '',
    vendorCode: '',
    vendorLocation: '',
    amount: {
        basic: 0,
        discount: 0,
        otherCharges: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        total: 0,
    },
    items: [],
    attachments: [],
    termsConditions: {},
    contactEmail: '',
    contactNumber: '',
    contactPersonName: '',
}

const tabs = ['General Information', 'Terms & Conditions', 'Attachments', 'Contact Us']

export default function Quotation() {
    const user = useAppSelector((state) => state.auth.user)
    const navigate = useNavigate()
    const query = useQuery()

    const [tab, setTab] = useState(tabs[0])
    const [qtyMap, setQtyMap] = useState<Pick<QuotationItemType, 'indentNumber' | 'itemCode' | 'qty'>[]>([])
    const [rfq, setRfq] = useState<RFQType>()
    const [vendorData, setVendorData] = useState<VendorType>()
    const [formValues, setFormValues] = useState<QuotationType>(initialValues)

    // ✅ IMPORTANT: store indents by BOTH keys:
    // - backend id (id/_id) for old usages
    // - getIndentID(indent) (indentNumber+itemCode) for item meta lookups
    const [indents, setIndents] = useState<{ [id: string]: IndentType }>({})

    const [isEditable, setIsEditable] = useState<boolean>(true)
    const [negotiation, setNegotiation] = useState<NegotiationType>()
    const [flags, setFlags] = useState<{
        loading?: boolean
        deleting?: boolean
        deleteDialog?: boolean
        regretDialog?: boolean | 'inprogress'
    }>({})

    const rfqNumber = query.get('rfqNumber') || formValues?.rfqNumber
    const quotationNumber = query.get('quotationNumber')

    const fetchRfq = async (_rfqNumber: string = rfqNumber): Promise<RFQType | undefined> => {
        try {
            const response = await ApiService.fetchData<{ rfq: RFQType; indents: IndentType[] }>({
                method: 'get',
                url: '/rfq/' + encodeURIComponent(_rfqNumber),
                params: {
                    indents: true,
                },
            })

            const { rfq: _rfq, indents: _indents } = response.data

            // ✅ FIX: index indents by both id and indentNumber+itemCode
            const indentIndex: { [k: string]: IndentType } = {}
            for (const i of _indents || []) {
                const idKey = String((i as any)?.id || (i as any)?._id || '').trim()
                if (idKey) indentIndex[idKey] = i

                const pairKey = String(getIndentID(i) || '').trim()
                if (pairKey) indentIndex[pairKey] = i
            }
            setIndents(indentIndex)

            const dueDate = new Date(_rfq.dueDate as string)
            if (dueDate.getTime() < Date.now() && rfqNumber) {
                showError(`EXPIRED! RFQ '${_rfq.rfqNumber}' was due till ${formatDateTime(_rfq?.dueDate as string)}.`)
                navigate('/rfqs')
                return
            }

            if (_rfq?._id) setRfq(_rfq)
            return _rfq
        } catch (error: unknown) {
            // @ts-ignore
            if (error?.response?.status === 404) {
                showError(`RFQ not found. Invalid RFQ number '${_rfqNumber}'`)
                navigate('/rfqs')
            }
            console.error(error)
        }
    }

    const n0 = (v: any) => {
        const n = Number(v)
        return Number.isFinite(n) ? n : 0
    }
    const s = (v: any) => String(v ?? '').trim()

    // ✅ FIX: map RFQ item -> QuotationItem correctly (HSN + requested make + qty)
    const createQItem = (rfqItem: RFQItemType): QuotationItemType =>
    ({
        indentNumber: s((rfqItem as any).indentNumber),
        itemCode: s((rfqItem as any).itemCode),

        qty: n0((rfqItem as any).rfqQty),

        // ✅ RFQ DB has hsnCode and make stored in rfqMake
        hsnCode: s((rfqItem as any).hsnCode),
        make: s((rfqItem as any).rfqMake || (rfqItem as any).make),

        rate: 0,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 0,
        delivery: 0,
        remarks: '',
        amount: {
            basic: 0,
            discount: 0,
            taxable: 0,
            total: 0,
        },
        taxDetails: [],
        discountType: 'percent',

        // ✅ new quotation should have items selected by default
        selected: true,
    } as any)

    useEffect(() => {
        const handleFetching = async () => {
            try {
                // ✅ Creating quotation directly from RFQ
                if (rfqNumber) {
                    const _rfq = await fetchRfq()
                    const clubbedResponse = clubItems(_rfq?.items?.map(createQItem) || [])
                    setQtyMap(clubbedResponse.qtyMap)
                    setFormValues((prev) => ({
                        ...prev,
                        items: clubbedResponse.items,
                    }))

                    setIsEditable(true)
                    return
                }

                // ✅ Editing an existing quotation
                if (!quotationNumber) return

                const response = await ApiService.fetchData<QuotationType & { poNumber?: string; negotiation?: NegotiationType }>({
                    method: 'get',
                    url: '/quotation',
                    params: {
                        quotationNumber,
                        fetchNegotiation: true,
                    },
                })

                const _rfq = await fetchRfq(response.data.rfqNumber)
                if (!_rfq) {
                    showError(`RFQ not found for this quotatin.`)
                    navigate('/quotations')
                    return
                }

                // ✅ append any missing RFQ items (keep unselected)
                response.data.items = response.data.items.concat(
                    _rfq.items
                        ?.filter((ri) => !response.data.items.find((qi) => qi.indentNumber === ri.indentNumber && qi.itemCode === ri.itemCode))
                        ?.map((ri) => ({ ...createQItem(ri), selected: false })) || [],
                )

                if (response.data.negotiation) {
                    setNegotiation(response.data.negotiation)
                }

                if (response.data.poNumber) {
                    showError('Quotation cannot be edited because a purchase order has been generated.')
                    setIsEditable(false)
                }

                if (response.data.quotationDate) response.data.quotationDate = new Date(response.data.quotationDate)
                if (response.data.validityDate) response.data.validityDate = new Date(response.data.validityDate)

                if (response.data.items) {
                    const clubbedResponse = clubItems(
                        response.data.items.map((i) => ({
                            ...i,
                            selected: i.selected ?? true,
                        })),
                    )

                    response.data.items = clubbedResponse.items
                    setQtyMap(clubbedResponse.qtyMap)
                }

                if (response.data.attachments)
                    response.data.attachments = response.data.attachments.map((i) => ({
                        ...i,
                        status: 1,
                    }))

                setFormValues(response.data)
            } catch (error) {
                console.error(error)
            }
        }

            ; (async () => {
                setFlags({ loading: true })
                await handleFetching()
                setFlags({})
            })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        ; (async () => {
            setFlags({ loading: true })
            try {
                const response = await ApiService.fetchData<VendorType>({
                    method: 'get',
                    url: '/vendor/list',
                    params: {
                        vendorCode: user.vendorCode,
                    },
                })

                setVendorData(response.data)
            } catch (error) {
                console.error(error)
            }
            setFlags({})
        })()
    }, [user.vendorCode])

    const handleSave = async ({ file = [], ...values }: QuotationType, setErrors: FormikHelpers<QuotationType>['setErrors']) => {
        let errors: { [x: string]: boolean } = {}
        if (!values.quotationNumber) errors.quotationNumber = true
        if (!values.freightType) errors.freightType = true

        if (values?.items)
            for (let i = 0; i < values.items.length; i++) {
                const item = values.items[i]
                if (!item.selected) continue

                if (!item.taxRate || item.taxRate <= 0) errors = setIn(errors, `items[${i}].taxRate`, true)
                if (!item.make) errors = setIn(errors, `items[${i}].make`, true)
                if (!(item.rate > 0)) errors = setIn(errors, `items[${i}].rate`, true)
                if (!item.delivery) errors = setIn(errors, `items[${i}].delivery`, true)
            }

        setErrors(errors)

        if (!values.items?.find((i) => i.selected)) return showError('Atleast one item must be selected.')
        else if (Object.keys(errors)?.[0]) return showError('Please fill all the required data.')

        setFlags({ loading: true })

        try {
            const formData = new FormData()
            formData.append(
                'data',
                JSON.stringify({
                    ...values,
                    rfqNumber: rfqNumber || formValues?.rfqNumber,
                    vendorCode: user.vendorCode,
                    companyCode: vendorData?.companyCode,
                    vendorLocation: vendorData?.street,
                    items: deClubItems(
                        values.items.filter((i) => i.selected),
                        qtyMap,
                    ),
                }),
            )
            for (const i of file as any) formData.append('file', i)

            await ApiService.fetchData({
                method: !quotationNumber ? 'POST' : 'PUT',
                url: '/quotation' + (!quotationNumber ? '' : '/' + (formValues as any)._id),
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                data: formData,
            })

            showAlert(`Quotation ${values.status === 1 ? 'submitted' : 'saved'} successfully!`)
            navigate('/quotations')
        } catch (error: any) {
            const mssg = 'Failed to save/submit quotation. Please contact support.'
            if (error?.response?.status === 500) showError(mssg)
            else showError(error?.response?.data?.message || mssg)
        }
        setFlags({})
    }

    const handleSubmit = (values: QuotationType, { setErrors }: FormikHelpers<QuotationType>) => handleSave({ ...values, status: 1 }, setErrors)

    const handleDelete = async () => {
        setFlags((prev) => ({ ...prev, deleting: true }))
        try {
            const response = await ApiService.fetchData<{ success: true }>({
                method: 'delete',
                url: '/quotation/' + (formValues as any)?._id,
            })
            if (response.data.success) {
                setFlags((prev) => ({ ...prev, deleting: false, deleteDialog: false }))
                showAlert(`Quotation ${quotationNumber} has been deleted successfully.`)
                navigate('/quotations')
            }
        } catch (error: any) {
            if (error?.response?.status === 500) {
                showError('Failed to delete quotation. Please contact support.')
                setFlags((prev) => ({ ...prev, deleting: false }))
            } else if (error?.response?.data?.message) {
                showError(error?.response?.data?.message)
                setFlags((prev) => ({ ...prev, deleting: false, deleteDialog: false }))
            }
        }
    }

    const handleAmountCalculation = (_values: QuotationType) => {
        const amount = {
            basic: 0,
            discount: 0,
            otherCharges: 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            total: 0,
        }

        if (_values.items?.[0])
            for (const item of _values.items.filter((i) => i.selected)) {
                amount.basic += item.amount.basic
                amount.discount += item.amount.discount || 0
                amount.total += item.amount.total
                if ((item as any).amount.igst) amount.igst += (item as any).amount.igst
                if ((item as any).amount.cgst) amount.cgst += (item as any).amount.cgst
                if ((item as any).amount.sgst) amount.sgst += (item as any).amount.sgst
            }

        amount.basic = +amount.basic.toFixed(2)
        amount.discount = +amount.discount.toFixed(2)
        if (amount.igst) amount.igst = +amount.igst.toFixed(2)
        else {
            amount.cgst = +amount.cgst.toFixed(2)
            amount.sgst = +amount.sgst.toFixed(2)
        }

        if ((_values as any).charges)
            for (const charge of Object.values((_values as any).charges)) {
                // @ts-ignore
                amount.otherCharges += charge.amount + charge.gstAmount
                // @ts-ignore
                amount.total += charge.amount + charge.gstAmount
            }

        amount.otherCharges = +amount.otherCharges.toFixed(2)
        amount.total = +amount.total.toFixed(2)

        return amount
    }

    const handleRegretMarking = async () => {
        setFlags((prev) => ({ ...prev, regretDialog: 'inprogress' }))
        try {
            const response = await ApiService.fetchData<{ success: true }>({
                method: 'patch',
                url: '/rfq/regret',
                params: { rfqNumber },
            })
            if (response.data.success) {
                setFlags((prev) => ({ ...prev, regretDialog: false }))
                showAlert(`Request has been marked as regret successfully.`)
                navigate('/rfqs')
            }
        } catch (error: any) {
            if (error?.response?.status === 500) {
                showError('Failed to mark request as regret. Please contact support.')
                setFlags((prev) => ({ ...prev, regretDialog: true }))
            } else if (error?.response?.data?.message) {
                showError(error?.response?.data?.message)
                setFlags((prev) => ({ ...prev, regretDialog: false }))
            }
        }
    }

    return (
        <div className='h-full min-h-0 overflow-hidden'>
            <title>Quotation</title>

            <Loading type='cover' loading={flags?.loading}>
                <div className='h-[calc(100dvh-64px)] min-h-0 overflow-y-auto overflow-x-hidden'>
                    <Formik enableReinitialize initialValues={formValues} onSubmit={handleSubmit}>
                        {({ values, setFieldValue, setValues, errors, setErrors }) => {
                            const showSaveButton = !((formValues as any)?.status)
                            const showDeleteButton = Boolean((formValues as any)?._id && isEditable)
                            const showSubmitButton = Boolean(isEditable)
                            const showRegretButton = !((values as any)?._id)
                            const hasAnyMobileAction = showSaveButton || showDeleteButton || showSubmitButton || showRegretButton

                            const vendorSummaryCard = (
                                <div className='rounded-xl border border-slate-200 bg-white p-3 text-sm'>
                                    <h6 className='text-sm'>Vendor Details</h6>
                                    <div className='mt-2 space-y-1 text-[13px]'>
                                        <div className='flex justify-between gap-2'>
                                            <span>Vendor Name</span>
                                            <span className='text-right'>{vendorData?.name}</span>
                                        </div>
                                        <div className='flex justify-between gap-2'>
                                            <span>Vendor Location</span>
                                            <span className='text-right'>{(vendorData as any)?.street}</span>
                                        </div>
                                    </div>

                                    <h6 className='mt-4 text-sm'>Quotation Amount</h6>
                                    <div className='mt-2 space-y-1 text-[13px]'>
                                        <div className='flex justify-between gap-2'>
                                            <span>Basic</span>
                                            <span>{(values as any).amount.basic}</span>
                                        </div>
                                        <div className='flex justify-between gap-2'>
                                            <span>Discount</span>
                                            <span>{(values as any).amount.discount}</span>
                                        </div>
                                        <div className='flex justify-between gap-2'>
                                            <span>Other Charges</span>
                                            <span>{(values as any).amount.otherCharges}</span>
                                        </div>
                                        <div className='flex justify-between gap-2'>
                                            <span>SGST</span>
                                            <span>{(values as any).amount.sgst}</span>
                                        </div>
                                        <div className='flex justify-between gap-2'>
                                            <span>CGST</span>
                                            <span>{(values as any).amount.cgst}</span>
                                        </div>
                                        <hr className='my-2 block' />
                                        <div className='flex justify-between gap-2 font-bold'>
                                            <span>Net Amount</span>
                                            <span>{(values as any).amount.total}</span>
                                        </div>
                                    </div>
                                </div>
                            )

                            const desktopActionButtons = (
                                <>
                                    {showSaveButton && (
                                        <Button type='button' variant='twoTone' size='xs' onClick={() => handleSave(values, setErrors)}>
                                            Save
                                        </Button>
                                    )}

                                    {showDeleteButton && (
                                        <Button type='button' variant='twoTone' size='xs' color='red' onClick={() => setFlags({ deleteDialog: true })}>
                                            Delete
                                        </Button>
                                    )}

                                    {showSubmitButton && (
                                        <Button type='submit' variant='solid' size='xs'>
                                            Submit
                                        </Button>
                                    )}

                                    {showRegretButton && (
                                        <Button type='button' variant='solid' size='xs' color='red' onClick={() => setFlags({ regretDialog: true })}>
                                            Regret
                                        </Button>
                                    )}
                                </>
                            )

                            const mobileActionButtons = (
                                <>
                                    {showSaveButton && (
                                        <Button
                                            type='button'
                                            variant='twoTone'
                                            size='xs'
                                            className='flex-1 min-w-[110px]'
                                            onClick={() => handleSave(values, setErrors)}
                                        >
                                            Save
                                        </Button>
                                    )}

                                    {showDeleteButton && (
                                        <Button
                                            type='button'
                                            variant='twoTone'
                                            size='xs'
                                            color='red'
                                            className='flex-1 min-w-[110px]'
                                            onClick={() => setFlags({ deleteDialog: true })}
                                        >
                                            Delete
                                        </Button>
                                    )}

                                    {showSubmitButton && (
                                        <Button type='submit' variant='solid' size='xs' className='flex-1 min-w-[110px]'>
                                            Submit
                                        </Button>
                                    )}

                                    {showRegretButton && (
                                        <Button
                                            type='button'
                                            variant='solid'
                                            size='xs'
                                            color='red'
                                            className='flex-1 min-w-[110px]'
                                            onClick={() => setFlags({ regretDialog: true })}
                                        >
                                            Regret
                                        </Button>
                                    )}
                                </>
                            )

                            return (
                                <Form className='mt-3 min-h-max px-2 pb-44 sm:px-3 lg:px-4 xl:pb-8 overflow-visible'>
                                    <FormContainer className='min-w-0 w-full overflow-visible'>
                                        <div className='mx-auto w-full max-w-[1880px] overflow-visible'>
                                            <Tabs variant='underline' value={tab} onChange={setTab}>
                                                <div className='-mx-2 overflow-x-auto px-2 pb-1'>
                                                    <TabList className='min-w-max flex-nowrap gap-1'>
                                                        {tabs.map((i, idx) => (
                                                            <TabNav key={i} className='px-2 pt-0 whitespace-nowrap' value={i}>
                                                                <div className='flex items-center gap-2'>
                                                                    {idx === 1 && (negotiation as any)?.termsConditions && <MdLabelImportant color='red' className='size-5' />}
                                                                    <span className='text-xs'>{i}</span>
                                                                </div>
                                                            </TabNav>
                                                        ))}

                                                        <TabNav
                                                            disabled
                                                            className='hidden xl:flex flex-1 cursor-auto justify-end gap-1 p-0 opacity-100 min-w-max'
                                                            value='actions'
                                                        >
                                                            {desktopActionButtons}
                                                        </TabNav>
                                                    </TabList>
                                                </div>

                                                {hasAnyMobileAction && (
                                                    <div className='xl:hidden fixed bottom-3 left-3 right-3 z-40'>
                                                        <div className='rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur'>
                                                            <div className='flex flex-wrap gap-2'>{mobileActionButtons}</div>
                                                        </div>
                                                    </div>
                                                )}

                                                <TabContent value={tabs[0]}>
                                                    <div className='mt-2 flex flex-col gap-4 xl:flex-row'>
                                                        <div className='w-full min-w-0 xl:w-[68%]'>
                                                            <div className='grid grid-cols-1 gap-x-3 gap-y-2 md:grid-cols-2 2xl:grid-cols-4'>
                                                                <FormItem className='!mb-0 min-w-0' labelClass='text-xs !mb-0.5' label='RFQ Number'>
                                                                    <Field
                                                                        disabled
                                                                        type='text'
                                                                        name='rfqNumber'
                                                                        component={Input}
                                                                        className='w-full'
                                                                        size={'xs'}
                                                                        value={rfq?.rfqNumber || rfqNumber}
                                                                        onChange={() => null}
                                                                    />
                                                                </FormItem>

                                                                <FormItem asterisk className='!mb-0 min-w-0' labelClass='text-xs !mb-0.5' label='Validity Date'>
                                                                    <Field
                                                                        disabled={!isEditable}
                                                                        clearable={false}
                                                                        type='text'
                                                                        name='validityDate'
                                                                        component={DatePicker}
                                                                        inputFormat='DD/MM/YYYY'
                                                                        className='w-full'
                                                                        size={'xs'}
                                                                        value={(values as any).validityDate || null}
                                                                        onChange={(dateValue: Date) => setFieldValue('validityDate', dateValue)}
                                                                    />
                                                                </FormItem>

                                                                <FormItem asterisk className='!mb-0 min-w-0' labelClass='text-xs !mb-0.5' label='Quotation Number'>
                                                                    <Field
                                                                        disabled={!isEditable}
                                                                        type='text'
                                                                        name='quotationNumber'
                                                                        component={Input}
                                                                        className='w-full'
                                                                        size={'xs'}
                                                                        value={(values as any).quotationNumber}
                                                                        invalid={errors?.quotationNumber ? true : false}
                                                                        validate={(val: string) => !val}
                                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue(e.target.name, e.target.value)}
                                                                    />
                                                                </FormItem>

                                                                <FormItem className='!mb-0 min-w-0' labelClass='text-xs !mb-0.5' label='Quotation Date'>
                                                                    <Field
                                                                        disabled
                                                                        type='text'
                                                                        name='quotationDate'
                                                                        component={DatePicker}
                                                                        inputFormat='DD/MM/YYYY'
                                                                        className='w-full'
                                                                        size={'xs'}
                                                                        value={(values as any).quotationDate || null}
                                                                        onChange={(dateValue: Date) => setFieldValue('quotationDate', dateValue)}
                                                                    />
                                                                </FormItem>
                                                            </div>

                                                            <div className='mt-2 grid grid-cols-1 gap-x-3 gap-y-2 md:grid-cols-2 xl:grid-cols-3'>
                                                                <FormItem className='!mb-0 min-w-0' labelClass='text-xs !mb-0.5' label='Credit Days'>
                                                                    <Field
                                                                        disabled={!isEditable}
                                                                        type='number'
                                                                        name='creditDays'
                                                                        component={Input}
                                                                        className='w-full'
                                                                        size={'xs'}
                                                                        value={(values as any).creditDays}
                                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue(e.target.name, e.target.value)}
                                                                    />
                                                                </FormItem>

                                                                <FormItem asterisk className='!mb-0 min-w-0' labelClass='text-xs !mb-0.5' label='Freight Type'>
                                                                    <Field name='freightType'>
                                                                        {({ field, form }: FieldProps<QuotationType>) => {
                                                                            return (
                                                                                <Select
                                                                                    field={field}
                                                                                    form={form}
                                                                                    isDisabled={!isEditable}
                                                                                    size={'xs'}
                                                                                    className='w-full'
                                                                                    options={freightTypes}
                                                                                    value={freightTypes.find((i) => i.value === (values as any).freightType)}
                                                                                    onChange={(option) => form.setFieldValue(field.name, (option as any)?.value)}
                                                                                />
                                                                            )
                                                                        }}
                                                                    </Field>
                                                                </FormItem>

                                                                <FormItem className='!mb-0 min-w-0' labelClass='text-xs !mb-0.5' label='Payment Mode'>
                                                                    <Field
                                                                        isDisabled={!isEditable}
                                                                        size={'xs'}
                                                                        name='paymentMode'
                                                                        className='w-full'
                                                                        component={Select}
                                                                        options={paymentModes}
                                                                        value={paymentModes.find((i) => i.value === (values as any).paymentMode)}
                                                                        onChange={(option: OptionType) => setFieldValue('paymentMode', option.value)}
                                                                    />
                                                                </FormItem>
                                                            </div>

                                                            <FormItem className='!mb-0 mt-2' labelClass='text-xs !mb-0.5' label='Remarks'>
                                                                <Field
                                                                    textArea
                                                                    disabled={!isEditable}
                                                                    type='text'
                                                                    name='remarks'
                                                                    component={Input}
                                                                    size={'xs'}
                                                                    className='min-h-[90px] !h-[90px] resize-none sm:min-h-[110px] sm:!h-[110px]'
                                                                    value={(values as any).remarks}
                                                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue(e.target.name, e.target.value)}
                                                                />
                                                            </FormItem>
                                                        </div>

                                                        <div className='w-full min-w-0 xl:w-[32%]'>
                                                            <div className='rounded-xl border border-slate-200 bg-white p-3 text-sm'>
                                                                {vendorSummaryCard}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TabContent>

                                                <TabContent value={tabs[1]}>
                                                    <div className='overflow-x-auto'>
                                                        <div className='min-w-[980px]'>
                                                            <Table compact className='text-xs' containerClassName='h-full border border-slate-200 border-t-0'>
                                                                <THead className='sticky top-0'>
                                                                    <Tr>
                                                                        <Th className='flex-1'>Header Name</Th>
                                                                        <Th className='flex-1 w-[40%] py-0 pr-0 border-x border-x-slate-400/80'>
                                                                            <div className='flex w-full justify-between'>
                                                                                <span>RFQ T&C</span>
                                                                                {isEditable && (
                                                                                    <Button
                                                                                        size='xs'
                                                                                        type='button'
                                                                                        variant='plain'
                                                                                        icon={<TiArrowForwardOutline className='size-4' />}
                                                                                        className='!h-auto !py-0 mr-1 bg-none hover:bg-none'
                                                                                        onClick={() =>
                                                                                            setValues((prev: any) => ({
                                                                                                ...prev,
                                                                                                termsConditions: (rfq as any)?.termsConditions || {},
                                                                                            }))
                                                                                        }
                                                                                    >
                                                                                        <span className='text-xs font-normal'>Copy</span>
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        </Th>
                                                                        <Th className='flex-1 w-[40%]'>Quotation T&C</Th>
                                                                        {(negotiation as any)?.termsConditions && (
                                                                            <Th className='border-l border-l-slate-400/80 flex-1 w-[40%]'>
                                                                                <div className='flex w-full justify-between'>
                                                                                    <div className='flex items-center gap-2'>
                                                                                        <MdLabelImportant color='red' className='size-5' />
                                                                                        <span>Expected</span>
                                                                                    </div>
                                                                                    {isEditable && (
                                                                                        <Button
                                                                                            size='xs'
                                                                                            type='button'
                                                                                            variant='plain'
                                                                                            icon={<TiArrowForwardOutline className='size-4 transform scale-x-[-1]' />}
                                                                                            className='!h-auto !py-0 mr-1 bg-none hover:bg-none'
                                                                                            onClick={() =>
                                                                                                setValues((prev: any) => ({
                                                                                                    ...prev,
                                                                                                    termsConditions: !prev.termsConditions
                                                                                                        ? (negotiation as any).termsConditions || {}
                                                                                                        : termsConditionsOptions.reduce(
                                                                                                            (obj, { value: key }) => ({
                                                                                                                ...obj,
                                                                                                                [key]:
                                                                                                                    (negotiation as any).termsConditions?.[key] ||
                                                                                                                    prev.termsConditions[key],
                                                                                                            }),
                                                                                                            {},
                                                                                                        ),
                                                                                                }))
                                                                                            }
                                                                                        >
                                                                                            <span className='text-xs font-normal'>Copy</span>
                                                                                        </Button>
                                                                                    )}
                                                                                </div>
                                                                            </Th>
                                                                        )}
                                                                    </Tr>
                                                                </THead>
                                                                <TBody>
                                                                    {termsConditionsOptions
                                                                        // @ts-ignore
                                                                        .toSorted(
                                                                            (a, b) =>
                                                                                (((rfq as any)?.termsConditions?.[b.value] ? 1 : 0) -
                                                                                    ((rfq as any)?.termsConditions?.[a.value] ? 1 : 0)) as any,
                                                                        )
                                                                        .map(({ label, value }) => (
                                                                            <Tr key={value}>
                                                                                <Td className='whitespace-nowrap'>{label}</Td>
                                                                                <Td className='border-x border-x-slate-400/80'>{(rfq as any)?.termsConditions?.[value]}</Td>
                                                                                <Td>
                                                                                    <Field
                                                                                        disabled={!isEditable}
                                                                                        type='text'
                                                                                        size={'xs'}
                                                                                        name={`termsConditions.${value}`}
                                                                                        className='h-auto p-0 border-none outline-none ring-0 rounded-none'
                                                                                        placeholder='Enter terms & conditions'
                                                                                        component={Input}
                                                                                    />
                                                                                </Td>
                                                                                {(negotiation as any)?.termsConditions && (
                                                                                    <Td className='border-l border-l-slate-400/80'>{(negotiation as any)?.termsConditions?.[value]}</Td>
                                                                                )}
                                                                            </Tr>
                                                                        ))}
                                                                </TBody>
                                                            </Table>
                                                        </div>
                                                    </div>
                                                </TabContent>

                                                <TabContent value={tabs[2]}>
                                                    <div className='flex flex-col overflow-hidden rounded-md border border-slate-200 xl:flex-row'>
                                                        <div className='w-full min-w-0 xl:w-2/5'>
                                                            <AttachmentsTable
                                                                id={(values as any)?._id || 'uploaded'}
                                                                info='Uploaded'
                                                                isSmall={true}
                                                                attachments={(values as any).attachments || []}
                                                            />
                                                            <AttachmentsTable
                                                                id={(rfq as any)?._id || 'rfq'}
                                                                info='RFQ'
                                                                isSmall={true}
                                                                attachments={(rfq as any)?.attachments || []}
                                                            />
                                                        </div>

                                                        <div className='h-px bg-slate-200 xl:h-auto xl:w-px' />

                                                        <div className='w-full min-w-0 xl:w-3/5'>
                                                            <AttachmentsTable
                                                                id={(formValues as any)?._id || 'selected'}
                                                                info='Selected'
                                                                isEditable={isEditable}
                                                                attachments={(values as any).attachments || []}
                                                                setValues={setValues}
                                                            />
                                                        </div>
                                                    </div>
                                                </TabContent>

                                                <TabContent value={tabs[3]}>
                                                    <div className='flex flex-col overflow-hidden rounded-md border border-slate-200 xl:flex-row'>
                                                        <div className='w-full min-w-0 xl:w-1/2'>
                                                            <Table compact className='text-xs' containerClassName='w-full'>
                                                                <THead className='sticky top-0'>
                                                                    <Tr>
                                                                        <Th>Contact Us</Th>
                                                                        <Th></Th>
                                                                    </Tr>
                                                                </THead>
                                                                <TBody>
                                                                    <Tr>
                                                                        <Td>Contact Person</Td>
                                                                        <Td className='opacity-80'>{(rfq as any)?.contactPersonName}</Td>
                                                                    </Tr>
                                                                    <Tr>
                                                                        <Td>Contact Number</Td>
                                                                        <Td className='opacity-80'>{(rfq as any)?.contactNumber}</Td>
                                                                    </Tr>
                                                                    <Tr>
                                                                        <Td>Email</Td>
                                                                        <Td className='opacity-80'>{(rfq as any)?.contactEmail}</Td>
                                                                    </Tr>
                                                                </TBody>
                                                            </Table>
                                                        </div>

                                                        <div className='h-px bg-slate-200 xl:h-auto xl:w-px' />

                                                        <div className='w-full min-w-0 xl:w-1/2'>
                                                            <Table compact className='text-xs' containerClassName='w-full'>
                                                                <THead className='sticky top-0'>
                                                                    <Tr>
                                                                        <Th>Your Contact Details</Th>
                                                                        <Th></Th>
                                                                    </Tr>
                                                                </THead>
                                                                <TBody>
                                                                    <Tr>
                                                                        <Td>Contact Person</Td>
                                                                        <Td>
                                                                            <Field
                                                                                disabled={!isEditable}
                                                                                type='text'
                                                                                size={'xs'}
                                                                                name={`contactPersonName`}
                                                                                className='h-auto p-0 border-none outline-none ring-0 rounded-none'
                                                                                placeholder='Type here'
                                                                                required={false}
                                                                                component={Input}
                                                                            />
                                                                        </Td>
                                                                    </Tr>
                                                                    <Tr>
                                                                        <Td>Contact Number</Td>
                                                                        <Td>
                                                                            <Field
                                                                                disabled={!isEditable}
                                                                                type='number'
                                                                                size={'xs'}
                                                                                name={`contactNumber`}
                                                                                className='h-auto p-0 border-none outline-none ring-0 rounded-none'
                                                                                placeholder='Type here'
                                                                                maxLength={10}
                                                                                component={Input}
                                                                                required={false}
                                                                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                                                    e.target.value?.length <= 10 ? setFieldValue(e.target.name, e.target.value) : null
                                                                                }
                                                                            />
                                                                        </Td>
                                                                    </Tr>
                                                                    <Tr>
                                                                        <Td>Email</Td>
                                                                        <Td>
                                                                            <Field
                                                                                disabled={!isEditable}
                                                                                type='email'
                                                                                size={'xs'}
                                                                                name={`contactEmail`}
                                                                                className='h-auto p-0 border-none outline-none ring-0 rounded-none'
                                                                                placeholder='Type here'
                                                                                component={Input}
                                                                                required={false}
                                                                            />
                                                                        </Td>
                                                                    </Tr>
                                                                </TBody>
                                                            </Table>
                                                        </div>
                                                    </div>
                                                </TabContent>
                                            </Tabs>

                                            <div className='mt-4'>
                                                {(negotiation as any)?.items?.length ? (
                                                    <>
                                                        <div className='mt-3 flex items-center gap-2'>
                                                            <MdLabelImportant color='red' className='size-5' />
                                                            <h6 className='mb-0'>Negotiation Items</h6>
                                                        </div>

                                                        <div className='mt-2 min-w-0 overflow-x-auto'>
                                                            <QuotationNegotiation
                                                                negotiation={negotiation as any}
                                                                quotation={formValues as any}
                                                                indents={indents}
                                                                setValues={setValues}
                                                            />
                                                        </div>
                                                    </>
                                                ) : null}

                                                <h6 className='mb-2 mt-3'>Quotation Items</h6>
                                                <div className='min-w-0 overflow-x-auto'>
                                                    <QuotationItemsTable
                                                        isEditable={isEditable}
                                                        indents={indents}
                                                        items={(values as any)?.items}
                                                        values={values as any}
                                                        errors={errors as any}
                                                        setValues={setValues as any}
                                                        setFieldValue={setFieldValue as any}
                                                        handleAmountCalculation={handleAmountCalculation as any}
                                                    />
                                                </div>

                                                <div className='mt-3 min-w-0 overflow-x-auto'>
                                                    <h6 className='mb-2'>Charges</h6>
                                                    <ChargesTable<QuotationType>
                                                        isEditable={isEditable}
                                                        values={values}
                                                        setValues={setValues}
                                                        handleAmountCalculation={handleAmountCalculation}
                                                        negotiation={negotiation as any}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </FormContainer>
                                </Form>
                            )
                        }}
                    </Formik>
                </div>
            </Loading>

            <ConfirmDialog
                isOpen={!!flags?.deleteDialog}
                type='danger'
                title='Delete Quotation'
                confirmText='Delete'
                cancelText='Cancel'
                confirmButtonColor='red'
                loading={flags?.deleting}
                closable={!false}
                onCancel={() => setFlags({})}
                onConfirm={handleDelete}
            >
                Are you sure you want to delete this quotation? This action cannot be undone.
            </ConfirmDialog>

            <ConfirmDialog
                isOpen={!!flags?.regretDialog}
                type='danger'
                title='Mark As Regret'
                confirmText='Mark As Regret'
                cancelText='Cancel'
                confirmButtonColor='red'
                loading={flags?.regretDialog === 'inprogress'}
                closable={!false}
                onCancel={() => setFlags({})}
                onConfirm={handleRegretMarking}
            >
                Are you sure you want to mark this request as regret? This action cannot be undone.
            </ConfirmDialog>
        </div>
    )
}