import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Form, Formik, FormikHelpers } from 'formik'
import ApiService from '@/services/ApiService'
import { Button, Dialog, FormContainer, FormItem, Input, Spinner } from '@/components/ui'
import { showAlert, showError } from '@/utils/hoc/showAlert'
import {
    MdAdd,
    MdClose,
    MdPerson,
    MdEmail,
    MdPhone,
    MdInfoOutline,
    MdBusiness,
    MdLocationOn,
    MdBadge,
    MdCheckCircle,
} from 'react-icons/md'

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

    street: string
    postalCode: string
    city: string
    district: string

    region: string
    languageKey: string
    contactPerson: ContactPersonForm[]
}

const initialValues: VendorRegisterValues = {
    name: '',
    gstin: '',
    panNumber: '',
    msme: '',

    street: '',
    postalCode: '',
    city: '',
    district: '',

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

        street: trimOrEmpty(values.street),
        postalCode: trimOrEmpty(values.postalCode),
        city: trimOrEmpty(values.city),
        district: trimOrEmpty(values.district),

        region: trimOrEmpty(values.region),
        languageKey: trimOrEmpty(values.languageKey),

        contactPerson,
    }
}

function emptyContact(): ContactPersonForm {
    return { name: '', email: '', fullPhoneNumber: '' }
}

function SectionCard({
    icon,
    title,
    subtitle,
    children,
}: {
    icon: React.ReactNode
    title: string
    subtitle: string
    children: React.ReactNode
}) {
    return (
        <div className='overflow-hidden rounded-2xl sm:rounded-[26px] border border-slate-200/80 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.05)]'>
            <div className='border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-4 py-4 sm:px-6'>
                <div className='flex items-start gap-3'>
                    <div className='grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-xl sm:rounded-2xl bg-slate-100 text-base sm:text-lg text-slate-700'>
                        {icon}
                    </div>
                    <div className='min-w-0'>
                        <div className='text-sm sm:text-base font-semibold text-slate-900'>{title}</div>
                        <div className='mt-0.5 text-xs leading-5 text-slate-500'>{subtitle}</div>
                    </div>
                </div>
            </div>

            <div className='px-4 py-4 sm:px-6 sm:py-6'>{children}</div>
        </div>
    )
}

