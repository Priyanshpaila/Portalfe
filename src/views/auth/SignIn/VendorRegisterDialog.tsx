import React, { ChangeEvent, useMemo, useState } from 'react'
import { Field, Form, Formik, FormikHelpers } from 'formik'
import ApiService from '@/services/ApiService'
import { Button, Dialog, FormContainer, FormItem, Input, Spinner } from '@/components/ui'
import { showAlert, showError } from '@/utils/hoc/showAlert'
import { MdAdd, MdClose, MdPerson, MdEmail, MdPhone } from 'react-icons/md'

type ContactPersonForm = {
    name: string
    email: string
    fullPhoneNumber: string
}

type VendorRegisterValues = {
    name: string
    gstin: string
    panNumber: string
    msme: string
    city: string
    district: string
    street: string
    postalCode: string
    companyCode: string
    region: string
    languageKey: string
    contactPerson: ContactPersonForm[]
}

const initialValues: VendorRegisterValues = {
    name: '',
    gstin: '',
    panNumber: '',
    msme: '',
    city: '',
    district: '',
    street: '',
    postalCode: '',
    companyCode: '',
    region: '',
    languageKey: '',
    contactPerson: [{ name: '', email: '', fullPhoneNumber: '' }],
}

function trimOrEmpty(v: any) {
    return String(v ?? '').trim()
}

function normalizePayload(values: VendorRegisterValues) {
    const contactPerson = (values.contactPerson || [])
        .map((c) => ({
            name: trimOrEmpty(c.name),
            email: trimOrEmpty(c.email),
            fullPhoneNumber: trimOrEmpty(c.fullPhoneNumber),
        }))
        .filter((c) => c.name || c.email || c.fullPhoneNumber)

    return {
        name: trimOrEmpty(values.name),
        gstin: trimOrEmpty(values.gstin),
        panNumber: trimOrEmpty(values.panNumber),
        msme: trimOrEmpty(values.msme),
        city: trimOrEmpty(values.city),
        district: trimOrEmpty(values.district),
        street: trimOrEmpty(values.street),
        postalCode: trimOrEmpty(values.postalCode),
        companyCode: trimOrEmpty(values.companyCode),
        region: trimOrEmpty(values.region),
        languageKey: trimOrEmpty(values.languageKey),
        contactPerson,
    }
}

