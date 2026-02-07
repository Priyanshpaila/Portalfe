import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Form, Formik, FormikHelpers } from 'formik'
import ApiService from '@/services/ApiService'
import { Button, Dialog, FormContainer, FormItem, Input, Spinner } from '@/components/ui'
import { showAlert, showError } from '@/utils/hoc/showAlert'
import { MdAdd, MdClose, MdPerson, MdEmail, MdPhone, MdInfoOutline } from 'react-icons/md'

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

/** ✅ Auto-fill City + District from PIN */
function PinAutoFill({ pin, setFieldValue }: { pin: string; setFieldValue: FormikHelpers<VendorRegisterValues>['setFieldValue'] }) {
    const [pinStatus, setPinStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [pinStatusMsg, setPinStatusMsg] = useState<string>('')

    const lastPinRef = useRef<string | null>(null)
    const setFieldValueRef = useRef(setFieldValue)

    // keep latest setFieldValue without triggering effect re-run
    useEffect(() => {
        setFieldValueRef.current = setFieldValue
    }, [setFieldValue])

    useEffect(() => {
        const p = String(pin ?? '')
            .replace(/\D/g, '')
            .slice(0, 6)

        // if not 6 digits, don't fetch
        if (!/^\d{6}$/.test(p)) {
            lastPinRef.current = null
            setPinStatus('idle')
            setPinStatusMsg('')
            return
        }

        // avoid refetch for same pin
        if (lastPinRef.current === p) return

        const ctrl = new AbortController()
        const timeout = setTimeout(async () => {
            setPinStatus('loading')
            setPinStatusMsg('Looking up city & district…')

            // clear stale values while loading (optional)
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
                // 1) India Postal API
                try {
                    const res = await fetch(`https://api.postalpincode.in/pincode/${p}`, {
                        signal: ctrl.signal,
                        mode: 'cors',
                    })
                    const json = await res.json()
                    const d = Array.isArray(json) ? json[0] : null

                    if (d?.Status === 'Success' && d?.PostOffice?.length) {
                        const po = d.PostOffice[0]

                        // ✅ you want city + district
                        const district = String(po?.District || '').trim()
                        const city = String(po?.Block || po?.Division || po?.Name || district || '').trim()

                        if (city || district) {
                            setSuccess(city, district)
                            return
                        }
                    }

                    throw new Error('Postal API returned no result')
                } catch {
                    // 2) Fallback: Zippopotam (district not available; we put state into district as fallback)
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

    const cls = pinStatus === 'loading' ? 'text-[11px] text-slate-600' : pinStatus === 'success' ? 'text-[11px] text-emerald-700' : 'text-[11px] text-red-700'

    const box =
        pinStatus === 'loading'
            ? 'mt-1 rounded-lg border bg-slate-50 px-2 py-1'
            : pinStatus === 'success'
              ? 'mt-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1'
              : 'mt-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1'

    return (
        <div className={box}>
            <div className={cls}>{pinStatusMsg}</div>
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
        <Dialog isOpen={open} onClose={onClose} width={860}>
            <div className='flex max-h-[85vh] flex-col'>
                {/* Header */}
                <div className='flex items-start justify-between gap-4 pb-3 border-b'>
                    <div>
                        <h5 className='text-lg font-semibold'>Register as Vendor</h5>
                        <div className='mt-0.5 text-xs opacity-70'>
                            Submit details for approval. Your request will be visible in the pending approvals list.
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className='flex-1 overflow-y-auto pr-1 pt-4'>
                    <Formik initialValues={initialValues} validate={validate} onSubmit={handleSubmit}>
                        {({ values, setFieldValue, errors, touched, isValid, dirty }) => {
                            const contactError = typeof (errors as any)?.contactPerson === 'string' ? (errors as any)?.contactPerson : ''
                            const contactCount = (values.contactPerson || []).length

                            return (
                                <Form className='min-h-full'>
                                    <FormContainer>
                                        {/* Vendor info */}
                                        <div className='rounded-2xl border bg-white p-4'>
                                            <div className='mb-3 flex items-center gap-2'>
                                                <div className='text-sm font-semibold'>Vendor Information</div>
                                                <div className='text-xs opacity-60'>Basic details</div>
                                            </div>

                                            {/* ✅ Rearranged layout: address group (street -> postal -> city/district) */}
                                            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                                <FormItem
                                                    asterisk
                                                    label='Vendor Name'
                                                    labelClass='text-xs !mb-1'
                                                    invalid={!!(touched.name && errors.name)}
                                                    errorMessage={errors.name as any}>
                                                    <Input
                                                        size='sm'
                                                        value={values.name}
                                                        placeholder='Enter vendor name'
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue('name', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem asterisk label='GSTIN' labelClass='text-xs !mb-1'>
                                                    <Input
                                                        size='sm'
                                                        value={values.gstin}
                                                        placeholder='GSTIN'
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue('gstin', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem asterisk label='PAN Number' labelClass='text-xs !mb-1'>
                                                    <Input
                                                        size='sm'
                                                        value={values.panNumber}
                                                        placeholder='PAN'
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue('panNumber', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem label='MSME' labelClass='text-xs !mb-1'>
                                                    <Input
                                                        size='sm'
                                                        value={values.msme}
                                                        placeholder='MSME (optional)'
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue('msme', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem label='Street / Address' labelClass='text-xs !mb-1' className='md:col-span-2'>
                                                    <Input
                                                        size='sm'
                                                        value={values.street}
                                                        placeholder='Street / Address'
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue('street', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem label='Postal Code' labelClass='text-xs !mb-1'>
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

                                                <FormItem label='City (auto)' labelClass='text-xs !mb-1'>
                                                    <Input
                                                        size='sm'
                                                        value={values.city}
                                                        placeholder='City'
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue('city', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem label='District (auto)' labelClass='text-xs !mb-1'>
                                                    <Input
                                                        size='sm'
                                                        value={values.district}
                                                        placeholder='District'
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue('district', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem label='Region' labelClass='text-xs !mb-1'>
                                                    <Input
                                                        size='sm'
                                                        value={values.region}
                                                        placeholder='Region (optional)'
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue('region', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem label='Language Key' labelClass='text-xs !mb-1'>
                                                    <Input
                                                        size='sm'
                                                        value={values.languageKey}
                                                        placeholder='Language key (optional)'
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue('languageKey', e.target.value)}
                                                    />
                                                </FormItem>
                                            </div>
                                        </div>

                                        {/* Contact section */}
                                        <div className='mt-4 rounded-2xl border bg-slate-50 p-4'>
                                            <div className='flex items-start justify-between gap-3'>
                                                <div>
                                                    <div className='flex items-center gap-2'>
                                                        <div className='text-sm font-semibold'>Contact Person</div>
                                                        <span className='rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700'>
                                                            {contactCount}
                                                        </span>
                                                    </div>
                                                    <div className='mt-0.5 text-xs opacity-70 flex items-center gap-1'>
                                                        <MdInfoOutline className='opacity-60' />
                                                        Add at least one contact method (name / email / phone).
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
                                                <div className='mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700'>
                                                    {contactError}
                                                </div>
                                            ) : null}

                                            <div className='mt-4 space-y-3'>
                                                {(values.contactPerson || []).map((c, idx) => (
                                                    <div key={idx} className='rounded-2xl border bg-white p-4 shadow-sm'>
                                                        <div className='mb-3 flex items-center justify-between gap-3'>
                                                            <div className='flex items-center gap-2'>
                                                                <span className='grid h-7 w-7 place-items-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700'>
                                                                    {idx + 1}
                                                                </span>
                                                                <div className='text-sm font-medium'>Contact #{idx + 1}</div>
                                                            </div>

                                                            {contactCount > 1 ? (
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
                                                            ) : null}
                                                        </div>

                                                        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                                                            <FormItem label='Name' labelClass='text-xs !mb-1'>
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

                                                            <FormItem label='Email' labelClass='text-xs !mb-1'>
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

                                                            <FormItem label='Phone' labelClass='text-xs !mb-1'>
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
                                        </div>

                                        {/* Footer */}
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
                            )
                        }}
                    </Formik>
                </div>
            </div>
        </Dialog>
    )
}
