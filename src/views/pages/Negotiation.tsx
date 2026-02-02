import { CSType, ChargesType, NegotiationItemType, NegotiationType, OptionType, RFQType, TermsAndConditionsType } from '@/@types/app'
import { Button, FormContainer, FormItem, Input, Select, Table, Tag } from '@/components/ui'
import ApiService from '@/services/ApiService'
import { CHARGE_TYPES, getIndentID, termsConditionsOptions } from '@/utils/data'
import { formatDateTime } from '@/utils/formatDate'
import { showAlert, showError } from '@/utils/hoc/showAlert'
import classNames from 'classnames'
import { Field, Form, Formik, FormikProps, getIn } from 'formik'
import React, { ChangeEvent, useEffect, useState } from 'react'
import { MdArrowDropDown } from 'react-icons/md'

const { Tr, Th, Td, THead, TBody } = Table

const negotiationBasis = [
    { label: 'Rate', value: ['rate'] },
    { label: 'Dis %', value: ['discountPercent'] },
    { label: 'Dis Amt.', value: ['discountAmount'] },
    { label: 'B.A.D', value: ['basicAfterDiscount'] },
    { label: 'Rate & Dis %', value: ['rate', 'discountPercent'] },
    { label: 'Rate & Dis Amt', value: ['rate', 'discountAmount'] },
]

type List<T> = {
    [vendorCode: string]: T
}

type NegotiationVendorType = {
    vendorCode: string
    vendorName: string
    vendorLocation: string
    quotationNumber: string
    charges?: NegotiationType['charges']
    termsConditions?: TermsAndConditionsType
    items: Omit<NegotiationItemType, 'savings' | 'selected'>[]
}

export default function Negotiation({ csSheet }: { csSheet: CSType }) {
    const [rfq, setRfq] = useState<RFQType>()
    const [vendors, setVendors] = useState<List<NegotiationVendorType>>({})
    const [negotiations, setNegotiations] = useState<List<NegotiationType>>({})

    useEffect(() => {
        if (!csSheet?.rfqNumber) return
        ;(async () => {
            try {
                const [rfqResponse, negotiationResponse] = await Promise.all([
                    ApiService.fetchData<RFQType>({
                        method: 'get',
                        url: '/rfq/negotiation',
                        params: {
                            rfqNumber: csSheet.rfqNumber,
                        },
                    }),
                    ApiService.fetchData<List<NegotiationType>>({
                        method: 'get',
                        url: '/negotiation',
                        params: {
                            rfqNumber: csSheet.rfqNumber,
                        },
                    }),
                ])

                if (negotiationResponse.data) setNegotiations(negotiationResponse.data)
                setRfq(rfqResponse.data)
                const vendors: List<NegotiationVendorType> = {}

                for (const item of csSheet.items) {
                    for (const vendor of item.vendors) {
                        const csVendor = csSheet.vendors.find((v) => v.vendorCode === vendor.vendorCode)
                        if (!csVendor) continue
                        if (!vendors[vendor.vendorCode])
                            vendors[vendor.vendorCode] = {
                                vendorCode: vendor.vendorCode,
                                quotationNumber: csVendor?.quotationNumber as string,
                                vendorName: csVendor?.name as string,
                                vendorLocation: csVendor?.vendorLocation as string,
                                charges: {
                                    otherCharges: csVendor?.charges?.otherCharges?.amount,
                                    packagingForwarding: csVendor?.charges?.packagingForwarding?.amount,
                                },
                                termsConditions: csVendor?.termsConditions,
                                items: [],
                            }

                        vendors[vendor.vendorCode].items.push({
                            indentNumber: item.indentNumber,
                            itemCode: item.itemCode,
                            itemDescription: item.itemDescription,
                            rfqMake: rfqResponse?.data?.items?.find((i) => getIndentID(i) === getIndentID(item))?.rfqMake as string,
                            qty: item.qty,
                            unit: item.unit,
                            leastValues: item.leastValues,
                            rate: vendor.rate,
                            discountAmount: vendor.discount,
                            discountPercent: +((vendor.discount * 100) / vendor?.amount?.basic).toFixed(2),
                            make: vendor.make,
                            basicAfterDiscount: vendor.basicAfterDiscount,
                        })
                    }
                }

                setVendors(vendors)
            } catch (error) {
                console.error(error)
            }
        })()
    }, [csSheet])

    return Object.keys(vendors)?.map((vendorCode) => (
        <VendorNegotiation key={'nv:' + vendorCode} vendors={vendors} negotiations={negotiations} vendorCode={vendorCode} rfq={rfq} />
    ))
}

