import { POItem, POType, TaxChargeType } from '@/@types/app'
import { Button, DatePicker, Dialog, FormItem, Input, Select, Table } from '@/components/ui'
import { formatDate } from '@/utils/formatDate'
import { Field, FieldProps, FormikErrors, FormikHelpers, getIn } from 'formik'
import POCSList from './POCSList'
import { ChangeEvent, useEffect, useState } from 'react'
import { handleAmountCalculation, handleItemAmount } from '@/utils/amountCalculation'
import { chargeNatures } from '@/utils/data'
import { MdEdit } from 'react-icons/md'
import { HiOutlineCalendar } from 'react-icons/hi'
import classNames from 'classnames'
import { showError } from '@/utils/hoc/showAlert'
import TextAreaExtended from '@/components/app/TextAreaExtended'

const { Tr, Th, Td, THead, TBody } = Table

type POItemsTableProps = {
    isEditable: boolean
    errors?: FormikErrors<POType>
    setFieldValue?: FormikHelpers<POType>['setFieldValue']
    setValues?: FormikHelpers<POType>['setValues']
    items: POType['items']
    values: POType
    isPurchaseRequest: boolean
}

export default function POItemsTable({ isEditable = false, setFieldValue, values, setValues, items, isPurchaseRequest, errors }: POItemsTableProps) {
    const [taxModalState, setTaxModalState] = useState<{ isOpen: boolean; item: POItem } | null>(null)
    const [toleranceModalState, setToleranceModalState] = useState<{ isOpen: boolean; item: POItem } | null>(null)
    const [csModalState, setCSModalState] = useState<{ indentNumber: string; itemCode: string; vendorCode: string } | null>(null)

    const calculationHandlerWrapper = (_values: POItem) => {
        if (!setValues) return
        setValues((prev) =>
            handleAmountCalculation({
                ...prev,
                items: prev.items?.map((i) => (i.itemCode !== _values.itemCode || i.indentNumber !== _values.indentNumber ? i : handleItemAmount(_values))),
            }),
        )
    }

    return (
        <div className='overflow-auto z-auto'>
            <Table compact className='relative small-table bordered-cols' containerClassName='overflow-x-visible' borderlessRow={false}>
                <THead className='sticky top-0 z-10'>
                    <Tr className='whitespace-nowrap'>
                        <Th>#</Th>
                        <Th>Item Description</Th>
                        <Th>HSN Code</Th>
                        <Th>Make</Th>
                        <Th>Tech Spec</Th>
                        <Th>Qty</Th>
                        <Th>
                            <div className='flex items-center justify-between gap-4'>
                                <span>
                                    <span className='text-red-500'>*</span> Schedule
                                </span>
                                {isEditable && (
                                    <span>
                                        <DatePicker
                                            size='xs'
                                            className='w-9 bg-slate-700/20 text-slate-800 disabled-input-suffix'
                                            inputSuffix={<HiOutlineCalendar className='text-lg cursor-pointer' />}
                                            inputFormat='DD/MM/YYYY'
                                            value={null}
                                            onChange={(date) =>
                                                setValues?.((prev) => ({
                                                    ...prev,
                                                    items: prev.items.map((i) => ({ ...i, schedule: date ? date.toISOString() : null })),
                                                }))
                                            }
                                        />
                                    </span>
                                )}
                            </div>
                        </Th>
                        <Th>Unit</Th>
                        {isPurchaseRequest && (
                            <>
                                <Th>CS</Th>
                                <Th>CS Date</Th>
                            </>
                        )}
                        <Th className='text-right'>
                            <span className='text-red-500'>*</span> Rate
                        </Th>
                        <Th className='text-right'>Basic Amount</Th>
                        <Th className='text-right'>Tax</Th>
                        <Th className='text-right'>Net Amount</Th>
                        <Th>Tolerance</Th>
                        <Th>Remarks</Th>
                    </Tr>
                </THead>
                <TBody>
                    {items
                        ?.map((i, index) => (
                            <Tr key={i.itemCode + index}>
                                <Td>{index + 1}</Td>
                                <Td>{i.itemDescription}</Td>
                                <Td>{i.hsnCode}</Td>
                                <Td>
                                    {isEditable ? (
                                        <TextAreaExtended
                                            isEditable
                                            title='Make'
                                            name={`items[${index}].make`}
                                            content={i.make}
                                            setContent={(content) => setFieldValue?.(`items[${index}].make`, content)}
                                        />
                                    ) : (
                                        <TextAreaExtended title='Make' content={i.make} />
                                    )}
                                </Td>
                                <Td>
                                    {isEditable ? (
                                        <TextAreaExtended
                                            isEditable
                                            title='Technical Specification'
                                            name={`items[${index}].techSpec`}
                                            content={i.techSpec}
                                            setContent={(content) => setFieldValue?.(`items[${index}].techSpec`, content)}
                                        />
                                    ) : (
                                        <TextAreaExtended title='Technical Specification' content={i.techSpec} />
                                    )}
                                </Td>
                                <Td>
                                    {isEditable ? (
                                        <Field name={`items[${index}].qty`} placeholder='dd/mm/yyyy'>
                                            {({ field, form }: FieldProps<POType>) => {
                                                const isInvalid = Boolean(getIn(form.errors, field.name))
                                                return (
                                                    <Field
                                                        size='xs'
                                                        type='number'
                                                        className={classNames('px-[5px] min-w-18 text-right', isInvalid && 'bg-red-50 !border !border-red-500')}
                                                        name={field.name}
                                                        component={Input}
                                                        value={i.qty}
                                                        validate={(value: number) => +value <= 0}
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                            e.target.value?.split('.')?.[1]?.length > 3 || +e.target.value > +(i.originalQty || 0)
                                                                ? null
                                                                : calculationHandlerWrapper({ ...i, qty: e.target.value })
                                                        }
                                                    />
                                                )
                                            }}
                                        </Field>
                                    ) : (
                                        i.qty
                                    )}
                                </Td>
                                <Td>
                                    {isEditable ? (
                                        <FormItem className='mb-0'>
                                            <Field name={`items[${index}].schedule`} placeholder='dd/mm/yyyy'>
                                                {({ field, form }: FieldProps<POType>) => {
                                                    const isInvalid = Boolean(getIn(form.errors, field.name))
                                                    return (
                                                        <DatePicker
                                                            field={field}
                                                            form={form}
                                                            size='xs'
                                                            className={classNames('px-[5px]', isInvalid && 'bg-red-50 border border-red-500')}
                                                            inputFormat='DD/MM/YYYY'
                                                            clearable={false}
                                                            inputSuffix={<HiOutlineCalendar className='text-lg pointer-events-none' />}
                                                            value={i.schedule ? new Date(i.schedule) : null}
                                                            onChange={(date) => form.setFieldValue(field.name, date)}
                                                        />
                                                    )
                                                }}
                                            </Field>
                                        </FormItem>
                                    ) : (
                                        formatDate(i.schedule)
                                    )}
                                </Td>
                                <Td>{i.unit}</Td>
                                {isPurchaseRequest && (
                                    <>
                                        <Td className='!p-0'>
                                            <Field name={`items[${index}].csNumber`}>
                                                {({ field, form }: FieldProps<POType>) => (
                                                    <Field
                                                        editable={false}
                                                        size='xs'
                                                        className={'px-[5px] w-12 min-w-auto'}
                                                        name={field.name}
                                                        type='button'
                                                        component={Input}
                                                        value={i.csNumber}
                                                        onChange={() => {}}
                                                        onClick={() => {
                                                            if (form.values?.vendorCode)
                                                                setCSModalState({
                                                                    itemCode: i.itemCode,
                                                                    indentNumber: i.indentNumber,
                                                                    vendorCode: values.vendorCode,
                                                                })
                                                            else {
                                                                form.setFieldError('vendorCode', 'true')
                                                                showError('Select a vendor first')
                                                            }
                                                        }}
                                                    />
                                                )}
                                            </Field>
                                        </Td>
                                        <Td
                                            onClick={() =>
                                                setCSModalState({ itemCode: i.itemCode, indentNumber: i.indentNumber, vendorCode: values.vendorCode })
                                            }>
                                            {formatDate(i.csDate)}
                                        </Td>
                                    </>
                                )}
                                <Td className='text-right'>
                                    {isEditable && isPurchaseRequest ? (
                                        <Field
                                            size='xs'
                                            component={Input}
                                            type='number'
                                            className={classNames(
                                                'px-[5px] w-12 min-w-auto text-right',
                                                getIn(errors, `items[${index}].rate`) ? 'bg-red-50 !border !border-red-500' : '',
                                            )}
                                            name={`items[${index}].rate`}
                                            value={i?.rate}
                                            disabled={Boolean(i.csNumber)}
                                            validate={(value: number) => +value <= 0}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                e.target.value?.split('.')?.[1]?.length > 2 ? null : calculationHandlerWrapper({ ...i, rate: e.target.value })
                                            }
                                        />
                                    ) : (
                                        i.rate
                                    )}
                                </Td>
                                <Td className='text-right'>{i.amount?.basic.toFixed(2)}</Td>
                                <Td className='text-right !p-0'>
                                    <Button
                                        type='button'
                                        size='xs'
                                        variant='plain'
                                        className='p-0 h-fit'
                                        icon={<MdEdit />}
                                        onClick={() => setTaxModalState({ isOpen: true, item: i })}
                                    />
                                </Td>
                                <Td className='text-right'>{i.amount?.total?.toFixed(2)}</Td>
                                <Td className='flex justify-center'>
                                    <Button
                                        type='button'
                                        size='xs'
                                        variant='plain'
                                        className='p-0 h-fit'
                                        icon={<MdEdit />}
                                        onClick={() => setToleranceModalState({ isOpen: true, item: i })}
                                    />
                                </Td>
                                <Td>
                                    {isEditable ? (
                                        <TextAreaExtended
                                            isEditable
                                            title='Remarks'
                                            name={`items[${index}].remarks`}
                                            content={i.remarks}
                                            setContent={(content) => setFieldValue?.(`items[${index}].remarks`, content)}
                                        />
                                    ) : (
                                        <TextAreaExtended title='Remarks' content={i.remarks} />
                                    )}
                                </Td>
                            </Tr>
                        ))
                        .flat()}
                </TBody>
            </Table>
            <ItemTaxModal
                isEditable={isEditable}
                isOpen={Boolean(taxModalState?.isOpen)}
                isPurchaseRequest={isPurchaseRequest}
                item={taxModalState?.item}
                onClose={() => setTaxModalState(null)}
                onSubmit={(taxDetails) => {
                    calculationHandlerWrapper({ ...taxModalState?.item, taxDetails })
                    setTaxModalState(null)
                }}
            />
            <ItemToleranceModal
                isEditable={isEditable}
                isOpen={Boolean(toleranceModalState?.isOpen)}
                itemTolerance={toleranceModalState?.item?.tolerance}
                onClose={() => setToleranceModalState(null)}
                onSubmit={(tolerance) => {
                    setValues((prev) => ({
                        ...prev,
                        items: prev.items.map((i) =>
                            i.indentNumber === toleranceModalState?.item?.indentNumber && i.itemCode === toleranceModalState?.item?.itemCode
                                ? {
                                      ...i,
                                      tolerance,
                                  }
                                : i,
                        ),
                    }))

                    setToleranceModalState(null)
                }}
            />
            <POCSList
                {...csModalState}
                isOpen={!!csModalState && isEditable}
                onClose={() => setCSModalState(null)}
                onSubmit={(data) => {
                    setValues?.((prev) => ({
                        ...prev,
                        items: prev.items.map((i) => {
                            if (!(i.indentNumber === csModalState?.indentNumber && i.itemCode === csModalState?.itemCode)) return i
                            setCSModalState(null)
                            return { ...i, ...data }
                        }),
                    }))
                }}
            />
        </div>
    )
}

