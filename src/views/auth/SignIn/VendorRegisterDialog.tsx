import React, { ChangeEvent, useMemo, useState } from 'react'
import { Field, Form, Formik, FormikHelpers } from 'formik'
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

function emptyContact(): ContactPersonForm {
    return { name: '', email: '', fullPhoneNumber: '' }
}

export default function VendorRegisterDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [submitting, setSubmitting] = useState(false)

    const validate = useMemo(() => {
        return (v: VendorRegisterValues) => {
            const errors: Partial<Record<keyof VendorRegisterValues, any>> = {}

            if (!trimOrEmpty(v.name)) errors.name = 'Vendor name is required'

            // ✅ Better: check ALL contact rows
            const contactRows = v.contactPerson || []
            const hasAnyContact = contactRows.some((c) => !!trimOrEmpty(c?.name) || !!trimOrEmpty(c?.email) || !!trimOrEmpty(c?.fullPhoneNumber))

            if (!hasAnyContact) {
                // store as a simple string error so we can show a nice alert box
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
            {/* ✅ Column layout + max height */}
            <div className="flex max-h-[85vh] flex-col">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 pb-3 border-b">
                    <div >
                        <h5 className="text-lg font-semibold">Register as Vendor</h5>
                        <div className="mt-0.5 text-xs opacity-70">
                            Submit details for approval. Your request will be visible in the pending approvals list.
                        </div>
                    </div>


                </div>

                {/* ✅ Scrollable body */}
                <div className="flex-1 overflow-y-auto pr-1 pt-4">
                    <Formik initialValues={initialValues} validate={validate} onSubmit={handleSubmit}>
                        {({ values, setFieldValue, errors, touched, isValid, dirty }) => {
                            const contactError = typeof (errors as any)?.contactPerson === 'string' ? (errors as any)?.contactPerson : ''
                            const contactCount = (values.contactPerson || []).length

                            return (
                                <Form className="min-h-full">
                                    <FormContainer>
                                        {/* === Vendor info === */}
                                        <div className="rounded-2xl border bg-white p-4">
                                            <div className="mb-3 flex items-center gap-2">
                                                <div className="text-sm font-semibold">Vendor Information</div>
                                                <div className="text-xs opacity-60">Basic details</div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <FormItem
                                                    asterisk
                                                    label="Vendor Name"
                                                    labelClass="text-xs !mb-1"
                                                    invalid={!!(touched.name && errors.name)}
                                                    errorMessage={errors.name as any}
                                                >
                                                    <Field name="name" component={Input} size="sm" placeholder="Enter vendor name" />
                                                </FormItem>

                                                <FormItem label="GSTIN" labelClass="text-xs !mb-1">
                                                    <Field name="gstin" component={Input} size="sm" placeholder="GSTIN (optional)" />
                                                </FormItem>

                                                <FormItem label="PAN Number" labelClass="text-xs !mb-1">
                                                    <Field name="panNumber" component={Input} size="sm" placeholder="PAN (optional)" />
                                                </FormItem>

                                                <FormItem label="MSME" labelClass="text-xs !mb-1">
                                                    <Field name="msme" component={Input} size="sm" placeholder="MSME (optional)" />
                                                </FormItem>

                                                <FormItem label="City" labelClass="text-xs !mb-1">
                                                    <Field name="city" component={Input} size="sm" placeholder="City" />
                                                </FormItem>

                                                <FormItem label="District" labelClass="text-xs !mb-1">
                                                    <Field name="district" component={Input} size="sm" placeholder="District" />
                                                </FormItem>

                                                <FormItem label="Street / Address" labelClass="text-xs !mb-1" className="md:col-span-2">
                                                    <Field name="street" component={Input} size="sm" placeholder="Street / Address" />
                                                </FormItem>

                                                <FormItem label="Postal Code" labelClass="text-xs !mb-1">
                                                    <Field name="postalCode" component={Input} size="sm" placeholder="Postal code" />
                                                </FormItem>

                                                <FormItem label="Company Code" labelClass="text-xs !mb-1">
                                                    <Field name="companyCode" component={Input} size="sm" placeholder="Company code (optional)" />
                                                </FormItem>

                                                <FormItem label="Region" labelClass="text-xs !mb-1">
                                                    <Field name="region" component={Input} size="sm" placeholder="Region (optional)" />
                                                </FormItem>

                                                <FormItem label="Language Key" labelClass="text-xs !mb-1">
                                                    <Field name="languageKey" component={Input} size="sm" placeholder="Language key (optional)" />
                                                </FormItem>
                                            </div>
                                        </div>

                                        {/* === Contact section (UI improved) === */}
                                        <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-sm font-semibold">Contact Person</div>
                                                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                                            {contactCount}
                                                        </span>
                                                    </div>
                                                    <div className="mt-0.5 text-xs opacity-70 flex items-center gap-1">
                                                        <MdInfoOutline className="opacity-60" />
                                                        Add at least one contact method (name / email / phone).
                                                    </div>
                                                </div>

                                                <Button
                                                    type="button"
                                                    size="xs"
                                                    variant="twoTone"
                                                    icon={<MdAdd />}
                                                    onClick={() => setFieldValue('contactPerson', [...(values.contactPerson || []), emptyContact()])}
                                                >
                                                    Add Contact
                                                </Button>
                                            </div>

                                            {/* ✅ Better error display (not inside input) */}
                                            {contactError ? (
                                                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                                    {contactError}
                                                </div>
                                            ) : null}

                                            <div className="mt-4 space-y-3">
                                                {(values.contactPerson || []).map((c, idx) => {
                                                    return (
                                                        <div key={idx} className="rounded-2xl border bg-white p-4 shadow-sm">
                                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                                                                        {idx + 1}
                                                                    </span>
                                                                    <div className="text-sm font-medium">Contact #{idx + 1}</div>
                                                                </div>

                                                                {contactCount > 1 ? (
                                                                    <Button
                                                                        type="button"
                                                                        size="xs"
                                                                        variant="plain"
                                                                        color="red"
                                                                        icon={<MdClose />}
                                                                        onClick={() => {
                                                                            const next = [...values.contactPerson]
                                                                            next.splice(idx, 1)
                                                                            setFieldValue('contactPerson', next.length ? next : [emptyContact()])
                                                                        }}
                                                                    >
                                                                        Remove
                                                                    </Button>
                                                                ) : null}
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                <FormItem label="Name" labelClass="text-xs !mb-1">
                                                                    <Input
                                                                        size="sm"
                                                                        prefix={<MdPerson className="opacity-70" />}
                                                                        value={c.name}
                                                                        placeholder="Full name"
                                                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                                            setFieldValue(`contactPerson.${idx}.name`, e.target.value)
                                                                        }
                                                                    />
                                                                </FormItem>

                                                                <FormItem label="Email" labelClass="text-xs !mb-1">
                                                                    <Input
                                                                        size="sm"
                                                                        prefix={<MdEmail className="opacity-70" />}
                                                                        value={c.email}
                                                                        placeholder="Email address"
                                                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                                            setFieldValue(`contactPerson.${idx}.email`, e.target.value)
                                                                        }
                                                                    />
                                                                </FormItem>

                                                                <FormItem label="Phone" labelClass="text-xs !mb-1">
                                                                    <Input
                                                                        size="sm"
                                                                        prefix={<MdPhone className="opacity-70" />}
                                                                        value={c.fullPhoneNumber}
                                                                        placeholder="+91..."
                                                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                                            setFieldValue(`contactPerson.${idx}.fullPhoneNumber`, e.target.value)
                                                                        }
                                                                    />
                                                                </FormItem>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {/* ✅ Sticky footer */}
                                        <div className="sticky bottom-0 mt-5 flex justify-end gap-2 border-t bg-white/95 py-3 backdrop-blur">
                                            <Button type="button" size="sm" variant="plain" disabled={submitting} onClick={onClose}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" size="sm" variant="solid" disabled={submitting || !dirty || !isValid}>
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
