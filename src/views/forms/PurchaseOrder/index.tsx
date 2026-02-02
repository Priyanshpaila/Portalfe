import { ChangeEvent, useEffect, useState } from 'react'
import { Field, FieldProps, Form, Formik, FormikHelpers, getIn, setIn } from 'formik'

import { Button, DatePicker, FormContainer, FormItem, Input, Select, Tabs } from '@/components/ui'
import TabContent from '@/components/ui/Tabs/TabContent'
import TabList from '@/components/ui/Tabs/TabList'
import TabNav from '@/components/ui/Tabs/TabNav'
import Indents from '@/components/app/Indents'
import ChargesTable from '@/components/app/ChargesTable'
import { AttachmentsTable } from '@/components/app/Attachments'
import ApiService from '@/services/ApiService'
import { chargeOnOptions, companies, divisons, getIndentID, refDocumentTypes } from '@/utils/data'
import { IndentType, OptionType, POItem, POType, TaxChargeType, VendorType } from '@/@types/app'

import POItemsTable from './POItemsTable'
import Authorize from './Authorize'
import PaymentTerms from './PaymentTerms'
import TermsAndConditions from '../../../components/app/TermsAndConditions'
import TaxDetails from './TaxDetails'
import { freightRates, freightTypes, paymentModes, priorities } from '@/utils/constants'
import POQuotationsList from './POQuotationsList'
import { MdOpenInNew, MdOutlineList } from 'react-icons/md'
import { FaPlus } from 'react-icons/fa'
import TaxModal from './TaxModal'
import { handleAmountCalculation, handleItemAmount } from '@/utils/amountCalculation'
import useQuery from '@/utils/hooks/useQuery'
import { showAlert, showError, showWarning } from '@/utils/hoc/showAlert'
import { ConfirmDialog, Loading } from '@/components/shared'
import { useNavigate } from 'react-router-dom'
import classNames from 'classnames'
import { isEqual } from 'lodash'
import CSModal from '@/components/app/CSModal'

const initialValues: POType = {
    poNumber: '',
    sapPONumber: '',
    amendNumber: '',
    vendorCode: '',
    readyForAuthorization: false,
    taxDetails: [],
    poDate: new Date(),
    company: '',
    division: '',
    purchaseType: '',
    refDocumentType: '',
    refDocumentNumber: '',
    vendorName: '',
    vendorLocation: '',
    contactPersonName: '',
    serialNumber: '',
    validityDate: new Date(new Date().setUTCHours(7 * 23, 59, 59, 999)),
    departmentName: '',
    remarks: '',

    shippingAccount: {
        paymentMode: '',
        freightType: '',
        freightRate: '',
        freightAmount: '',
        priority: '',
        fromLocation: '',
        toLocation: '',
        shippingAddress: '',
        defineTransportationRoute: '',
    },

    amount: {
        basic: 0,
        discount: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        otherCharges: 0,
        total: 0,
    },

    items: [],
    paymentTerms: [],
    authorize: [],
    termsConditions: {},
    attachments: [],

    file: [],
}

const tabs = ['General Information', 'Indent Details', 'Shipping & Account', 'Tax Details', 'Terms & Condition', 'Payment Terms', 'Authorize', 'Attachments']
const purchaseTypes = [{ label: 'General', value: 'general' }]

