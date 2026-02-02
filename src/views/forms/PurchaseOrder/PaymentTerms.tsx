import { OptionType, POType } from '@/@types/app'
import { Button, FormItem, Input, Select, Table } from '@/components/ui'
import { Field, FormikHelpers } from 'formik'
import { ChangeEvent } from 'react'
import { MdAdd, MdClose } from 'react-icons/md'

const { Tr, Th, Td, THead, TBody, TFoot } = Table

const initialValues = {
    paymentType: '',
    baseDateType: '',
    payOn: '',
    payValuePercent: 0,
    payValueAmount: 0,
    days: 0,
    remarks: '',
}

const options = {
    paymentTerms: [
        {
            label: 'Down Payment',
            value: 'downPayment',
        },
        {
            label: 'Down Payment PI',
            value: 'downPaymentPI',
        },
        {
            label: 'Against Bill',
            value: 'againstBill',
        },
    ],
    baseDateTypes: [
        {
            label: 'Document Date',
            value: 'documentDate',
        },
        {
            label: 'Posting Date',
            value: 'postingDate',
        },
        {
            label: 'Transaction Date',
            value: 'transactionDate',
        },
    ],
    payOn: [
        {
            label: 'Basic Amount',
            value: 'basicAmount',
        },
        {
            label: 'Net Amount',
            value: 'netAmount',
        },
        {
            label: 'Balance Amount',
            value: 'balanceAmount',
        },
    ],
}

type PaymentTermsProps = {
    values: POType
    setFieldValue: FormikHelpers<POType>['setFieldValue']
    setValues: FormikHelpers<POType>['setValues']
}

export default function PaymentTerms({ values, setFieldValue, setValues }: PaymentTermsProps) {
    return (
        <Table compact className='relative small-table'>
            <THead className='sticky top-0'>
                <Tr>
                    <Th>#</Th>
                    <Th>Payment Type</Th>
                    <Th>Base Date Type</Th>
                    <Th>Pay On</Th>
                    <Th>Pay Value (%)</Th>
                    <Th>Days</Th>
                    <Th>Remarks</Th>
                    <Th></Th>
                </Tr>
            </THead>
            <TBody>
                {values.paymentTerms?.map((i, idx) => (
                    <Tr key={'pt:' + idx}>
                        <Td>{idx + 1}.</Td>
                        <Td>
                            {values?.readyForAuthorization ? (
                                options.paymentTerms.find((_i) => _i.value === i.paymentType)?.label
                            ) : (
                                <FormItem className='!mb-0' labelClass='text-[11px]'>
                                    <Field
                                        isDisabled={values?.readyForAuthorization}
                                        type='text'
                                        name={`paymentTerms[${idx}].paymentType`}
                                        component={Select}
                                        menuPosition='fixed'
                                        options={options.paymentTerms}
                                        size={'xs'}
                                        value={options.paymentTerms.find((_i) => _i.value === i.paymentType) || null}
                                        onChange={(o: OptionType) => setFieldValue(`paymentTerms[${idx}].paymentType`, o.value)}
                                    />
                                </FormItem>
                            )}
                        </Td>
                        <Td>
                            {values?.readyForAuthorization ? (
                                options.baseDateTypes.find((_i) => _i.value === i.baseDateType)?.label
                            ) : (
                                <FormItem className='!mb-0' labelClass='text-[11px]'>
                                    <Field
                                        isDisabled={values?.readyForAuthorization}
                                        type='text'
                                        name={`paymentTerms[${idx}].baseDateType`}
                                        component={Select}
                                        menuPosition='fixed'
                                        options={options.baseDateTypes}
                                        size={'xs'}
                                        value={options.baseDateTypes.find((_i) => _i.value === i.baseDateType) || null}
                                        onChange={(o: OptionType) => setFieldValue(`paymentTerms[${idx}].baseDateType`, o.value)}
                                    />
                                </FormItem>
                            )}
                        </Td>
                        <Td>
                            {values?.readyForAuthorization ? (
                                options.payOn.find((_i) => _i.value === i.payOn)?.label
                            ) : (
                                <FormItem className='!mb-0' labelClass='text-[11px]'>
                                    <Field
                                        isDisabled={values?.readyForAuthorization}
                                        type='text'
                                        name={`paymentTerms[${idx}].payOn`}
                                        component={Select}
                                        menuPosition='fixed'
                                        options={options.payOn}
                                        size={'xs'}
                                        value={options.payOn.find((_i) => _i.value === i.payOn) || null}
                                        onChange={(o: OptionType) => setFieldValue(`paymentTerms[${idx}].payOn`, o.value)}
                                    />
                                </FormItem>
                            )}
                        </Td>
                        <Td className='w-25'>
                            {values?.readyForAuthorization ? (
                                i.payValuePercent
                            ) : (
                                <Input
                                    size='xs'
                                    placeholder='Pay Value Percent'
                                    className='text-right'
                                    value={i.payValuePercent}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue(`paymentTerms[${idx}].payValuePercent`, e.target.value)}
                                />
                            )}
                        </Td>
                        <Td className='w-20'>
                            {values?.readyForAuthorization ? (
                                i.days
                            ) : (
                                <Input
                                    size='xs'
                                    placeholder='Days'
                                    className='text-right'
                                    value={i.days}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue(`paymentTerms[${idx}].days`, e.target.value)}
                                />
                            )}
                        </Td>
                        <Td className='flex-1'>
                            {values?.readyForAuthorization ? (
                                i.remarks
                            ) : (
                                <Input
                                    size='xs'
                                    placeholder='Remarks'
                                    value={i.remarks}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue(`paymentTerms[${idx}].remarks`, e.target.value)}
                                />
                            )}
                        </Td>
                        <Td>
                            {!values?.readyForAuthorization && (
                                <Button
                                    type='button'
                                    tabIndex={-1}
                                    variant='plain'
                                    size='xs'
                                    className='w-fit h-fit text-red-600'
                                    icon={<MdClose />}
                                    onClick={() =>
                                        setValues((prev) => ({
                                            ...prev,
                                            paymentTerms: prev.paymentTerms.slice(0, idx).concat(prev.paymentTerms.slice(idx + 1, values.paymentTerms?.length)),
                                        }))
                                    }
                                />
                            )}
                        </Td>
                    </Tr>
                ))}
                {/* {rows.map((i, idx) => (
                    <Tr key={'pt:' + idx}>
                        <Td>{idx + 1}.</Td>
                        <Td>{i.paymentType}</Td>
                        <Td>{i.baseDateType}</Td>
                        <Td>{formatDate(i.payOn as string)}</Td>
                        <Td>{i.payValuePercent}</Td>
                        <Td>{i.payValueAmount}</Td>
                        <Td>{i.days}</Td>
                        <Td>{i.remarks}</Td>
                    </Tr>
                ))} */}
            </TBody>
            {!values?.readyForAuthorization && (
                <TFoot>
                    <Tr>
                        <Td colSpan={7}>
                            <Button
                                type='button'
                                variant='twoTone'
                                size='xs'
                                icon={<MdAdd size={14} />}
                                className='mx-auto block'
                                onClick={() =>
                                    setValues((prev) => ({
                                        ...prev,
                                        paymentTerms: (prev.paymentTerms || []).concat([initialValues]),
                                    }))
                                }>
                                Add More
                            </Button>
                        </Td>
                    </Tr>
                </TFoot>
            )}
        </Table>
    )
}