/** Auto-fill City + District from PIN */
function PinAutoFill({ pin, setFieldValue }: { pin: string; setFieldValue: FormikHelpers<VendorRegisterValues>['setFieldValue'] }) {
    const [pinStatus, setPinStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [pinStatusMsg, setPinStatusMsg] = useState<string>('')

    const lastPinRef = useRef<string | null>(null)
    const setFieldValueRef = useRef(setFieldValue)

    useEffect(() => {
        setFieldValueRef.current = setFieldValue
    }, [setFieldValue])

    useEffect(() => {
        const p = String(pin ?? '')
            .replace(/\D/g, '')
            .slice(0, 6)

        if (!/^\d{6}$/.test(p)) {
            lastPinRef.current = null
            setPinStatus('idle')
            setPinStatusMsg('')
            return
        }

        if (lastPinRef.current === p) return

        const ctrl = new AbortController()
        const timeout = setTimeout(async () => {
            setPinStatus('loading')
            setPinStatusMsg('Looking up city & district…')

            setFieldValueRef.current('city', '')
            setFieldValueRef.current('district', '')

            const setSuccess = (city: string, district: string) => {
                if (city) setFieldValueRef.current('city', city)
                if (district) setFieldValueRef.current('district', district)

                setPinStatus('success')
                setPinStatusMsg(`${city}${city && district ? ', ' : ''}${district}`)
                lastPinRef.current = p
            }

            try {
                try {
                    const res = await fetch(`https://api.postalpincode.in/pincode/${p}`, {
                        signal: ctrl.signal,
                        mode: 'cors',
                    })
                    const json = await res.json()
                    const d = Array.isArray(json) ? json[0] : null

                    if (d?.Status === 'Success' && d?.PostOffice?.length) {
                        const po = d.PostOffice[0]
                        const district = String(po?.District || '').trim()
                        const city = String(po?.Block || po?.Division || po?.Name || district || '').trim()

                        if (city || district) {
                            setSuccess(city, district)
                            return
                        }
                    }

                    throw new Error('Postal API returned no result')
                } catch {
                    const res2 = await fetch(`https://api.zippopotam.us/IN/${p}`, {
                        signal: ctrl.signal,
                        mode: 'cors',
                    })
                    if (!res2.ok) throw new Error('Zippopotam not ok')

                    const j2 = await res2.json()
                    const place = j2?.places?.[0]
                    const city = String(place?.['place name'] || '').trim()
                    const district = String(place?.state || '').trim()

                    setSuccess(city, district)
                }
            } catch (e: any) {
                if (e?.name === 'AbortError') return
                setPinStatus('error')
                setPinStatusMsg('Could not fetch details. Please fill manually.')
                lastPinRef.current = null
            }
        }, 350)

        return () => {
            ctrl.abort()
            clearTimeout(timeout)
        }
    }, [pin])

    if (pinStatus === 'idle') return null

    const wrapperClass =
        pinStatus === 'loading'
            ? 'mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600'
            : pinStatus === 'success'
              ? 'mt-2 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700'
              : 'mt-2 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700'

    return (
        <div className={wrapperClass}>
            {pinStatus === 'success' ? <MdCheckCircle className='text-sm shrink-0' /> : <MdInfoOutline className='text-sm shrink-0' />}
            <span>{pinStatusMsg}</span>
        </div>
    )
}

export default function VendorRegisterDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [submitting, setSubmitting] = useState(false)

    const validate = useMemo(() => {
        return (v: VendorRegisterValues) => {
            const errors: Partial<Record<keyof VendorRegisterValues, any>> = {}

            if (!trimOrEmpty(v.name)) errors.name = 'Vendor name is required'

            const contactRows = v.contactPerson || []
            const hasAnyContact = contactRows.some((c) => !!trimOrEmpty(c?.name) || !!trimOrEmpty(c?.email) || !!trimOrEmpty(c?.fullPhoneNumber))

            if (!hasAnyContact) {
                errors.contactPerson = 'Add at least one contact (name/email/phone).'
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
        <Dialog isOpen={open} onClose={onClose} width={960}>
            <div className='flex max-h-[92vh] flex-col overflow-hidden rounded-2xl sm:rounded-[30px] bg-white'>
                {/* Header */}
                <div className='relative overflow-hidden border-b border-slate-200 bg-white'>
                    <div className='absolute right-0 top-0 h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-blue-50 blur-3xl' />
                    <div className='absolute left-0 top-0 h-24 w-24 sm:h-32 sm:w-32 rounded-full bg-slate-100 blur-3xl' />

                    <div className='relative z-10 px-4 py-4 sm:px-7 sm:py-6'>
                        <div className='flex items-start justify-between gap-4'>
                            <div className='min-w-0 max-w-3xl'>
                                <div className='mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-slate-700'>
                                    <MdBusiness className='text-sm' />
                                    Vendor Onboarding
                                </div>

                                <h5 className='text-lg sm:text-2xl font-semibold tracking-tight text-slate-900'>Register as Vendor</h5>
                                <p className='mt-2 text-xs sm:text-sm leading-5 sm:leading-6 text-slate-500'>
                                    Submit your company and contact details for approval. Once reviewed, the vendor request will appear in the pending
                                    approvals list.
                                </p>
                            </div>

                            <button
                                type='button'
                                onClick={onClose}
                                aria-label='Close'
                                className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900'>
                                <MdClose className='text-xl' />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className='flex-1 overflow-y-auto bg-[linear-gradient(to_bottom,#f8fafc,#f1f5f9)] px-3 py-3 sm:px-6 sm:py-5'>
                    <Formik initialValues={initialValues} validate={validate} onSubmit={handleSubmit}>
                        {({ values, setFieldValue, errors, touched, isValid, dirty }) => {
                            const contactError = typeof (errors as any)?.contactPerson === 'string' ? (errors as any)?.contactPerson : ''
                            const contactCount = (values.contactPerson || []).length

                            return (
                                <Form className='min-h-full'>
                                    <FormContainer className='space-y-4 sm:space-y-5'>
                                        <SectionCard
                                            icon={<MdBusiness />}
                                            title='Vendor Information'
                                            subtitle='Basic business and identification details used for onboarding.'>
                                            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                                                <FormItem
                                                    asterisk
                                                    label='Vendor Name'
                                                    labelClass='text-xs font-semibold !mb-1.5 text-slate-700'
                                                    invalid={!!(touched.name && errors.name)}
                                                    errorMessage={errors.name as any}>
                                                    <Input
                                                        size='sm'
                                                        value={values.name}
                                                        placeholder='Enter vendor name'
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue('name', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem asterisk label='GSTIN' labelClass='text-xs font-semibold !mb-1.5 text-slate-700'>
                                                    <Input
                                                        size='sm'
                                                        value={values.gstin}
                                                        placeholder='Enter GSTIN'
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue('gstin', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem asterisk label='PAN Number' labelClass='text-xs font-semibold !mb-1.5 text-slate-700'>
                                                    <Input
                                                        size='sm'
                                                        value={values.panNumber}
                                                        placeholder='Enter PAN number'
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue('panNumber', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem label='MSME' labelClass='text-xs font-semibold !mb-1.5 text-slate-700'>
                                                    <Input
                                                        size='sm'
                                                        value={values.msme}
                                                        placeholder='MSME (optional)'
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue('msme', e.target.value)}
                                                    />
                                                </FormItem>
                                            </div>
                                        </SectionCard>

                                        <SectionCard
                                            icon={<MdLocationOn />}
                                            title='Address Details'
                                            subtitle='Location information for communication and vendor records.'>
                                            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                                                <FormItem label='Street / Address' labelClass='text-xs font-semibold !mb-1.5 text-slate-700' className='md:col-span-2'>
                                                    <Input
                                                        size='sm'
                                                        value={values.street}
                                                        placeholder='Street / Address'
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue('street', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem label='Postal Code' labelClass='text-xs font-semibold !mb-1.5 text-slate-700'>
                                                    <Input
                                                        size='sm'
                                                        value={values.postalCode}
                                                        placeholder='6-digit PIN'
                                                        inputMode='numeric'
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                            setFieldValue('postalCode', e.target.value.replace(/\D/g, '').slice(0, 6))
                                                        }
                                                    />
                                                    <PinAutoFill pin={values.postalCode} setFieldValue={setFieldValue} />
                                                </FormItem>

                                                <FormItem label='City' labelClass='text-xs font-semibold !mb-1.5 text-slate-700'>
                                                    <Input
                                                        size='sm'
                                                        value={values.city}
                                                        placeholder='City'
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue('city', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem label='District' labelClass='text-xs font-semibold !mb-1.5 text-slate-700'>
                                                    <Input
                                                        size='sm'
                                                        value={values.district}
                                                        placeholder='District'
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue('district', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem label='Region' labelClass='text-xs font-semibold !mb-1.5 text-slate-700'>
                                                    <Input
                                                        size='sm'
                                                        value={values.region}
                                                        placeholder='Region (optional)'
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue('region', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem label='Language Key' labelClass='text-xs font-semibold !mb-1.5 text-slate-700'>
                                                    <Input
                                                        size='sm'
                                                        value={values.languageKey}
                                                        placeholder='Language key (optional)'
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue('languageKey', e.target.value)}
                                                    />
                                                </FormItem>
                                            </div>
                                        </SectionCard>

                                        <SectionCard
                                            icon={<MdBadge />}
                                            title='Contact Person'
                                            subtitle='Add at least one person with a usable contact detail for further communication.'>
                                            <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                                                <div>
                                                    <div className='flex items-center gap-2'>
                                                        <span className='text-sm font-semibold text-slate-900'>Contacts</span>
                                                        <span className='rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700'>
                                                            {contactCount}
                                                        </span>
                                                    </div>

                                                    <div className='mt-1 flex items-center gap-1 text-xs text-slate-500'>
                                                        <MdInfoOutline className='opacity-70' />
                                                        Name, email, or phone is enough for at least one row.
                                                    </div>
                                                </div>

                                                <Button
                                                    type='button'
                                                    size='xs'
                                                    variant='twoTone'
                                                    icon={<MdAdd />}
                                                    onClick={() => setFieldValue('contactPerson', [...(values.contactPerson || []), emptyContact()])}>
                                                    Add Contact
                                                </Button>
                                            </div>

                                            {contactError ? (
                                                <div className='mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700'>
                                                    {contactError}
                                                </div>
                                            ) : null}

                                            <div className='mt-5 space-y-4'>
                                                {(values.contactPerson || []).map((c, idx) => (
                                                    <div
                                                        key={idx}
                                                        className='rounded-2xl sm:rounded-[22px] border border-slate-200 bg-[linear-gradient(to_bottom,#ffffff,#f8fafc)] p-4 shadow-sm'>
                                                        <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                                                            <div className='flex items-center gap-3'>
                                                                <span className='grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm'>
                                                                    {idx + 1}
                                                                </span>
                                                                <div>
                                                                    <div className='text-sm font-semibold text-slate-900'>Contact #{idx + 1}</div>
                                                                    <div className='text-[11px] text-slate-500'>Primary vendor communication</div>
                                                                </div>
                                                            </div>

                                                            {contactCount > 1 ? (
                                                                <div className='sm:self-auto self-end'>
                                                                    <Button
                                                                        type='button'
                                                                        size='xs'
                                                                        variant='plain'
                                                                        color='red'
                                                                        icon={<MdClose />}
                                                                        onClick={() => {
                                                                            const next = [...values.contactPerson]
                                                                            next.splice(idx, 1)
                                                                            setFieldValue('contactPerson', next.length ? next : [emptyContact()])
                                                                        }}>
                                                                        Remove
                                                                    </Button>
                                                                </div>
                                                            ) : null}
                                                        </div>

                                                        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                                                            <FormItem label='Name' labelClass='text-xs font-semibold !mb-1.5 text-slate-700'>
                                                                <Input
                                                                    size='sm'
                                                                    prefix={<MdPerson className='opacity-70' />}
                                                                    value={c.name}
                                                                    placeholder='Full name'
                                                                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                                        setFieldValue(`contactPerson.${idx}.name`, e.target.value)
                                                                    }
                                                                />
                                                            </FormItem>

                                                            <FormItem label='Email' labelClass='text-xs font-semibold !mb-1.5 text-slate-700'>
                                                                <Input
                                                                    size='sm'
                                                                    prefix={<MdEmail className='opacity-70' />}
                                                                    value={c.email}
                                                                    placeholder='Email address'
                                                                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                                        setFieldValue(`contactPerson.${idx}.email`, e.target.value)
                                                                    }
                                                                />
                                                            </FormItem>

                                                            <FormItem label='Phone' labelClass='text-xs font-semibold !mb-1.5 text-slate-700'>
                                                                <Input
                                                                    size='sm'
                                                                    prefix={<MdPhone className='opacity-70' />}
                                                                    value={c.fullPhoneNumber}
                                                                    placeholder='+91...'
                                                                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                                        setFieldValue(`contactPerson.${idx}.fullPhoneNumber`, e.target.value)
                                                                    }
                                                                />
                                                            </FormItem>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </SectionCard>

                                        {/* Footer */}
                                        <div className='sticky bottom-0 z-10 -mx-3 border-t border-slate-200 bg-white/95 px-3 py-4 backdrop-blur sm:-mx-6 sm:px-6'>
                                            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                                                <div className='text-xs text-slate-500'>
                                                    Please review vendor details before submitting for approval.
                                                </div>

                                                <div className='flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3'>
                                                    <Button type='button' size='sm' variant='plain' disabled={submitting} onClick={onClose}>
                                                        Cancel
                                                    </Button>

                                                    <Button
                                                        type='submit'
                                                        size='sm'
                                                        variant='solid'
                                                        disabled={submitting || !dirty || !isValid}
                                                        className='min-w-[170px] sm:min-w-[190px] rounded-xl'>
                                                        {submitting ? <Spinner size={16} /> : 'Submit for Approval'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </FormContainer>
                                </Form>
                            )
                        }}
                    </Formik>
                </div>
            </div>
        </Dialog>
    )
}