export default function PurchaseOrder() {
    const query = useQuery()
    const poNumber = query.get('poNumber') || ''
    const navigate = useNavigate()

    const [tab, setTab] = useState(tabs[0])
    const [flags, setFlags] = useState<{
        loading?: boolean
        csModal?: boolean
        taxModal?: boolean
        deleteWarning?: boolean
        deleting?: boolean
        amendWarning?: boolean
    }>({})
    const [indents, setIndents] = useState<IndentType[]>([])
    const [indentSelection, setIndentSelection] = useState<{ [id: string]: boolean }>({})
    const [vendors, setVendors] = useState<VendorType[]>([])
    const [formValues, setFormValues] = useState<POType>(initialValues)
    const [poBackupItems, setPOBackupItems] = useState<POItem[]>([])
    const [amendState, setAmendState] = useState(false)

    useEffect(() => {
        const fetchVendors = async () => {
            try {
                const response = await ApiService.fetchData<VendorType[]>({
                    method: 'get',
                    url: '/vendor/list',
                })
                setVendors(response.data)
            } catch (error) {
                console.error(error)
            }
        }

        fetchVendors()
    }, [])

    const fetchIndents = async (items?: Pick<POItem, 'indentNumber' | 'itemCode' | 'qty'>[], shouldFilterIndents = false) => {
        try {
            const response = await ApiService.fetchData<IndentType[]>({
                method: 'post',
                url: '/indent/list',
                data: {
                    items: items?.map((i) => ({ indentNumber: i.indentNumber, itemCode: i.itemCode })),
                    shouldFilterIndents,
                },
            })

            const qtyMap: { [id: string]: number } = items?.reduce((obj, i) => ({ ...obj, [getIndentID(i)]: i.qty }), {}) || {}

            setIndents(
                !items?.length
                    ? response.data
                    : response.data.map((i) => {
                          if (!qtyMap[i.id]) return i
                          return {
                              ...i,
                              prePOQty: i.prePOQty - (poNumber ? qtyMap[i.id] : 0),
                              balanceQty: (i.balanceQty || 0) + qtyMap[i.id],
                          }
                      }),
            )
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        setFlags({ loading: true })
        if (!poNumber) {
            ;(async () => {
                try {
                    const response = await ApiService.fetchData<{ poNumber: string }>({
                        method: 'get',
                        url: '/po/poNumber',
                    })

                    setFormValues({ ...initialValues, poNumber: response?.data?.poNumber })
                } catch (error) {
                    console.error(error)
                }
            })()

            setTab(tabs[0])
            setFlags({})
            setIndents([])
            setIndentSelection({})
            return
        }
        ;(async () => {
            try {
                const response = await ApiService.fetchData<POType>({
                    method: 'get',
                    url: '/po',
                    params: { poNumber },
                })

                setPOBackupItems(response.data.items)
                setFormValues({ ...response.data, _readyForAuthorization: response.data?.readyForAuthorization })
                fetchIndents(response.data?.items, response.data?.refDocumentType === refDocumentTypes[0].value)
                setIndentSelection(response.data.items.reduce((obj, i) => ({ ...obj, [getIndentID(i)]: true }), {}))
            } catch (error) {
                const message = 'Failed to load PO, please try again or contact support.'
                if (error.response.status !== 500) showError(error?.response?.data?.message || message)
            }
            setFlags({})
        })()
    }, [poNumber])

    const handleSubmit = async (_values: POType, helpers: FormikHelpers<POType>) => {
        const { file = [], ...values } = _values
        if (!checkUnsavedChanges(_values)) return showError('There are no changes to save!')

        let errors: { [x: string]: boolean } = {}
        if (values?.amendNumber && !values?.amendRemarks?.length) errors = setIn(errors, `amendRemarks`, true)
        if (!values.refDocumentType) errors.refDocumentType = true
        if (!values.company) errors.company = true
        if (!values.vendorCode) errors.vendorCode = true
        if (!values.shippingAccount?.freightType) errors = setIn(errors, `shippingAccount[freightType]`, true)

        if (values?.items)
            for (let i = 0; i < values.items.length; i++) {
                const item = values.items[i]
                if (!item.qty || +item.qty <= 0) errors = setIn(errors, `items[${i}].qty`, true)
                if (!item.schedule) errors = setIn(errors, `items[${i}].schedule`, true)
                if (!(+item.rate > 0)) errors = setIn(errors, `items[${i}].rate`, true)
            }

        helpers.setErrors(errors)

        if (!values.items?.[0]) return showError('Atleast one item must be selected.')
        if (!values.paymentTerms?.length) return showError('Payment terms must be added.')
        else if (Object.keys(errors)?.[0]) return showError('Please fill all the required data.')

        setFlags({ loading: true })

        try {
            const _id = formValues?._id
            const formData = new FormData()
            values.readyForAuthorization = !!values?._readyForAuthorization
            formData.append('data', JSON.stringify(values))
            for (const i of file) formData.append('file', i)

            const response = await ApiService.fetchData<{ errorMessage?: string }, FormData>({
                method: _id ? 'PUT' : 'POST',
                url: '/po' + (_id ? `/${_id}` : ''),
                headers: { 'Content-Type': 'multipart/form-data' },
                data: formData,
            })

            if (response?.data?.errorMessage) showWarning(response?.data?.errorMessage)
            else showAlert('Saved purchase order successfully.')
            navigate('/purchase-orders')
        } catch (error) {
            const message = 'Failed to save purchase order. Please contact support.'
            if (error?.response?.status === 500) showError(message)
            else showError(error?.response?.data?.message || message)
            setFlags({})
        }
    }

    const handleDocTypeChange = (option: OptionType, setValues: FormikHelpers<POType>['setValues']) => {
        if (option.value === refDocumentTypes[0].value) {
            setValues((prev) => {
                fetchIndents(prev?.items, true)
                return handleAmountCalculation({
                    ...prev,
                    taxDetails: [],
                    refDocumentType: option.value as string,
                    items: [],
                })
            })

            return
        }

        setValues((prev) => {
            fetchIndents(prev?.items)
            return {
                ...prev,
                refDocumentType: option.value as string,
                refDocumentNumber: undefined,
                refCSNumber: undefined,
                refCSDate: undefined,
            }
        })
    }

    const applyTax = (state: POType, taxDetail: TaxChargeType) => {
        let updatedState = { ...state }

        if (taxDetail.chargeOn === chargeOnOptions[1].value) {
            updatedState.items = (updatedState.items || []).map((item) =>
                handleItemAmount({
                    ...item,
                    taxDetails: (item.taxDetails || []).concat(taxDetail),
                }),
            )
        } else {
            updatedState.taxDetails = (updatedState.taxDetails || []).concat(taxDetail)
        }

        updatedState = handleAmountCalculation(updatedState)

        return updatedState
    }

    const indentToItem = (val: IndentType, isPurchaseRequest?: boolean, taxDetails?: POType['taxDetails']): POItem => {
        let item
        if (poBackupItems?.length > 0 && isPurchaseRequest) item = poBackupItems?.find((i) => getIndentID(i) === getIndentID(val))
        if (!item)
            item = {
                indentNumber: val.indentNumber,
                itemCode: val.itemCode,
                itemDescription: val.itemDescription,
                qty: +val.balanceQty || 0,
                originalQty: +val.balanceQty || 0,

                rate: 1,
                amount: {
                    basic: +val.balanceQty || 0,
                    taxable: +val.balanceQty || 0,
                    discount: 0,
                    igst: 0,
                    sgst: 0,
                    cgst: 0,
                    total: +val.balanceQty || 0,
                },

                unit: val.unitOfMeasure || '',
                make: val.make || '',
                techSpec: val.techSpec || '',
                schedule: '',
                hsnCode: '',
                remarks: '',
            }

        return handleItemAmount({ ...item, taxDetails })
    }

    const handleDelete = async () => {
        if (!formValues?._id) return
        try {
            setFlags({ loading: true })

            await ApiService.fetchData({
                method: 'DELETE',
                url: '/po/' + formValues?._id,
                headers: { 'Content-Type': 'multipart/form-data' },
            })

            showAlert('PO deleted successfully.')
            navigate('/purchase-orders')
        } catch (error) {
            const message = 'Failed to delete purchase order. Please contact support.'
            if (error?.response?.status === 500) showError(message)
            else showError(error?.response?.data?.message || message)
            setFlags({})
        }
    }

    const checkUnsavedChanges = ({ authorize: a, ...values }: POType) => {
        const { authorize: b, ..._formValues } = formValues
        return !isEqual(values, _formValues)
    }

    const isEditable = !formValues?._id || !formValues?.authorize?.length || formValues?.authorize?.some((i) => i.approvalStatus !== 1) || amendState

    return (
        <Loading type='cover' loading={flags?.loading}>
            <title>Purchase Order</title>
            <Formik enableReinitialize={true} initialValues={formValues} onSubmit={handleSubmit}>
                {({ values, setFieldValue, setValues, errors }) => {
                    const isPurchaseRequest = values.refDocumentType === refDocumentTypes[1].value
                    return (
                        <Form className='px-1 mt-3'>
                            <FormContainer>
                                <Tabs variant='underline' value={tab} onChange={setTab}>
                                    <TabList>
                                        {tabs.map((i) => (
                                            <TabNav key={i} className='pt-0 px-2' value={i}>
                                                <span className='text-xs'>{i}</span>
                                            </TabNav>
                                        ))}
                                        <TabNav disabled className='p-0 opacity-100 cursor-auto flex-1 justify-end gap-1' value='actions'>
                                            {isEditable ? (
                                                <Button type='submit' variant='solid' size='xs'>
                                                    Save
                                                </Button>
                                            ) : (
                                                <Button type='button' variant='twoTone' size='xs' onClick={() => setFlags({ amendWarning: true })}>
                                                    Edit
                                                </Button>
                                            )}
                                            {formValues?._id && (
                                                <Button type='button' variant='solid' size='xs' color='red' onClick={() => setFlags({ deleteWarning: true })}>
                                                    Delete
                                                </Button>
                                            )}
                                        </TabNav>
                                    </TabList>
                                    <TabContent value={tabs[0]} className='text-xs'>
                                        <div className='flex gap-2 items-end w-full mt-2'>
                                            <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='SAP PO Number'>
                                                <Field
                                                    disabled={!isEditable}
                                                    type='text'
                                                    name='sapPONumber'
                                                    component={Input}
                                                    className='px-1 py-1.5'
                                                    size={'xs'}
                                                    value={values.sapPONumber}
                                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue(e.target.name, e.target.value)}
                                                />
                                            </FormItem>
                                            <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Document PO Number'>
                                                <Field
                                                    disabled
                                                    type='text'
                                                    name='poNumber'
                                                    component={Input}
                                                    className='px-1 py-1.5'
                                                    size={'xs'}
                                                    value={values.poNumber}
                                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue(e.target.name, e.target.value)}
                                                />
                                            </FormItem>
                                            <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Amend No'>
                                                <Field
                                                    disabled
                                                    type='text'
                                                    name='amendNumber'
                                                    component={Input}
                                                    className='px-1 py-1.5 w-15'
                                                    size={'xs'}
                                                    value={values.amendNumber}
                                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue(e.target.name, e.target.value)}
                                                />
                                            </FormItem>
                                            <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Document Date'>
                                                <Field
                                                    disabled
                                                    type='text'
                                                    name='documentDate'
                                                    component={DatePicker}
                                                    inputFormat='DD/MM/YYYY'
                                                    size={'xs'}
                                                    value={values.poDate || null}
                                                    onChange={(newDate: Date) => setFieldValue('documentDate', newDate)}
                                                />
                                            </FormItem>
                                            <FormItem asterisk className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Company'>
                                                <div className='flex gap-0.5 items-end'>
                                                    <FormItem className='mb-0'>
                                                        <Field name='company'>
                                                            {({ field, form }: FieldProps<POType>) => {
                                                                return (
                                                                    <Select
                                                                        field={field}
                                                                        form={form}
                                                                        isDisabled={!isEditable}
                                                                        getOptionLabel={(option) => option?.companyName}
                                                                        getOptionValue={(option) => option?.plantCode}
                                                                        options={companies}
                                                                        className='w-60'
                                                                        size={'xs'}
                                                                        value={companies.find((i) => i.plantCode?.toString() === values.company?.toString())}
                                                                        onChange={(option) => form.setFieldValue(field.name, option?.plantCode)}
                                                                    />
                                                                )
                                                            }}
                                                        </Field>
                                                    </FormItem>
                                                    <Button
                                                        disabled={!isEditable}
                                                        type='button'
                                                        variant='twoTone'
                                                        size='xs'
                                                        icon={<MdOutlineList size={16} />}
                                                        onClick={() => setFlags({ csModal: true })}
                                                    />
                                                </div>
                                            </FormItem>
                                            {values.refCSNumber && (
                                                <CSModal
                                                    csNumber={values.refCSNumber}
                                                    customButton={({ onClick }) => (
                                                        <Button type='button' variant='twoTone' size='xs' icon={<MdOpenInNew size={16} />} onClick={onClick}>
                                                            View CS
                                                        </Button>
                                                    )}
                                                />
                                            )}
                                        </div>
                                        <div className='flex gap-2 items-end w-full mt-2'>
                                            <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Division'>
                                                <Field
                                                    isDisabled={!isEditable}
                                                    name='division'
                                                    component={Select}
                                                    className='w-40'
                                                    size={'xs'}
                                                    options={divisons}
                                                    value={divisons.find((i) => i.value === values.division)}
                                                    onChange={(option: OptionType) => setFieldValue('division', option.value)}
                                                />
                                            </FormItem>
                                            <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Purchase Type'>
                                                <Field
                                                    isDisabled={!isEditable}
                                                    name='purchaseType'
                                                    component={Select}
                                                    className='w-40'
                                                    options={purchaseTypes}
                                                    size={'xs'}
                                                    value={purchaseTypes.find((i) => i.value === values.purchaseType)}
                                                    onChange={(option: OptionType) => setFieldValue('purchaseType', option.value)}
                                                />
                                            </FormItem>
                                            <FormItem asterisk className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Ref. Document Type'>
                                                <Field
                                                    isDisabled={!isEditable}
                                                    name='refDocumentType'
                                                    component={Select}
                                                    options={refDocumentTypes}
                                                    className='w-50'
                                                    size={'xs'}
                                                    value={refDocumentTypes.find((i) => i.value === values.refDocumentType)}
                                                    onChange={(option: OptionType) => handleDocTypeChange(option, setValues)}
                                                />
                                            </FormItem>
                                            <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Ref. Document Number'>
                                                <Field
                                                    disabled
                                                    type='text'
                                                    name='refDocumentNumber'
                                                    component={Input}
                                                    className='px-1 py-1.5'
                                                    size={'xs'}
                                                    value={values.refDocumentNumber}
                                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue(e.target.name, e.target.value)}
                                                />
                                            </FormItem>
                                            <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Serial Number'>
                                                <Field
                                                    isDisabled={!isEditable}
                                                    name='serialNumber'
                                                    component={Select}
                                                    className='w-40'
                                                    size={'xs'}
                                                    value={values.serialNumber}
                                                    onChange={(option: OptionType) => setFieldValue('serialNumber', option.value)}
                                                />
                                            </FormItem>
                                            <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Validity Date'>
                                                <Field
                                                    disabled={!isEditable}
                                                    name='validityDate'
                                                    component={DatePicker}
                                                    inputFormat='DD/MM/YYYY'
                                                    clearable={false}
                                                    size={'xs'}
                                                    value={values.validityDate || null}
                                                    onChange={(newDate: Date) => setFieldValue('validityDate', newDate)}
                                                />
                                            </FormItem>
                                        </div>
                                        <div className='flex gap-2 items-end w-full mt-2'>
                                            <FormItem asterisk className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Vendor Name'>
                                                <Field
                                                    type='text'
                                                    name='vendorCode'
                                                    component={Select}
                                                    options={vendors}
                                                    getOptionLabel={(option: VendorType) => option.name || option.vendorCode}
                                                    getOptionValue={(option: VendorType) => option.vendorCode.toString()}
                                                    isDisabled={!isPurchaseRequest || !isEditable}
                                                    className='w-50'
                                                    size={'xs'}
                                                    value={vendors.find((i) => i.vendorCode?.toString() === values.vendorCode?.toString())}
                                                    onChange={(option: VendorType) =>
                                                        setValues((prev) => ({
                                                            ...prev,
                                                            vendorCode: option.vendorCode?.toString(),
                                                            vendorName: option.name?.toString(),
                                                            vendorLocation: option.street || option.street2,
                                                            vendorContacts: option.contactPerson?.map((i) => ({
                                                                name: `${i.name} (${i.email})`,
                                                                value: i.name,
                                                            })),
                                                            contactPersonName: '',
                                                        }))
                                                    }
                                                />
                                            </FormItem>
                                            <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Vendor Location'>
                                                <Field
                                                    disabled={true}
                                                    type='text'
                                                    name='vendorLocation'
                                                    component={Input}
                                                    className='px-1 py-1.5 w-50'
                                                    size={'xs'}
                                                    value={values.vendorLocation}
                                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue(e.target.name, e.target.value)}
                                                />
                                            </FormItem>
                                            <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Contact Person Name'>
                                                <Field
                                                    type='text'
                                                    name='contactPersonName'
                                                    component={Select}
                                                    disabled={!isPurchaseRequest || !isEditable}
                                                    options={values?.vendorContacts || []}
                                                    className='w-40'
                                                    size={'xs'}
                                                    value={values?.vendorContacts?.find((i) => i.value === values.contactPersonName)}
                                                    onChange={(option: OptionType) => setFieldValue('contactPersonName', option.value)}
                                                />
                                            </FormItem>
                                            <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Department Name'>
                                                <Field
                                                    isDisabled={!isEditable}
                                                    name='departmentName'
                                                    component={Select}
                                                    className='w-50'
                                                    size={'xs'}
                                                    value={values.departmentName}
                                                    onChange={(option: OptionType) => setFieldValue('departmentName', option.value)}
                                                />
                                            </FormItem>
                                        </div>
                                        <div className='flex gap-2 items-end w-full mt-2'>
                                            {isPurchaseRequest && (
                                                <>
                                                    <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Party Ref No'>
                                                        <Field
                                                            disabled={!isEditable}
                                                            name='partyRefNumber'
                                                            component={Input}
                                                            className='w-40'
                                                            size={'xs'}
                                                            value={values.partyRefNumber}
                                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue('partyRefNumber', e.target.value)}
                                                        />
                                                    </FormItem>
                                                    <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Party Ref Date'>
                                                        <Field
                                                            disabled={!isEditable}
                                                            name='partyRefDate'
                                                            component={DatePicker}
                                                            inputFormat='DD/MM/YYYY'
                                                            className='w-40'
                                                            size={'xs'}
                                                            value={values.partyRefDate}
                                                            onChange={(newDate: Date) => setFieldValue('partyRefDate', newDate)}
                                                        />
                                                    </FormItem>
                                                </>
                                            )}
                                        </div>
                                        <div className='flex gap-2'>
                                            <FormItem className='w-full' labelClass='text-[11px] !mb-0.5 mt-2' label='Remarks'>
                                                <Field
                                                    textArea
                                                    disabled={!isEditable}
                                                    type='text'
                                                    name='remarks'
                                                    className={'px-[5px] !h-15 min-h-15 py-1.5 text-xs'}
                                                    component={Input}
                                                    size={'xs'}
                                                    value={values.remarks}
                                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue(e.target.name, e.target.value)}
                                                />
                                            </FormItem>
                                            {values?.amendNumber && (
                                                <FormItem asterisk className='w-full' labelClass='text-[11px] !mb-0.5 mt-2' label='Amend Remarks'>
                                                    <Field name={'amendRemarks'}>
                                                        {({ field, form }: FieldProps<POType>) => {
                                                            const isInvalid = Boolean(getIn(form.errors, field.name))
                                                            return (
                                                                <Field
                                                                    textArea
                                                                    disabled={!isEditable}
                                                                    type='text'
                                                                    name='amendRemarks'
                                                                    className={classNames(
                                                                        'px-[5px] !h-15 min-h-15 py-1.5 text-xs',
                                                                        isInvalid && 'bg-red-50 !border !border-red-500',
                                                                    )}
                                                                    component={Input}
                                                                    size={'xs'}
                                                                    validate={(value: string) => !(!values?.amendNumber || value?.trim?.()?.length > 0)}
                                                                    value={values.amendRemarks}
                                                                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                                        setFieldValue(e.target.name, e.target.value)
                                                                    }
                                                                />
                                                            )
                                                        }}
                                                    </Field>
                                                </FormItem>
                                            )}
                                        </div>
                                    </TabContent>
                                    <TabContent value={tabs[1]}>
                                        <Indents
                                            disabled={!isEditable}
                                            indents={indents}
                                            selection={indentSelection}
                                            handleSelectAll={(selectionFlag) => {
                                                const flags: { [key: string]: boolean } = {}
                                                const items: POItem[] = []

                                                if (selectionFlag)
                                                    for (const i of indents) {
                                                        flags[i.id] = selectionFlag
                                                        items.push(indentToItem(i, isPurchaseRequest, values?.items?.[0]?.taxDetails))
                                                    }

                                                setIndentSelection(flags)
                                                setValues((prev) => handleAmountCalculation({ ...prev, items }))
                                            }}
                                            handleSelection={(val, selectionFlag) => {
                                                setIndentSelection((prev) => ({ ...prev, [val.id as string]: selectionFlag }))
                                                setValues((prev) =>
                                                    handleAmountCalculation({
                                                        ...prev,
                                                        items: selectionFlag
                                                            ? [...(prev.items || []), indentToItem(val, isPurchaseRequest, values?.items?.[0]?.taxDetails)]
                                                            : (prev.items || [])?.filter(
                                                                  (i) => !(i.indentNumber === val.indentNumber && i.itemCode === val.itemCode),
                                                              ),
                                                    }),
                                                )
                                            }}
                                        />
                                    </TabContent>
                                    <TabContent value={tabs[2]}>
                                        <div className='flex gap-2 items-end w-full mt-2 text-xs'>
                                            <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Payment Mode'>
                                                <Field
                                                    isDisabled={!isEditable}
                                                    name='shippingAccount[paymentMode]'
                                                    component={Select}
                                                    options={paymentModes}
                                                    size={'xs'}
                                                    value={paymentModes.find((i) => i.value === values?.shippingAccount?.paymentMode) || null}
                                                    onChange={(option: OptionType) => setFieldValue('shippingAccount[paymentMode]', option.value)}
                                                />
                                            </FormItem>
                                            <FormItem asterisk className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Freight Type'>
                                                <Field name='shippingAccount[freightType]'>
                                                    {({ field, form }: FieldProps<POType>) => {
                                                        return (
                                                            <Select
                                                                field={field}
                                                                form={form}
                                                                isDisabled={!isEditable}
                                                                options={freightTypes}
                                                                size={'xs'}
                                                                className='w-40'
                                                                value={freightTypes.find((i) => i.value === values.shippingAccount?.freightType) || null}
                                                                onChange={(option) => setFieldValue('shippingAccount[freightType]', option?.value)}
                                                            />
                                                        )
                                                    }}
                                                </Field>
                                            </FormItem>
                                            <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Freight Rate'>
                                                <Field
                                                    isDisabled={!isEditable}
                                                    name='shippingAccount[freightRate]'
                                                    component={Select}
                                                    options={freightRates}
                                                    size={'xs'}
                                                    value={freightRates.find((i) => i.value === values.shippingAccount?.freightRate) || null}
                                                    onChange={(option: OptionType) => setFieldValue('shippingAccount[freightRate]', option.value)}
                                                />
                                            </FormItem>
                                            <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Freight Amount'>
                                                <Field
                                                    disabled={!isEditable}
                                                    type='text'
                                                    name='shippingAccount[freightAmount]'
                                                    component={Input}
                                                    className='px-1 py-1.5'
                                                    size={'xs'}
                                                    value={values.shippingAccount?.freightAmount}
                                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue(e.target.name, e.target.value)}
                                                />
                                            </FormItem>
                                            <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Priority'>
                                                <Field
                                                    isDisabled={!isEditable}
                                                    name='shippingAccount[priority]'
                                                    component={Select}
                                                    options={priorities}
                                                    size={'xs'}
                                                    value={priorities.find((i) => i.value === values.shippingAccount?.priority) || null}
                                                    onChange={(option: OptionType) => setFieldValue('shippingAccount[priority]', option.value)}
                                                />
                                            </FormItem>
                                        </div>
                                        <div className='flex gap-2 items-end w-full mt-2'>
                                            <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='From Location'>
                                                <Field
                                                    disabled={!isEditable}
                                                    type='text'
                                                    name='shippingAccount[fromLocation]'
                                                    component={Input}
                                                    className='px-1 py-1.5'
                                                    size={'xs'}
                                                    value={values.shippingAccount?.fromLocation}
                                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue(e.target.name, e.target.value)}
                                                />
                                            </FormItem>
                                            <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='To Location'>
                                                <Field
                                                    disabled={!isEditable}
                                                    type='text'
                                                    name='shippingAccount[toLocation]'
                                                    component={Input}
                                                    className='px-1 py-1.5'
                                                    size={'xs'}
                                                    value={values.shippingAccount?.toLocation}
                                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue(e.target.name, e.target.value)}
                                                />
                                            </FormItem>
                                            <FormItem className='!mb-0' labelClass='text-[11px] !mb-0.5' label='Shipping Address'>
                                                <Field
                                                    disabled={!isEditable}
                                                    type='text'
                                                    name='shippingAccount[shippingAddress]'
                                                    component={Input}
                                                    className='px-1 py-1.5'
                                                    size={'xs'}
                                                    value={values.shippingAccount?.shippingAddress}
                                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue(e.target.name, e.target.value)}
                                                />
                                            </FormItem>
                                            <label className='!mb-0 flex items-center py-1.5 ml-2 cursor-pointer select-none'>
                                                <Field
                                                    disabled={!isEditable}
                                                    type='checkbox'
                                                    name='shippingAccount[defineTransportationRoute]'
                                                    className='size-4'
                                                    size={'xs'}
                                                    checked={values.shippingAccount?.defineTransportationRoute}
                                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue(e.target.name, e.target.checked)}
                                                />
                                                <span className='text-xs inline-block pl-2'>Define Transportation Route</span>
                                            </label>
                                        </div>
                                    </TabContent>
                                    <TabContent value={tabs[3]}>
                                        <div className='flex gap-2 w-full'>
                                            <div className='w-full'>
                                                <div className='mt-2 mb-1 flex justify-between'>
                                                    <span className='font-semibold'>Tax Details</span>
                                                    {isPurchaseRequest && (
                                                        <Button
                                                            type='button'
                                                            variant='twoTone'
                                                            size='xs'
                                                            icon={<FaPlus size={10} />}
                                                            disabled={!values.items?.length || !isEditable}
                                                            onClick={() => setFlags({ taxModal: true })}>
                                                            Add
                                                        </Button>
                                                    )}
                                                </div>
                                                <TaxDetails isPurchaseRequest={isPurchaseRequest} state={values} setValues={setValues} />
                                            </div>
                                            <div className='w-full'>
                                                <span className='inline-block mb-1 mt-2 font-semibold'>Other Charges</span>
                                                <ChargesTable<POType>
                                                    isEditable={isPurchaseRequest && isEditable}
                                                    values={values}
                                                    setValues={setValues}
                                                    handleAmountCalculation={(data) => handleAmountCalculation(data)?.amount}
                                                />
                                            </div>
                                        </div>
                                        <div className='flex flex-col w-1/3 ml-auto my-2 py-2 px-3 border border-slate-200 text-xs'>
                                            <div className='flex justify-between items-center'>
                                                <span className='font-semibold'>Basic</span>
                                                <span>{values.amount?.basic}</span>
                                            </div>
                                            <div className='flex justify-between items-center'>
                                                <span className='font-semibold'>Discount</span>
                                                <span>{values.amount?.discount}</span>
                                            </div>
                                            <div className='flex justify-between items-center'>
                                                <span className='font-semibold'>Total Tax</span>
                                                <span>{(+values.amount?.igst || (+values.amount?.cgst || 0) + (+values.amount?.sgst || 0)).toFixed(2)}</span>
                                            </div>
                                            <div className='flex justify-between items-center'>
                                                <span className='font-semibold'>Other Charges</span>
                                                <span>{values.amount?.otherCharges}</span>
                                            </div>
                                            <div className='flex justify-between items-center'>
                                                <span className='font-semibold'>Net Amount</span>
                                                <span>{values.amount?.total}</span>
                                            </div>
                                        </div>
                                    </TabContent>
                                    <TabContent value={tabs[4]}>
                                        <TermsAndConditions isEditable={isEditable} termsConditions={values.termsConditions} setFieldValue={setFieldValue} />
                                    </TabContent>
                                    <TabContent value={tabs[5]}>
                                        <PaymentTerms values={values} setFieldValue={setFieldValue} setValues={setValues} />
                                    </TabContent>
                                    <TabContent value={tabs[6]}>
                                        <Authorize
                                            values={values}
                                            setValues={setValues}
                                            setFieldValue={setFieldValue}
                                            checkUnsavedChanges={checkUnsavedChanges}
                                            updateAuthorize={(authorize) => setFormValues((prev) => ({ ...prev, authorize }) as POType)}
                                        />
                                    </TabContent>
                                    <TabContent value={tabs[7]}>
                                        <span className='font-semibold inline-block my-2'>PO Attachments</span>
                                        <div className='flex gap-2'>
                                            <div className='w-full'>
                                                <AttachmentsTable<POType>
                                                    id={values?._id || 'uploaded'}
                                                    info='Uploaded'
                                                    isSmall={true}
                                                    attachments={values.attachments || []}
                                                />
                                            </div>
                                            <div className='w-full'>
                                                <AttachmentsTable<POType>
                                                    id={values?._id || 'selected'}
                                                    info='Selected'
                                                    isEditable={true}
                                                    isDisabled={!isEditable}
                                                    attachments={values.attachments || []}
                                                    setValues={setValues}
                                                />
                                            </div>
                                        </div>
                                        <span className='font-semibold inline-block mb-2 mt-4'>Other Attachments</span>
                                        <div className='flex gap-2'>
                                            <div className='w-full'>
                                                <h6 className='text-[10.5px] font-bold opacity-65 mb-1' style={{ textTransform: 'uppercase' }}>
                                                    RFQ
                                                </h6>
                                                {/* <AttachmentsTable<POType> key={'rfq'} id={'rfq'} /> */}
                                            </div>
                                            <div className='w-full'>
                                                <h6 className='text-[10.5px] font-bold opacity-65 mb-1' style={{ textTransform: 'uppercase' }}>
                                                    Quotation
                                                </h6>
                                                {/* <AttachmentsTable<POType> key={'quotation'} id={'quotation'} /> */}
                                            </div>
                                        </div>
                                    </TabContent>
                                </Tabs>
                                <div className='mt-1'>
                                    <POItemsTable
                                        isEditable={isEditable}
                                        isPurchaseRequest={isPurchaseRequest}
                                        items={values.items?.filter((i) => indentSelection[getIndentID(i)]) || []}
                                        values={values}
                                        errors={errors}
                                        setValues={setValues}
                                        setFieldValue={setFieldValue}
                                    />
                                </div>
                            </FormContainer>
                            <TaxModal
                                isOpen={Boolean(flags?.taxModal)}
                                onClose={() => setFlags({})}
                                onSubmit={(taxState) => {
                                    setFlags({})
                                    setValues((prev) => applyTax(prev, taxState))
                                }}
                            />
                            <POQuotationsList
                                isOpen={Boolean(flags?.csModal)}
                                onClose={() => setFlags({})}
                                onSubmit={(data) => {
                                    setFlags({})
                                    fetchIndents(data?.items, true)
                                    setIndentSelection(data.items.reduce((obj, i) => ({ ...obj, [getIndentID(i)]: true }), {}))
                                    setPOBackupItems(data.items)
                                    setValues((prev) => ({
                                        ...prev,
                                        ...data,
                                        purchaseType: purchaseTypes[0].value,
                                        refDocumentType: refDocumentTypes[0].value,
                                        vendorContacts: vendors
                                            .find((i) => i.vendorCode === data.vendorCode)
                                            ?.contactPerson?.map((i) => ({ label: `${i.name} (${i.email})`, value: i.name })),
                                        contactPersonName: '',
                                    }))
                                }}
                            />
                        </Form>
                    )
                }}
            </Formik>

            <ConfirmDialog
                isOpen={!!flags?.deleteWarning}
                type='danger'
                title='Delete Purchase Order'
                confirmText='Delete'
                cancelText='Cancel'
                confirmButtonColor='red'
                loading={flags?.deleting}
                closable={false}
                onCancel={() => setFlags({})}
                onConfirm={handleDelete}>
                Are you sure you want to delete this purchaser order? This action cannot be undone.
            </ConfirmDialog>
            <ConfirmDialog
                isOpen={!!flags?.amendWarning}
                type='info'
                title='Amend Purchase Order'
                confirmText='Continue'
                cancelText='Cancel'
                closable={false}
                onCancel={() => setFlags({})}
                onConfirm={() => {
                    setFormValues((prev) => ({ ...prev, amendNumber: +(prev.amendNumber || 0) + 1, readyForAuthorization: false }))
                    setAmendState(true)
                    setFlags({})
                }}>
                The purchase order has been approved. In order to edit the po, please confirm to amend.
            </ConfirmDialog>
        </Loading>
    )
}
