import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button, FormContainer, FormItem, Input, Spinner } from '@/components/ui'
import ApiService from '@/services/ApiService'
import { Field, Form, Formik, FormikHelpers, FieldArray } from 'formik'
import { showAlert, showError } from '@/utils/hoc/showAlert'

type ActiveTab = 'indent' | 'vendor'

type ItemMasterFormValues = {
    itemCode: string
    itemDescription: string
    techSpec: string
    make: string
    unitOfMeasure: string
}

type VendorContactPerson = {
    name: string
    email: string
    mobilePhoneIndicator?: string
    fullPhoneNumber?: string
    callerPhoneNumber?: string
}

type VendorFormValues = {
    countryKey?: string
    name: string
    name1?: string
    name2?: string
    name3?: string
    name4?: string
    city?: string
    district?: string
    poBox?: string
    poBoxPostalCode?: string
    postalCode?: string
    creationDate?: string
    sortField?: string
    streetHouseNumber?: string
    panNumber?: string
    msme?: string
    gstin?: string
    orgName1?: string
    orgName2?: string
    companyCode?: string
    cityPostalCode?: string
    street?: string
    street2?: string
    street3?: string
    street4?: string
    street5?: string
    languageKey?: string
    region?: string
    contactPerson: VendorContactPerson[]
}

const ADD_ITEM_URL = '/indent/add-item'
const ADD_VENDOR_URL = '/vendor'

const initialIndentValues: ItemMasterFormValues = {
    itemCode: '',
    itemDescription: '',
    techSpec: '',
    make: '',
    unitOfMeasure: '',
}

const initialVendorValues: VendorFormValues = {
    name: '',
    countryKey: '',
    city: '',
    district: '',
    street: '',
    postalCode: '',
    panNumber: '',
    gstin: '',
    msme: '',
    companyCode: '',
    region: '',
    languageKey: '',
    contactPerson: [
        {
            name: '',
            email: '',
            mobilePhoneIndicator: '',
            fullPhoneNumber: '',
            callerPhoneNumber: '',
        },
    ],
}

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(' ')
}

function SectionHeader({
    title,
    subtitle,
    right,
}: {
    title: string
    subtitle?: string
    right?: React.ReactNode
}) {
    return (
        <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
            <div>
                <div className='text-lg font-semibold'>{title}</div>
                {subtitle ? <div className='text-sm opacity-70'>{subtitle}</div> : null}
            </div>
            {right ? <div className='mt-2 sm:mt-0'>{right}</div> : null}
        </div>
    )
}

function Card({ children }: { children: React.ReactNode }) {
    return (
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>
            {children}
        </div>
    )
}

function CardBody({ children }: { children: React.ReactNode }) {
    return <div className='p-4 sm:p-6'>{children}</div>
}

function StickyActions({ children }: { children: React.ReactNode }) {
    return (
        <div className='sticky bottom-0 mt-6 border-t border-gray-200 bg-white/80 backdrop-blur px-4 py-3 sm:px-6 rounded-b-xl'>
            <div className='flex items-center justify-end gap-2'>{children}</div>
        </div>
    )
}

function Badge({ children }: { children: React.ReactNode }) {
    return (
        <span className='inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium'>
            {children}
        </span>
    )
}