const ItemTaxModal = ({
    isEditable,
    isOpen,
    isPurchaseRequest,
    item,
    onClose,
    onSubmit,
}: {
    isEditable: boolean
    isOpen: boolean
    isPurchaseRequest: boolean
    item?: POItem
    onClose: () => void
    onSubmit: (taxDetails: TaxChargeType[]) => void
}) => {
    const [taxDetails, setTaxDetails] = useState<TaxChargeType[]>([])

    useEffect(() => {
        setTaxDetails(item?.taxDetails || [])
    }, [item])

    if (!item) return
    return (
        <Dialog isOpen={isOpen} closable={false} className={'text-xs'}>
            <h6 className='mb-4'>Select Taxes</h6>

            <Table compact className='relative small-table bordered-cols' containerClassName='overflow-x-visible' borderlessRow={false}>
                <THead className='sticky top-0'>
                    <Tr className='whitespace-nowrap'>
                        <Th>#</Th>
                        <Th className='w-10'></Th>
                        <Th>Charge Name</Th>
                        <Th className='text-right'>Charge Value</Th>
                        <Th className='text-right'>Total Value</Th>
                    </Tr>
                </THead>
                <TBody>
                    {taxDetails?.map((i, idx) => (
                        <Tr key={'tax-details:' + idx}>
                            <Td className='text-center'>{idx + 1}</Td>
                            <Td>
                                <input
                                    disabled={!isPurchaseRequest || !isEditable}
                                    type='checkbox'
                                    checked={Boolean(i.status)}
                                    className='size-4'
                                    onChange={(e) =>
                                        setTaxDetails((prev) =>
                                            prev.map((_i, _idx) =>
                                                _idx === idx
                                                    ? {
                                                          ..._i,
                                                          status: +e.target.checked,
                                                          chargeAmount: +e.target.checked
                                                              ? _i.nature === chargeNatures[0].value
                                                                  ? item.amount.basic * (+_i.chargeValue / 100)
                                                                  : _i.nature === chargeNatures[2].value
                                                                    ? +item.qty * +_i.chargeValue
                                                                    : +_i.chargeValue
                                                              : 0,
                                                      }
                                                    : _i,
                                            ),
                                        )
                                    }
                                />
                            </Td>
                            <Td className='uppercase'>{i.chargeName}</Td>
                            <Td className='text-right'>
                                {i.nature === chargeNatures[0].value
                                    ? i.chargeValue + '%'
                                    : (+i.chargeValue).toFixed(2) + (i.nature === chargeNatures[2].value ? '/Unit' : '')}
                            </Td>
                            <Td className='text-right'>{i.status ? (+i.chargeAmount).toFixed(2) : 0}</Td>
                        </Tr>
                    ))}
                    <Tr className='font-bold text-right'>
                        <Td colSpan={4}>TOTAL</Td>
                        <Td>{taxDetails.reduce((sum, i) => sum + (i.status && i.chargeName !== 'DISC' ? i.chargeAmount : 0), 0).toFixed(2)}</Td>
                    </Tr>
                </TBody>
            </Table>

            <div className='flex gap-2 justify-end mt-6'>
                <Button type='button' variant='default' size='sm' onClick={() => onClose()}>
                    Close
                </Button>
                {isEditable && (
                    <Button type='button' variant='solid' size='sm' onClick={() => (!isPurchaseRequest ? onClose() : onSubmit(taxDetails))}>
                        Save
                    </Button>
                )}
            </div>
        </Dialog>
    )
}