export default function VendorRegisterDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [submitting, setSubmitting] = useState(false)

    const validate = useMemo(() => {
        return (v: VendorRegisterValues) => {
            const errors: Partial<Record<keyof VendorRegisterValues, any>> = {}

            if (!trimOrEmpty(v.name)) errors.name = 'Vendor name is required'

            // Contact validation: at least one contact with email or phone (optional, but recommended)
            const cp0 = v.contactPerson?.[0]
            const hasAnyContact = !!trimOrEmpty(cp0?.name) || !!trimOrEmpty(cp0?.email) || !!trimOrEmpty(cp0?.fullPhoneNumber)

            if (!hasAnyContact) {
                errors.contactPerson = [{ name: 'Add at least one contact (name/email/phone)' }]
            }

            return errors
        }
    }, [])

    const handleSubmit = async (values: VendorRegisterValues, helpers: FormikHelpers<VendorRegisterValues>) => {
        setSubmitting(true)
        try {
            const payload = normalizePayload(values)

            if (!payload.name) {
                showError('Vendor name is required')
                setSubmitting(false)
                return
            }

            await ApiService.fetchData({
                method: 'post',
                url: '/preapprovedVendor',
                data: payload,
            })

            showAlert('Registration submitted! Your vendor will appear in the approval list as pending.')
            helpers.resetForm()
            onClose()
        } catch (err: any) {
            showError(err?.response?.data?.message || err?.message || 'Failed to register vendor.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog isOpen={open} onClose={onClose} width={820}>
            {/* ✅ Make dialog layout column and limit height */}
            <div className='flex max-h-[85vh] flex-col'>
                {/* Header */}
                <div className='flex items-start justify-between gap-4 pb-3'>
                    <div>
                        <h5 className='text-lg font-semibold'>Register as Vendor</h5>
                        <div className='text-xs opacity-70'>Submit details for approval (status: pending).</div>
                    </div>
                </div>

                {/* ✅ Scrollable body */}
                <div className='flex-1 overflow-y-auto pr-1'>
                    <Formik initialValues={initialValues} validate={validate} onSubmit={handleSubmit}>
                        {({ values, setFieldValue, errors, touched, isValid, dirty }) => (
                            <Form className='min-h-full'>
                                <FormContainer>
                                    <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                        <FormItem
                                            asterisk
                                            label='Vendor Name'
                                            labelClass='text-xs !mb-1'
                                            invalid={!!(touched.name && errors.name)}
                                            errorMessage={errors.name as any}>
                                            <Field name='name' component={Input} size='sm' placeholder='Enter vendor name' />
                                        </FormItem>

                                        <FormItem label='GSTIN' labelClass='text-xs !mb-1'>
                                            <Field name='gstin' component={Input} size='sm' placeholder='GSTIN (optional)' />
                                        </FormItem>

                                        <FormItem label='PAN Number' labelClass='text-xs !mb-1'>
                                            <Field name='panNumber' component={Input} size='sm' placeholder='PAN (optional)' />
                                        </FormItem>

                                        <FormItem label='MSME' labelClass='text-xs !mb-1'>
                                            <Field name='msme' component={Input} size='sm' placeholder='MSME (optional)' />
                                        </FormItem>

                                        <FormItem label='City' labelClass='text-xs !mb-1'>
                                            <Field name='city' component={Input} size='sm' placeholder='City' />
                                        </FormItem>

                                        <FormItem label='District' labelClass='text-xs !mb-1'>
                                            <Field name='district' component={Input} size='sm' placeholder='District' />
                                        </FormItem>

                                        <FormItem label='Street' labelClass='text-xs !mb-1' className='md:col-span-2'>
                                            <Field name='street' component={Input} size='sm' placeholder='Street / Address' />
                                        </FormItem>

                                        <FormItem label='Postal Code' labelClass='text-xs !mb-1'>
                                            <Field name='postalCode' component={Input} size='sm' placeholder='Postal code' />
                                        </FormItem>

                                        <FormItem label='Company Code' labelClass='text-xs !mb-1'>
                                            <Field name='companyCode' component={Input} size='sm' placeholder='Company code (optional)' />
                                        </FormItem>

                                        <FormItem label='Region' labelClass='text-xs !mb-1'>
                                            <Field name='region' component={Input} size='sm' placeholder='Region (optional)' />
                                        </FormItem>

                                        <FormItem label='Language Key' labelClass='text-xs !mb-1'>
                                            <Field name='languageKey' component={Input} size='sm' placeholder='Language key (optional)' />
                                        </FormItem>
                                    </div>

                                    {/* Contact Person */}
                                    <div className='mt-5 rounded-xl border bg-gray-50 p-3'>
                                        <div className='flex items-center justify-between'>
                                            <div className='text-sm font-semibold'>Contact Person</div>
                                            <Button
                                                type='button'
                                                size='xs'
                                                variant='twoTone'
                                                icon={<MdAdd />}
                                                onClick={() =>
                                                    setFieldValue('contactPerson', [
                                                        ...(values.contactPerson || []),
                                                        { name: '', email: '', fullPhoneNumber: '' },
                                                    ])
                                                }>
                                                Add
                                            </Button>
                                        </div>

                                        <div className='mt-3 space-y-3'>
                                            {(values.contactPerson || []).map((c, idx) => {
                                                const cpErr: any = (errors as any)?.contactPerson?.[idx]
                                                const cpTouch: any = (touched as any)?.contactPerson?.[idx]

                                                return (
                                                    <div key={idx} className='rounded-lg border bg-white p-3'>
                                                        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                                                            <FormItem
                                                                label='Name'
                                                                labelClass='text-xs !mb-1'
                                                                invalid={!!(cpTouch?.name && cpErr?.name)}
                                                                errorMessage={cpErr?.name}>
                                                                <Input
                                                                    size='sm'
                                                                    prefix={<MdPerson className='opacity-70' />}
                                                                    value={c.name}
                                                                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                                        setFieldValue(`contactPerson.${idx}.name`, e.target.value)
                                                                    }
                                                                />
                                                            </FormItem>

                                                            <FormItem label='Email' labelClass='text-xs !mb-1'>
                                                                <Input
                                                                    size='sm'
                                                                    prefix={<MdEmail className='opacity-70' />}
                                                                    value={c.email}
                                                                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                                        setFieldValue(`contactPerson.${idx}.email`, e.target.value)
                                                                    }
                                                                />
                                                            </FormItem>

                                                            <FormItem label='Phone' labelClass='text-xs !mb-1'>
                                                                <Input
                                                                    size='sm'
                                                                    prefix={<MdPhone className='opacity-70' />}
                                                                    value={c.fullPhoneNumber}
                                                                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                                        setFieldValue(`contactPerson.${idx}.fullPhoneNumber`, e.target.value)
                                                                    }
                                                                />
                                                            </FormItem>
                                                        </div>

                                                        {(values.contactPerson || []).length > 1 && (
                                                            <div className='mt-2 flex justify-end'>
                                                                <Button
                                                                    type='button'
                                                                    size='xs'
                                                                    variant='plain'
                                                                    color='red'
                                                                    onClick={() => {
                                                                        const next = [...values.contactPerson]
                                                                        next.splice(idx, 1)
                                                                        setFieldValue('contactPerson', next)
                                                                    }}>
                                                                    Remove
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* ✅ Sticky footer inside scroll container’s parent */}
                                    <div className='sticky bottom-0 mt-5 flex justify-end gap-2 border-t bg-white/95 py-3 backdrop-blur'>
                                        <Button type='button' size='sm' variant='plain' disabled={submitting} onClick={onClose}>
                                            Cancel
                                        </Button>
                                        <Button type='submit' size='sm' variant='solid' disabled={submitting || !dirty || !isValid}>
                                            {submitting ? <Spinner size={16} /> : 'Submit for Approval'}
                                        </Button>
                                    </div>
                                </FormContainer>
                            </Form>
                        )}
                    </Formik>
                </div>
            </div>
        </Dialog>
    )
}