export default function MasterControl() {
    const [tab, setTab] = useState<ActiveTab>('indent')
    const [actionLoading, setActionLoading] = useState(false)
    const [lastItemCode, setLastItemCode] = useState('')

    const tabs = useMemo(
        () => [
            { key: 'indent' as const, label: 'Indent Master' },
            { key: 'vendor' as const, label: 'Vendor Master' },
        ],
        [],
    )

    useEffect(() => {
        const fetchLastItemCode = async () => {
            try {
                const response = await ApiService.fetchData<{ lastItemCode: string }>({
                    method: 'get',
                    url: '/indent/last-item-code',
                })
                setLastItemCode(response.data.lastItemCode)
            } catch (error) {
                console.error('Failed to fetch last item code:', error)
            }
        }

        fetchLastItemCode()
    }, [])

    const generateItemCode = useCallback(() => {
        const numericPart = lastItemCode?.slice(2) || '00000000'
        const incrementedNumber = (parseInt(numericPart, 10) + 1).toString().padStart(8, '0')
        return `IC${incrementedNumber}`
    }, [lastItemCode])

    const handleCreateItem = useCallback(
        async (values: ItemMasterFormValues, { resetForm }: FormikHelpers<ItemMasterFormValues>) => {
            setActionLoading(true)
            try {
                const itemCode = values.itemCode?.trim() || generateItemCode()

                const payload = {
                    itemCode,
                    itemDescription: values.itemDescription?.trim(),
                    techSpec: values.techSpec?.trim(),
                    make: values.make?.trim(),
                    unitOfMeasure: values.unitOfMeasure?.trim(),
                }

                if (!payload.itemDescription) throw new Error('Item description is required')
                if (!payload.unitOfMeasure) throw new Error('Unit is required')

                await ApiService.fetchData({
                    method: 'post',
                    url: ADD_ITEM_URL,
                    data: payload,
                })

                showAlert('Item added successfully.')
                resetForm()

                try {
                    const response = await ApiService.fetchData<{ lastItemCode: string }>({
                        method: 'get',
                        url: '/indent/last-item-code',
                    })
                    setLastItemCode(response.data.lastItemCode)
                } catch (e) {
                    console.error('Failed to refresh last item code:', e)
                }
            } catch (err: any) {
                showError(err?.response?.data?.message || err?.message || 'Failed to add item.')
            } finally {
                setActionLoading(false)
            }
        },
        [generateItemCode],
    )

    const handleCreateVendor = useCallback(
        async (values: VendorFormValues, { resetForm }: FormikHelpers<VendorFormValues>) => {
            setActionLoading(true)
            try {
                const payload: any = {
                    ...values,
                    name: values.name?.trim(),
                    countryKey: values.countryKey?.trim() || undefined,
                    city: values.city?.trim() || undefined,
                    district: values.district?.trim() || undefined,
                    street: values.street?.trim() || undefined,
                    postalCode: values.postalCode?.trim() || undefined,
                    panNumber: values.panNumber?.trim() || undefined,
                    gstin: values.gstin?.trim() || undefined,
                    msme: values.msme?.trim() || undefined,
                    companyCode: values.companyCode?.trim() || undefined,
                    region: values.region?.trim() || undefined,
                    languageKey: values.languageKey?.trim() || undefined,
                    contactPerson: (values.contactPerson || [])
                        .map((c) => ({
                            name: c.name?.trim(),
                            email: c.email?.trim(),
                            mobilePhoneIndicator: c.mobilePhoneIndicator?.trim() || undefined,
                            fullPhoneNumber: c.fullPhoneNumber?.trim() || undefined,
                            callerPhoneNumber: c.callerPhoneNumber?.trim() || undefined,
                        }))
                        .filter((c) => c.name || c.email || c.fullPhoneNumber),
                }

                if (!payload.name) throw new Error('Vendor name is required')

                const resp = await ApiService.fetchData<any>({
                    method: 'post',
                    url: ADD_VENDOR_URL,
                    data: payload,
                })

                const createdCode = resp?.data?.data?.vendorCode
                showAlert(createdCode ? `Vendor created: ${createdCode}` : 'Vendor created successfully.')
                resetForm()
            } catch (err: any) {
                showError(err?.response?.data?.message || err?.message || 'Failed to create vendor.')
            } finally {
                setActionLoading(false)
            }
        },
        [],
    )

    return (
        <div className='p-4 sm:p-6'>
            {/* Page header */}
            <div className='mb-4'>
                <div className='text-2xl font-bold'>Master Control</div>
                <div className='text-sm opacity-70'>
                    Manage master data quickly (items and vendors). Codes are auto-generated where applicable.
                </div>
            </div>

            {/* Tabs */}
            <div className='mb-4'>
                <div className='inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm'>
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            type='button'
                            onClick={() => setTab(t.key)}
                            className={cx(
                                'px-4 py-2 text-sm rounded-lg transition',
                                tab === t.key
                                    ? 'bg-gray-900 text-white'
                                    : 'text-gray-700 hover:bg-gray-100',
                            )}>
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* INDENT TAB */}
            {tab === 'indent' && (
                <Card>
                    <CardBody>
                        <SectionHeader
                            title='Add Item'
                            subtitle='Item Code is auto-generated based on the last code.'
                            right={<Badge>ICxxxxxxxx</Badge>}
                        />

                        <div className='mt-5'>
                            <Formik
                                enableReinitialize
                                initialValues={initialIndentValues}
                                onSubmit={handleCreateItem}
                                validate={(values) => {
                                    const errors: Partial<Record<keyof ItemMasterFormValues, string>> = {}
                                    if (!values.itemDescription?.trim()) errors.itemDescription = 'Required'
                                    if (!values.unitOfMeasure?.trim()) errors.unitOfMeasure = 'Required'
                                    return errors
                                }}>
                                {({ values, setFieldValue, errors, touched, isValid, dirty }) => (
                                    <Form>
                                        <FormContainer>
                                            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                                <FormItem label='Item Code' labelClass='text-xs !mb-1' className='mb-2.5'>
                                                    <Input size='sm' disabled value={values.itemCode || generateItemCode()} />
                                                </FormItem>

                                                <FormItem
                                                    asterisk
                                                    label='Unit'
                                                    labelClass='text-xs !mb-1'
                                                    className='mb-2.5'
                                                    invalid={!!(touched.unitOfMeasure && errors.unitOfMeasure)}
                                                    errorMessage={errors.unitOfMeasure}>
                                                    <Field
                                                        name='unitOfMeasure'
                                                        as={Input}
                                                        size='sm'
                                                        value={values.unitOfMeasure}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                            setFieldValue('unitOfMeasure', e.target.value)
                                                        }
                                                    />
                                                </FormItem>

                                                <FormItem
                                                    asterisk
                                                    label='Item Description'
                                                    labelClass='text-xs !mb-1'
                                                    className='mb-2.5 md:col-span-2'
                                                    invalid={!!(touched.itemDescription && errors.itemDescription)}
                                                    errorMessage={errors.itemDescription}>
                                                    <Field
                                                        name='itemDescription'
                                                        as={Input}
                                                        size='sm'
                                                        value={values.itemDescription}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                            setFieldValue('itemDescription', e.target.value)
                                                        }
                                                    />
                                                </FormItem>

                                                <FormItem label='Tech Specification' labelClass='text-xs !mb-1' className='mb-2.5'>
                                                    <Field
                                                        name='techSpec'
                                                        as={Input}
                                                        size='sm'
                                                        value={values.techSpec}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                            setFieldValue('techSpec', e.target.value)
                                                        }
                                                    />
                                                </FormItem>

                                                <FormItem label='Make' labelClass='text-xs !mb-1' className='mb-2.5'>
                                                    <Field
                                                        name='make'
                                                        as={Input}
                                                        size='sm'
                                                        value={values.make}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                            setFieldValue('make', e.target.value)
                                                        }
                                                    />
                                                </FormItem>
                                            </div>

                                            <StickyActions>
                                                <Button type='submit' size='sm' variant='solid' disabled={actionLoading || !dirty || !isValid}>
                                                    {actionLoading ? <Spinner size={16} /> : 'Add Item'}
                                                </Button>
                                            </StickyActions>
                                        </FormContainer>
                                    </Form>
                                )}
                            </Formik>
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* VENDOR TAB */}
            {tab === 'vendor' && (
                <Card>
                    <CardBody>
                        <SectionHeader
                            title='Create Vendor'
                            subtitle='Vendor Code is auto-generated by backend (VNDxxxx).'
                            right={<Badge>Auto vendorCode</Badge>}
                        />

                        <div className='mt-5'>
                            <Formik
                                enableReinitialize
                                initialValues={initialVendorValues}
                                onSubmit={handleCreateVendor}
                                validate={(values) => {
                                    const errors: Partial<Record<keyof VendorFormValues, string>> = {}
                                    if (!values.name?.trim()) errors.name = 'Required'
                                    return errors
                                }}>
                                {({ values, setFieldValue, errors, touched, isValid, dirty }) => (
                                    <Form>
                                        <FormContainer>
                                            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                                <FormItem label='Vendor Code' labelClass='text-xs !mb-1' className='mb-2.5'>
                                                    <Input size='sm' disabled value='Auto-generated (VNDxxxx)' />
                                                </FormItem>

                                                <FormItem
                                                    asterisk
                                                    label='Vendor Name'
                                                    labelClass='text-xs !mb-1'
                                                    className='mb-2.5'
                                                    invalid={!!(touched.name && errors.name)}
                                                    errorMessage={errors.name as any}>
                                                    <Field
                                                        name='name'
                                                        as={Input}
                                                        size='sm'
                                                        value={values.name}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                            setFieldValue('name', e.target.value)
                                                        }
                                                    />
                                                </FormItem>

                                                <FormItem label='Country Key' labelClass='text-xs !mb-1' className='mb-2.5'>
                                                    <Field
                                                        name='countryKey'
                                                        as={Input}
                                                        size='sm'
                                                        value={values.countryKey}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                            setFieldValue('countryKey', e.target.value)
                                                        }
                                                    />
                                                </FormItem>

                                                <FormItem label='Company Code' labelClass='text-xs !mb-1' className='mb-2.5'>
                                                    <Field
                                                        name='companyCode'
                                                        as={Input}
                                                        size='sm'
                                                        value={values.companyCode}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                            setFieldValue('companyCode', e.target.value)
                                                        }
                                                    />
                                                </FormItem>

                                                <FormItem label='City' labelClass='text-xs !mb-1' className='mb-2.5'>
                                                    <Field
                                                        name='city'
                                                        as={Input}
                                                        size='sm'
                                                        value={values.city}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                            setFieldValue('city', e.target.value)
                                                        }
                                                    />
                                                </FormItem>

                                                <FormItem label='District' labelClass='text-xs !mb-1' className='mb-2.5'>
                                                    <Field
                                                        name='district'
                                                        as={Input}
                                                        size='sm'
                                                        value={values.district}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                            setFieldValue('district', e.target.value)
                                                        }
                                                    />
                                                </FormItem>

                                                <FormItem label='Street' labelClass='text-xs !mb-1' className='mb-2.5 md:col-span-2'>
                                                    <Field
                                                        name='street'
                                                        as={Input}
                                                        size='sm'
                                                        value={values.street}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                            setFieldValue('street', e.target.value)
                                                        }
                                                    />
                                                </FormItem>

                                                <FormItem label='Postal Code' labelClass='text-xs !mb-1' className='mb-2.5'>
                                                    <Field
                                                        name='postalCode'
                                                        as={Input}
                                                        size='sm'
                                                        value={values.postalCode}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                            setFieldValue('postalCode', e.target.value)
                                                        }
                                                    />
                                                </FormItem>

                                                <FormItem label='PAN Number' labelClass='text-xs !mb-1' className='mb-2.5'>
                                                    <Field
                                                        name='panNumber'
                                                        as={Input}
                                                        size='sm'
                                                        value={values.panNumber}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                            setFieldValue('panNumber', e.target.value)
                                                        }
                                                    />
                                                </FormItem>

                                                <FormItem label='GSTIN' labelClass='text-xs !mb-1' className='mb-2.5'>
                                                    <Field
                                                        name='gstin'
                                                        as={Input}
                                                        size='sm'
                                                        value={values.gstin}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                            setFieldValue('gstin', e.target.value)
                                                        }
                                                    />
                                                </FormItem>

                                                <FormItem label='MSME' labelClass='text-xs !mb-1' className='mb-2.5'>
                                                    <Field
                                                        name='msme'
                                                        as={Input}
                                                        size='sm'
                                                        value={values.msme}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                            setFieldValue('msme', e.target.value)
                                                        }
                                                    />
                                                </FormItem>

                                                <FormItem label='Region' labelClass='text-xs !mb-1' className='mb-2.5'>
                                                    <Field
                                                        name='region'
                                                        as={Input}
                                                        size='sm'
                                                        value={values.region}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                            setFieldValue('region', e.target.value)
                                                        }
                                                    />
                                                </FormItem>

                                                <FormItem label='Language Key' labelClass='text-xs !mb-1' className='mb-2.5'>
                                                    <Field
                                                        name='languageKey'
                                                        as={Input}
                                                        size='sm'
                                                        value={values.languageKey}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                            setFieldValue('languageKey', e.target.value)
                                                        }
                                                    />
                                                </FormItem>
                                            </div>

                                            {/* Contact persons */}
                                            <div className='mt-5 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4'>
                                                <div className='flex items-center justify-between'>
                                                    <div>
                                                        <div className='text-sm font-semibold'>Contact Persons</div>
                                                        <div className='text-xs opacity-70'>Add multiple contacts if needed.</div>
                                                    </div>
                                                    <Badge>{values.contactPerson?.length || 0} rows</Badge>
                                                </div>

                                                <FieldArray name='contactPerson'>
                                                    {({ push, remove }) => (
                                                        <div className='mt-3 space-y-3'>
                                                            {(values.contactPerson || []).map((c, idx) => (
                                                                <div key={idx} className='rounded-lg border border-gray-200 bg-white p-3'>
                                                                    <div className='flex items-center justify-between'>
                                                                        <div className='text-xs font-medium opacity-80'>Contact #{idx + 1}</div>
                                                                        <Button
                                                                            type='button'
                                                                            size='xs'
                                                                            variant='plain'
                                                                            disabled={(values.contactPerson || []).length <= 1}
                                                                            onClick={() => remove(idx)}>
                                                                            Remove
                                                                        </Button>
                                                                    </div>

                                                                    <div className='mt-2 grid grid-cols-1 md:grid-cols-2 gap-3'>
                                                                        <FormItem label='Name' labelClass='text-xs !mb-1' className='mb-0'>
                                                                            <Input
                                                                                size='sm'
                                                                                value={c.name}
                                                                                onChange={(e) =>
                                                                                    setFieldValue(`contactPerson.${idx}.name`, e.target.value)
                                                                                }
                                                                            />
                                                                        </FormItem>

                                                                        <FormItem label='Email' labelClass='text-xs !mb-1' className='mb-0'>
                                                                            <Input
                                                                                size='sm'
                                                                                value={c.email}
                                                                                onChange={(e) =>
                                                                                    setFieldValue(`contactPerson.${idx}.email`, e.target.value)
                                                                                }
                                                                            />
                                                                        </FormItem>

                                                                        <FormItem
                                                                            label='Mobile Indicator'
                                                                            labelClass='text-xs !mb-1'
                                                                            className='mb-0'>
                                                                            <Input
                                                                                size='sm'
                                                                                value={c.mobilePhoneIndicator || ''}
                                                                                onChange={(e) =>
                                                                                    setFieldValue(
                                                                                        `contactPerson.${idx}.mobilePhoneIndicator`,
                                                                                        e.target.value,
                                                                                    )
                                                                                }
                                                                            />
                                                                        </FormItem>

                                                                        <FormItem
                                                                            label='Full Phone Number'
                                                                            labelClass='text-xs !mb-1'
                                                                            className='mb-0'>
                                                                            <Input
                                                                                size='sm'
                                                                                value={c.fullPhoneNumber || ''}
                                                                                onChange={(e) =>
                                                                                    setFieldValue(
                                                                                        `contactPerson.${idx}.fullPhoneNumber`,
                                                                                        e.target.value,
                                                                                    )
                                                                                }
                                                                            />
                                                                        </FormItem>

                                                                        <FormItem
                                                                            label='Caller Phone Number'
                                                                            labelClass='text-xs !mb-1'
                                                                            className='mb-0 md:col-span-2'>
                                                                            <Input
                                                                                size='sm'
                                                                                value={c.callerPhoneNumber || ''}
                                                                                onChange={(e) =>
                                                                                    setFieldValue(
                                                                                        `contactPerson.${idx}.callerPhoneNumber`,
                                                                                        e.target.value,
                                                                                    )
                                                                                }
                                                                            />
                                                                        </FormItem>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            <div className='flex justify-end'>
                                                                <Button
                                                                    type='button'
                                                                    size='sm'
                                                                    variant='twoTone'
                                                                    onClick={() =>
                                                                        push({
                                                                            name: '',
                                                                            email: '',
                                                                            mobilePhoneIndicator: '',
                                                                            fullPhoneNumber: '',
                                                                            callerPhoneNumber: '',
                                                                        })
                                                                    }>
                                                                    Add Contact
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </FieldArray>
                                            </div>

                                            <StickyActions>
                                                <Button type='submit' size='sm' variant='solid' disabled={actionLoading || !dirty || !isValid}>
                                                    {actionLoading ? <Spinner size={16} /> : 'Create Vendor'}
                                                </Button>
                                            </StickyActions>
                                        </FormContainer>
                                    </Form>
                                )}
                            </Formik>
                        </div>
                    </CardBody>
                </Card>
            )}
        </div>
    )
}
