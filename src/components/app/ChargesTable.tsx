import { Field, FormikHelpers } from 'formik'
import { Input, Table } from '../ui'
import { ChangeEvent } from 'react'
import { AmountType, ChargesType, NegotiationType } from '@/@types/app'
import { CHARGE_TYPES } from '@/utils/data'
import { MdLabelImportant } from 'react-icons/md'

const { Tr, Th, Td, THead, TBody } = Table

type ChargesTableProps<T> = {
    isEditable?: boolean
    values: T
    setValues: FormikHelpers<T>['setValues']
    handleAmountCalculation: (_values: T) => AmountType
    negotiation?: NegotiationType
}

const ChargesTable = <T extends { charges?: ChargesType; amount: AmountType; items?: { taxRate?: number }[] }>({
    isEditable = true,
    values,
    setValues,
    handleAmountCalculation,
    negotiation,
}: ChargesTableProps<T>) => {
    const gstRate = Math.max(...(values?.items?.map((i) => +(i.taxRate ?? 0)) || [])) || 0

    return (
        <Table compact className='text-xs small-table' containerClassName='border border-slate-200'>
            <THead className='sticky top-0'>
                <Tr className='whitespace-nowrap'>
                    <Th>Charges</Th>
                    <Th className='w-1/3'>Description</Th>
                    <Th className='text-right'>Amount</Th>
                    <Th className='text-right'>GST ({gstRate + '%'})</Th>
                    {negotiation && (
                        <Th className='text-right'>
                            <div className='flex gap-2 items-center justify-end'>
                                <MdLabelImportant color='red' className='size-5' />
                                <span>Expected</span>
                            </div>
                        </Th>
                    )}
                </Tr>
            </THead>
            <TBody>
                {CHARGE_TYPES?.map((type) => (
                    <Tr key={`charges:` + type.value}>
                        <Td className='whitespace-nowrap'>
                            <div className='pr-4'>
                                <b>{type.label}</b>
                            </div>
                        </Td>
                        <Td>
                            <Field
                                type='text'
                                size={'sm'}
                                name={`charges[${type.value}].description`}
                                className='h-auto p-0 border-none outline-none ring-0 rounded-none'
                                placeholder='Type here'
                                component={Input}
                                disabled={!isEditable}
                            />
                        </Td>
                        <Td className='text-right'>
                            <Field
                                disabled={!isEditable}
                                type='number'
                                size={'sm'}
                                name={`charges[${type.value}].amount`}
                                className='h-auto p-0 border-none outline-none ring-0 rounded-none text-right w-20'
                                placeholder='0.00'
                                component={Input}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    setValues((prev) => {
                                        const newValue = {
                                            ...prev,
                                            charges: {
                                                ...(prev.charges || {}),
                                                [type.value]: {
                                                    ...(prev.charges?.[type.value as keyof ChargesType] || {
                                                        type: type.value,
                                                        description: '',
                                                    }),
                                                    gstRate,
                                                    amount: +e.target.value,
                                                    gstAmount: +(+e.target.value * (gstRate / 100)).toFixed(2),
                                                },
                                            } as ChargesType,
                                        }
                                        return {
                                            ...newValue,
                                            amount: handleAmountCalculation(newValue as T),
                                        }
                                    })
                                }
                            />
                        </Td>
                        <Td className='text-right'>{values?.charges?.[type.value as keyof ChargesType]?.gstAmount?.toFixed(2)}</Td>
                        {negotiation && <Td className='text-right'>{negotiation?.charges?.[type.value as keyof ChargesType]?.toFixed(2)}</Td>}
                    </Tr>
                ))}
            </TBody>
        </Table>
    )
}

export default ChargesTable