type NegotiationFormProps = {
    vendorCode: string
    vendors: List<NegotiationVendorType>
    negotiations: { [vendorCode: string]: NegotiationType }
    rfq?: RFQType
}

const VendorNegotiation = ({ vendorCode, vendors, negotiations, rfq }: NegotiationFormProps) => {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState<number | null>(null)
    const [negotiation, setNegotiation] = useState<NegotiationType>({})

    useEffect(() => {
        if (!negotiations?.[vendorCode]) return
        setNegotiation({
            ...negotiations[vendorCode],
            items: negotiations[vendorCode].items?.map((i) => ({ ...i, selected: true })),
        })
    }, [negotiations, vendorCode])

    const handleItemCalculation = (form: FormikProps<NegotiationType>, idx: number, item: Partial<NegotiationItemType>) => {
        const originalItem = vendors[vendorCode]?.items?.[idx]
        if (!originalItem) return

        const currentItem = { ...form.values.items?.[idx], ...item } as NegotiationItemType
        const baseAmount = +currentItem.rate * originalItem.qty
        let discountPercent = currentItem.discountPercent ?? 0
        let discountAmount = currentItem.discountAmount ?? 0

        if (currentItem.negotiationOn?.includes('discountAmount')) {
            discountPercent = baseAmount ? +((discountAmount * 100) / baseAmount).toFixed(2) : 0
        } else if (currentItem.negotiationOn?.includes('discountPercent')) {
            discountAmount = +((baseAmount * discountPercent) / 100).toFixed(2)
        } else if (discountPercent) {
            discountAmount = +((baseAmount * discountPercent) / 100).toFixed(2)
        }

        const basicAfterDiscount = +(baseAmount - discountAmount).toFixed(2)
        const savings = +(originalItem.basicAfterDiscount - basicAfterDiscount).toFixed(2)

        const updatedItems = (form.values.items || []).map((i, _idx) =>
            _idx === idx ? { ...currentItem, discountAmount, discountPercent, basicAfterDiscount, savings } : i,
        )

        const itemsSavings = updatedItems.reduce((sum, i) => sum + (i.savings || 0), 0)

        form.setValues((formValues) => ({
            ...formValues,
            items: updatedItems,
            savings: {
                ...formValues.savings,
                items: itemsSavings,
                total: (formValues.savings?.charges || 0) + itemsSavings,
            },
        }))
    }

    const handleChargesCalculation = (form: FormikProps<NegotiationType>, updated: Partial<ChargesType>) => {
        const key = Object.keys(updated)[0] as keyof ChargesType
        const charges = {
            ...form.values.charges,
            [key]: Number(updated[key]) || 0,
        }

        const chargesSavings =
            Object.values(vendors[vendorCode].charges || {}).reduce((sum, c) => sum + (c || 0), 0) -
            Object.values(charges).reduce((sum, c) => sum + (c || 0), 0)

        form.setValues((prev) => ({
            ...prev,
            charges,
            savings: {
                ...prev.savings,
                charges: chargesSavings,
                total: (prev.savings?.items || 0) + chargesSavings,
            },
        }))
    }

    const handleSubmit = async (values: NegotiationType, status: 0 | 1) => {
        setLoading(status)
        try {
            const response = await ApiService.fetchData<{ success: true; doc: NegotiationType }>({
                method: values?._id ? 'put' : 'post',
                url: '/negotiation',
                data: {
                    rfqNumber: rfq?.rfqNumber,
                    quotationNumber: vendors[vendorCode]?.quotationNumber,
                    vendorCode: vendors[vendorCode]?.vendorCode,
                    ...values,
                    items: values.items?.map((i, idx) => ({
                        ...i,
                        indentNumber: vendors[vendorCode]?.items?.[idx]?.indentNumber,
                        itemCode: vendors[vendorCode]?.items?.[idx]?.itemCode,
                    })),
                    status,
                },
            })
            if (response.data.success) {
                showAlert(`Negotiation ${status === 0 ? 'saved' : 'saved & sent'} successfully.`)
                const preserveUserName = status === 0 ? 'submittedByUser' : 'savedByUser'
                setNegotiation((prev) => ({
                    ...response.data.doc,
                    [preserveUserName]: prev[preserveUserName],
                    items: response.data.doc?.items?.map((i) => ({ ...i, selected: true })),
                }))
            }
        } catch (error) {
            if (error?.response?.status === 500) showError('Failed to save negotiation. Please contact support.')
            else if (error?.response?.data?.message) showError(error?.response?.data?.message)
            console.error(error)
        }
        setLoading(null)
    }

    const handleSend = async () => {
        setLoading(2)
        try {
            const response = await ApiService.fetchData<{ success: true; doc: NegotiationType }>({
                method: 'get',
                url: '/negotiation/send',
                params: {
                    id: negotiations[vendorCode]._id,
                },
            })
            if (response.data.success) {
                showAlert(`Negotiation sent successfully.`)
                setNegotiation((prev) => ({
                    ...response.data.doc,
                    savedByUser: prev.savedByUser,
                    items: response.data.doc?.items?.map((i) => ({ ...i, selected: true })),
                }))
            }
        } catch (error) {
            if (error?.response?.status === 500) showError('Failed to send. Please contact support.')
            else if (error?.response?.data?.message) showError(error?.response?.data?.message)
            console.error(error)
        }
        setLoading(null)
    }

    const chargeL1Vendor = vendors[vendorCode].charges
        ? Object.values(vendors)?.toSorted(
              (a, b) => Object.values(b.charges || {}).reduce((sum, i) => sum + i, 0) - Object.values(a.charges || {}).reduce((sum, i) => sum + i, 0),
          )?.[0]
        : null

    const isSent = negotiation?.status === 1

    return (
        <div className='rounded-sm my-2 ring-1 mx-1 ring-gray-200'>
            <div className='flex items-center justify-between cursor-pointer p-4' onClick={() => setIsOpen((state) => !state)}>
                <div className='flex flex-col'>
                    <span>{vendors[vendorCode].vendorName}</span>
                    <span className='text-xs opacity-80 inline-block'>{vendors[vendorCode].vendorLocation}</span>
                </div>
                <div className='flex gap-2 items-center'>
                    <div>
                        {negotiation?.status === 0 && (
                            <div className='text-xs flex items-center gap-1'>
                                <Tag prefix prefixClass={classNames('size-2.5', isSent ? 'bg-green-500' : 'bg-blue-500')} className='ring-0 border-0 p-0'>
                                    Drafted
                                </Tag>
                                {negotiation?._id && (
                                    <>
                                        <span>—</span>
                                        <span>{formatDateTime(negotiation.savedAt)}</span>
                                        <span>by</span>
                                        <span>{negotiation.savedByUser}</span>
                                    </>
                                )}
                            </div>
                        )}
                        {negotiation.submittedAt && (
                            <div className='text-xs flex items-center gap-1'>
                                <Tag prefix prefixClass={classNames('size-2.5', isSent ? 'bg-green-500' : 'bg-transparent')} className='ring-0 border-0 p-0'>
                                    {negotiation?.status === 0 ? 'Last ' : ''}Sent
                                </Tag>
                                {negotiation?._id && (
                                    <>
                                        <span>—</span>
                                        <span>{formatDateTime(negotiation.submittedAt)}</span>
                                        <span>by</span>
                                        <span>{negotiation.submittedByUser}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <MdArrowDropDown className={classNames('size-6 opacity-80', !isOpen ? 'rotate-[360deg]' : 'rotate-[180deg]')} />
                </div>
            </div>
            {isOpen && (
                <Formik<NegotiationType> enableReinitialize={true} initialValues={negotiation} onSubmit={() => {}}>
                    {(form) => (
                        <Form className={'p-4 border-t border-gray-300'}>
                            <FormContainer className='space-y-4'>
                                <div>
                                    <h6>Item Details</h6>
                                    <Table compact className='text-xs mt-2 border border-gray-200 rounded-sm' borderlessRow={true}>
                                        <THead className='sticky top-0'>
                                            <Tr>
                                                <Th></Th>
                                                <Th>Item Description</Th>
                                                <Th>Particulars</Th>
                                                <Th className='text-right'>L1</Th>
                                                <Th className='text-right'>Vendor</Th>
                                                <Th className='text-right'>Expected</Th>
                                                <Th className='text-right'>Savings</Th>
                                            </Tr>
                                        </THead>
                                        <TBody>
                                            {vendors[vendorCode]?.items?.map((i, idx) => {
                                                const l1Vendor = Object.values(vendors)[+i.leastValues.basicAfterDiscount.vendorCode - 1]?.items?.find(
                                                    (_i) => getIndentID(_i) === getIndentID(i),
                                                )
                                                if (!l1Vendor) return

                                                const itemValues = getIn(form.values, `items[${idx}]`) || {}
                                                const isDisabled = !itemValues.selected || typeof loading === 'number'
                                                const allowedFields = itemValues.negotiationOn || []

                                                return (
                                                    <React.Fragment key={`vendor-${vendors[vendorCode].vendorCode}-${idx}`}>
                                                        <Tr>
                                                            <Td rowSpan={5} className={classNames(idx === 0 ? null : 'border-t border-gray-300', 'align-top')}>
                                                                <Field
                                                                    disabled={loading !== null}
                                                                    size='xs'
                                                                    type='checkbox'
                                                                    className='h-auto p-1'
                                                                    placeholder='0.00'
                                                                    name={`items[${idx}].selected`}
                                                                />
                                                            </Td>
                                                            <Td rowSpan={4} className={classNames(idx === 0 ? null : 'border-t border-gray-300', 'align-top')}>
                                                                <span className='mt-1 inline-block'>{i.itemDescription}</span>
                                                                <br />
                                                                <p>RFQ Make: {i.rfqMake}</p>
                                                            </Td>
                                                            <Td className={classNames(idx === 0 ? null : 'border-t border-gray-300')}>Rate</Td>
                                                            <Td className={classNames(idx === 0 ? null : 'border-t border-gray-300', 'text-right')}>
                                                                {l1Vendor?.rate.toFixed(2)}
                                                            </Td>
                                                            <Td className={classNames(idx === 0 ? null : 'border-t border-gray-300', 'text-right')}>
                                                                {i?.rate.toFixed(2)}
                                                            </Td>
                                                            <Td className={classNames(idx === 0 ? null : 'border-t border-gray-300', 'w-28 p-0')}>
                                                                <Field
                                                                    disabled={isDisabled || !allowedFields.includes('rate')}
                                                                    size='xs'
                                                                    className='border-none outline-none ring-0 text-right p-1'
                                                                    placeholder='0.00'
                                                                    name={`items[${idx}].rate`}
                                                                    component={Input}
                                                                    onChange={({ target }: ChangeEvent<HTMLInputElement>) =>
                                                                        target.value?.split('.')?.[1]?.length > 2
                                                                            ? null
                                                                            : handleItemCalculation(form, idx, { rate: (target.value || 0) as number })
                                                                    }
                                                                />
                                                            </Td>
                                                            <Td
                                                                rowSpan={5}
                                                                className={classNames(
                                                                    idx === 0 ? null : 'border-t border-gray-300',
                                                                    'align-middle w-24 text-right',
                                                                )}>
                                                                {(itemValues.savings || 0)?.toFixed(2)}
                                                            </Td>
                                                        </Tr>
                                                        <Tr>
                                                            <Td>Dis %</Td>
                                                            <Td className='text-right'>{l1Vendor.discountPercent.toFixed(2)}%</Td>
                                                            <Td className='text-right'>{i.discountPercent.toFixed(2)}%</Td>
                                                            <Td className='w-28 p-0'>
                                                                <Field
                                                                    disabled={isDisabled || !allowedFields.includes('discountPercent')}
                                                                    size='xs'
                                                                    className='border-none outline-none ring-0 p-1 text-right'
                                                                    placeholder='0.00'
                                                                    name={`items[${idx}].discountPercent`}
                                                                    component={Input}
                                                                    onChange={({ target }: ChangeEvent<HTMLInputElement>) =>
                                                                        target.value?.split('.')?.[1]?.length > 2
                                                                            ? null
                                                                            : handleItemCalculation(form, idx, {
                                                                                  discountPercent: (target.value || 0) as number,
                                                                              })
                                                                    }
                                                                />
                                                            </Td>
                                                        </Tr>
                                                        <Tr>
                                                            <Td>Dis Amt</Td>
                                                            <Td className='text-right'>{l1Vendor.discountAmount.toFixed(2)}</Td>
                                                            <Td className='text-right'>{i.discountAmount.toFixed(2)}</Td>
                                                            <Td className='w-28 p-0'>
                                                                <Field
                                                                    disabled={isDisabled || !allowedFields.includes('discountAmount')}
                                                                    size='xs'
                                                                    className='border-none outline-none ring-0 p-1 text-right'
                                                                    placeholder='0.00'
                                                                    name={`items[${idx}].discountAmount`}
                                                                    component={Input}
                                                                    onChange={({ target }: ChangeEvent<HTMLInputElement>) =>
                                                                        target.value?.split('.')?.[1]?.length > 2
                                                                            ? null
                                                                            : handleItemCalculation(form, idx, {
                                                                                  discountAmount: (target.value || 0) as number,
                                                                              })
                                                                    }
                                                                />
                                                            </Td>
                                                        </Tr>
                                                        <Tr className='text-xs'>
                                                            <Td className='font-bold'>B.A.D</Td>
                                                            <Td className='font-bold text-right'>{l1Vendor.basicAfterDiscount.toFixed(2)}</Td>
                                                            <Td className='font-bold text-right'>{i.basicAfterDiscount.toFixed(2)}</Td>
                                                            <Td className='font-bold w-28 p-0'>
                                                                <Field
                                                                    disabled={isDisabled || !allowedFields.includes('basicAfterDiscount')}
                                                                    size='xs'
                                                                    className='border-none outline-none ring-0 p-1 text-right'
                                                                    placeholder='0.00'
                                                                    name={`items[${idx}].basicAfterDiscount`}
                                                                    component={Input}
                                                                    onChange={({ target }: ChangeEvent<HTMLInputElement>) =>
                                                                        target.value?.split('.')?.[1]?.length > 2
                                                                            ? null
                                                                            : handleItemCalculation(form, idx, {
                                                                                  basicAfterDiscount: (target.value || 0) as number,
                                                                              })
                                                                    }
                                                                />
                                                            </Td>
                                                        </Tr>
                                                        <Tr>
                                                            <Td className='p-0 pb-0.5'>
                                                                <div className='flex space-between items-center'>
                                                                    <span>
                                                                        <b>QTY:</b> {i.qty} {i.unit}
                                                                    </span>
                                                                    <FormItem
                                                                        className='mb-0 justify-end'
                                                                        label='On'
                                                                        labelClass='w-fit !min-w-auto !h-auto'
                                                                        componentContainerClass='!w-fit'
                                                                        layout='horizontal'>
                                                                        <Field
                                                                            isDisabled={isDisabled}
                                                                            size='xs'
                                                                            className='w-32'
                                                                            name={`items[${idx}].negotiationOn`}
                                                                            options={negotiationBasis}
                                                                            component={Select}
                                                                            menuPosition='fixed'
                                                                            value={negotiationBasis.find(
                                                                                (_i) => _i.value?.join() === itemValues.negotiationOn?.join(),
                                                                            )}
                                                                            onChange={(value: OptionType) => {
                                                                                form.setFieldValue(`items[${idx}]`, {
                                                                                    selected: true,
                                                                                    negotiationOn: value.value,
                                                                                    rate: i.rate,
                                                                                    discountAmount: i.discountAmount,
                                                                                    discountPercent: i.discountPercent,
                                                                                    basicAfterDiscount: i.basicAfterDiscount,
                                                                                    savings: 0,
                                                                                    make: itemValues.make,
                                                                                })
                                                                            }}
                                                                        />
                                                                    </FormItem>
                                                                </div>
                                                            </Td>
                                                            <Td className='text-right'>Make</Td>
                                                            <Td>{l1Vendor?.make}</Td>
                                                            <Td>{i?.make}</Td>
                                                            <Td className='w-28 p-0'>
                                                                <Field
                                                                    disabled={isDisabled}
                                                                    size='xs'
                                                                    className='border-none outline-none ring-0 p-1'
                                                                    placeholder='Enter Item make'
                                                                    name={`items[${idx}].make`}
                                                                    component={Input}
                                                                />
                                                            </Td>
                                                        </Tr>
                                                    </React.Fragment>
                                                )
                                            })}
                                        </TBody>
                                    </Table>
                                </div>
                                <div className='flex gap-4'>
                                    <div className='w-2/3'>
                                        <h6>Other Charges</h6>
                                        <Table compact className='text-xs mt-2 border border-gray-200 rounded-sm'>
                                            <THead className='sticky top-0'>
                                                <Tr>
                                                    <Th></Th>
                                                    <Th>Other Charge</Th>
                                                    <Th className='text-right'>L1</Th>
                                                    <Th className='text-right'>Vendor</Th>
                                                    <Th className='text-right'>Expected</Th>
                                                    <Th className='text-right'>Savings</Th>
                                                </Tr>
                                            </THead>
                                            <TBody>
                                                {Object.values(vendors[vendorCode].charges || {})?.some((cv) => cv > 0) &&
                                                    CHARGE_TYPES.map((field, idx) => (
                                                        <Tr key={'negotiation:' + field.value}>
                                                            <Td></Td>
                                                            <Td>{field.label}</Td>
                                                            <Td className='text-right'>{chargeL1Vendor?.charges?.[field.value]?.toFixed(2)}</Td>
                                                            <Td className='text-right'>{vendors[vendorCode].charges?.[field.value]?.toFixed(2)}</Td>
                                                            <Td className='p-0'>
                                                                <Field
                                                                    disabled={loading !== null}
                                                                    type='number'
                                                                    className='text-right border-none outline-0 ring-0'
                                                                    name={`charges[${field.value}]`}
                                                                    component={Input}
                                                                    size={'xs'}
                                                                    placeholder='0.00'
                                                                    onChange={({ target }: ChangeEvent<HTMLInputElement>) =>
                                                                        handleChargesCalculation(form, { [field.value]: target.value })
                                                                    }
                                                                />
                                                            </Td>
                                                            {idx === 0 && (
                                                                <Td rowSpan={2} className='text-right'>
                                                                    {(form.values.savings?.charges || 0)?.toFixed(2)}
                                                                </Td>
                                                            )}
                                                        </Tr>
                                                    ))}
                                            </TBody>
                                        </Table>
                                    </div>
                                    <div className='w-1/3'>
                                        <h6>Overall Savings</h6>
                                        <Table compact className='text-xs mt-2 border border-gray-200 rounded-sm'>
                                            <TBody>
                                                <Tr>
                                                    <Td>From Items</Td>
                                                    <Td className='text-right'>{(form.values.savings?.items || 0)?.toFixed(2)}</Td>
                                                </Tr>
                                                <Tr>
                                                    <Td>From Other Charges</Td>
                                                    <Td className='text-right'>{(form.values.savings?.charges || 0)?.toFixed(2)}</Td>
                                                </Tr>
                                                <Tr className='font-bold'>
                                                    <Td>Total</Td>
                                                    <Td className='text-right'>{(form.values.savings?.total || 0)?.toFixed(2)}</Td>
                                                </Tr>
                                            </TBody>
                                        </Table>
                                    </div>
                                </div>
                                <div>
                                    <h6>Terms & Conditions</h6>
                                    <Table compact className='text-xs mt-2 border border-gray-200 rounded-sm'>
                                        <THead className='sticky top-0'>
                                            <Tr>
                                                <Th></Th>
                                                <Th>Head</Th>
                                                <Th>RFQ Terms</Th>
                                                <Th>Quotation Terms</Th>
                                                <Th>Expected Terms</Th>
                                            </Tr>
                                        </THead>
                                        <TBody>
                                            {termsConditionsOptions.map((term) => (
                                                <Tr key={'negotiation:' + term.value}>
                                                    <Td></Td>
                                                    <Td>{term.label}</Td>
                                                    <Td>{rfq?.termsConditions?.[term.value]}</Td>
                                                    <Td>{vendors[vendorCode].termsConditions?.[term.value]}</Td>
                                                    <Td className='p-0'>
                                                        <Field
                                                            disabled={loading !== null}
                                                            className='border-none outline-0 ring-0'
                                                            name={`termsConditions[${term.value}]`}
                                                            component={Input}
                                                            size={'xs'}
                                                            placeholder='Type here'
                                                        />
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </TBody>
                                    </Table>
                                </div>
                                <div className='flex gap-1 justify-end'>
                                    {negotiation?._id && (
                                        <Button
                                            size='xs'
                                            type='button'
                                            variant='solid'
                                            disabled={loading !== null && loading < 2}
                                            loading={loading === 2}
                                            color='teal'
                                            onClick={() => handleSend()}>
                                            Resend
                                        </Button>
                                    )}
                                    <Button
                                        size='xs'
                                        type='button'
                                        variant='solid'
                                        disabled={loading === 0}
                                        loading={loading === 1}
                                        onClick={() => handleSubmit(form.values, 1)}>
                                        Save & Send
                                    </Button>
                                    <Button
                                        size='xs'
                                        type='button'
                                        variant='solid'
                                        color='green'
                                        disabled={loading === 1}
                                        loading={loading === 0}
                                        onClick={() => handleSubmit(form.values, 0)}>
                                        Save
                                    </Button>
                                </div>
                            </FormContainer>
                        </Form>
                    )}
                </Formik>
            )}
        </div>
    )
}