const toleranceBasises = [
    { label: 'Qty', value: 'qty' },
    { label: 'Percent', value: 'percent' },
    { label: 'None', value: '' },
]

const ItemToleranceModal = ({
    isEditable,
    isOpen,
    itemTolerance,
    onClose,
    onSubmit,
}: {
    isEditable: boolean
    isOpen: boolean
    itemTolerance?: POItem['tolerance']
    onClose: () => void
    onSubmit: (tolerance: POItem['tolerance']) => void
}) => {
    const [tolerance, setTolerance] = useState<POItem['tolerance']>({})

    useEffect(() => {
        setTolerance(itemTolerance as POItem['tolerance'])
    }, [itemTolerance])

    return (
        <Dialog isOpen={isOpen} closable={false} className={'text-xs'}>
            <div className='flex items-center mb-4 justify-between'>
                <h6>Tolerance</h6>
                <Button disabled={!isEditable} type='button' variant='default' size='sm' onClick={() => setTolerance({})}>
                    Clear All
                </Button>
            </div>

            <div>
                <div className='flex gap-2 mb-2 items-center'>
                    <span className='inline-block w-25 shrink-0'>Tolerance Basis</span>
                    <Select
                        isDisabled={!isEditable}
                        size='sm'
                        className='w-full'
                        options={toleranceBasises}
                        value={toleranceBasises.find((i) => i.value === tolerance?.basis)}
                        onChange={(option) => setTolerance((prev) => ({ ...prev, basis: option?.value as string }))}
                    />
                </div>
                <div className='flex gap-2 mb-2 items-center'>
                    <span className='inline-block w-25 shrink-0'>Tolerance (+)</span>
                    <Input
                        size='sm'
                        type='number'
                        disabled={!tolerance?.basis || !isEditable}
                        value={tolerance?.positive}
                        onChange={(e) => setTolerance((prev) => ({ ...prev, positive: e.target.value }))}
                    />
                </div>
                <div className='flex gap-2 mb-2 items-center'>
                    <span className='inline-block w-25 shrink-0'>Tolerance (-)</span>
                    <Input
                        size='sm'
                        type='number'
                        disabled={!tolerance?.basis}
                        value={tolerance?.negative}
                        onChange={(e) => setTolerance((prev) => ({ ...prev, negative: e.target.value }))}
                    />
                </div>
            </div>

            <div className='flex gap-2 justify-end mt-6'>
                <Button type='button' variant='default' size='sm' onClick={() => onClose()}>
                    Close
                </Button>
                {isEditable && (
                    <Button type='button' variant='solid' size='sm' onClick={() => onSubmit(tolerance)}>
                        Ok
                    </Button>
                )}
            </div>
        </Dialog>
    )
}
