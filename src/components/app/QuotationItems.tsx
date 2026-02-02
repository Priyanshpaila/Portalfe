import { IndentType, QuotationItemType, QuotationType } from '@/@types/app'
import { Field, FieldProps, FormikErrors, FormikHelpers, getIn } from 'formik'
import { Button, Drawer, FormItem, Input, Select, Table } from '../ui'
import React, { ChangeEvent, useState } from 'react'
import CustomDrawer from './CustomDrawer'
import { Loading } from '../shared'
import { taxRates } from '@/constants/app.constant'
import ApiService from '@/services/ApiService'
import { handleAmountCalculation, handleItemAmount } from '@/utils/amountCalculation'
import { FiInfo } from 'react-icons/fi'
import { companies } from '@/utils/data'
import { formatDate, formatDateTime } from '@/utils/formatDate'
import { clubItems } from '@/utils/clubItems'
import TextAreaExtended from './TextAreaExtended'
import classNames from 'classnames'

const { Tr, Th, Td, THead, TBody } = Table

const overwriteDefaultFields = {
    amount: undefined,
    delivery: undefined,
    discountAmount: 0,
    discountPercent: 0,
    hsnCode: undefined,
    make: undefined,
    rate: 0,
    taxRate: 0,
    remarks: undefined,
    taxDetails: undefined,
}

export const QuotationItemsTable = ({
    isEditable,
    indents,
    items,
    values,
    errors,
    setValues,
    setFieldValue,
}: {
    isEditable?: boolean
    indents?: { [id: string]: IndentType }
    items: (QuotationItemType & { itemDescription?: string })[]
    errors?: FormikErrors<QuotationType>
    values?: QuotationType
    handleAmountCalculation?: (_values: QuotationType) => QuotationType['amount']
    setValues?: FormikHelpers<QuotationType>['setValues']
    setFieldValue?: FormikHelpers<QuotationType>['setFieldValue']
}) => {
    const [itemId, setItemId] = useState<string | null>(null)

    const selectedItemsCount = values?.items?.filter((i) => i.selected)?.length || 0
    const calculationHandlerWrapper = (_values: QuotationItemType) => {
        if (!setValues) return
        setValues((prev) =>
            handleAmountCalculation({
                ...prev,
                items: prev.items?.map((i) =>
                    i.itemCode !== _values.itemCode || i.indentNumber !== _values.indentNumber ? i : handleItemAmount(_values, true),
                ),
            }),
        )
    }

    return (
        <>
            <Table compact className={'relative ' + (isEditable ? 'border border-gray-200' : '')}>
                <THead className='sticky top-0 whitespace-nowrap'>
                    <Tr>
                        <Th>#</Th>
                        {isEditable && (
                            <Th className='p-0'>
                                <Field
                                    size={'xs'}
                                    className='h-auto p-1'
                                    type='checkbox'
                                    checked={selectedItemsCount === values?.items?.length}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                        setValues?.((prev) =>
                                            handleAmountCalculation({
                                                ...prev,
                                                items: prev.items?.map((i) =>
                                                    handleItemAmount(
                                                        {
                                                            ...i,
                                                            selected: e.target.checked,
                                                            ...(e.target.checked ? {} : overwriteDefaultFields),
                                                        },
                                                        true,
                                                    ),
                                                ),
                                            }),
                                        )
                                    }}
                                />
                            </Th>
                        )}
                        <Th className='w-full'>Item Description</Th>
                        <Th>Qty</Th>
                        <Th>HSN Code</Th>
                        <Th>
                            <span className='text-red-500'>*</span> Make
                        </Th>
                        <Th className='text-right pr-1'>
                            <span className='text-red-500'>*</span> Rate
                        </Th>
                        <Th className='text-right pr-1'>Disc %</Th>
                        <Th className='text-right pr-1'>Disc Amt</Th>
                        <Th className='text-right pr-1'>
                            <span className='text-red-500'>*</span> Tax Rate
                        </Th>
                        <Th>
                            <div className='flex items-center justify-between gap-2'>
                                <span>Delivery</span>
                                {isEditable && (
                                    <Input
                                        type='number'
                                        size='xs'
                                        className='h-auto w-16 p-1 bg-white leading-none text-right'
                                        placeholder='0'
                                        onChange={(e) =>
                                            setValues?.((prev) => ({
                                                ...prev,
                                                items: prev.items?.map((i) => ({ ...i, delivery: +e.target.value })),
                                            }))
                                        }
                                    />
                                )}
                            </div>
                        </Th>
                        {!isEditable && (
                            <>
                                <Th className='text-right pr-1'>Base Amt</Th>
                                <Th className='text-right pr-1'>Taxable</Th>
                                <Th className='text-right pr-1'>Igst</Th>
                                <Th className='text-right pr-1'>Cgst</Th>
                                <Th className='text-right pr-1'>Sgst</Th>
                                <Th className='text-right pr-1'>Total</Th>
                                <Th className='text-right pr-1'>Remarks</Th>
                            </>
                        )}
                    </Tr>
                </THead>
                <TBody>
                    {items?.map((i, index) => {
                        const isSelected = getIn(values, `items[${index}].selected`)
                        return (
                            <React.Fragment key={i.indentNumber + i.itemCode}>
                                <Tr className='border-none'>
                                    <Td className='pb-0'>{index + 1}</Td>
                                    {isEditable && (
                                        <Td className='pb-0 px-0'>
                                            <Field
                                                size={'xs'}
                                                name={`items[${index}].selected`}
                                                className='h-auto p-1'
                                                type='checkbox'
                                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                    calculationHandlerWrapper({
                                                        ...items?.[index],
                                                        selected: e.target.checked,
                                                        ...(e.target.checked ? {} : overwriteDefaultFields),
                                                    })
                                                }
                                            />
                                        </Td>
                                    )}
                                    <Td className='pb-0 '>
                                        <div className='flex items-center gap-2'>
                                            <span className='block text-left'>
                                                {indents?.[i.indentNumber + ':' + i.itemCode]?.itemDescription || i.itemDescription}
                                            </span>
                                            {indents && (
                                                <Button
                                                    type='button'
                                                    variant='plain'
                                                    size='xs'
                                                    icon={<FiInfo className='text-blue-700' />}
                                                    onClick={() => setItemId(i.indentNumber + ':' + i.itemCode)}
                                                />
                                            )}
                                        </div>
                                    </Td>
                                    <Td className='pb-0 text-right'>{i?.qty}</Td>
                                    <Td className='pb-0 pr-1'>
                                        {isEditable ? (
                                            <Field
                                                type='text'
                                                disabled={!isSelected}
                                                size={'xs'}
                                                name={`items[${index}].hsnCode`}
                                                className='h-auto p-1 !min-w-auto'
                                                component={Input}
                                                value={i.hsnCode}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue?.(e.target.name, e.target.value)}
                                            />
                                        ) : (
                                            i.hsnCode
                                        )}
                                    </Td>
                                    <Td className='pb-0 px-0'>
                                        {isEditable ? (
                                            <TextAreaExtended
                                                isEditable
                                                title='Make'
                                                content={i.make}
                                                component={({ isExtended }) => (
                                                    <Field
                                                        textArea={isExtended}
                                                        disabled={!isSelected}
                                                        type='text'
                                                        size={'xs'}
                                                        name={`items[${index}].make`}
                                                        className={classNames('h-auto p-1 !min-w-auto', !isExtended ? 'pointer-events-none' : null)}
                                                        component={Input}
                                                        invalid={getIn(errors, `items[${index}].make`) && isSelected ? true : false}
                                                        validate={(value: string) => !value && isSelected}
                                                        value={i.make}
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue?.(e.target.name, e.target.value)}
                                                    />
                                                )}
                                            />
                                        ) : (
                                            <TextAreaExtended title='Make' content={i.make} />
                                        )}
                                    </Td>
                                    <Td className='pb-0 text-right'>
                                        {isEditable ? (
                                            <Field
                                                type='number'
                                                disabled={!isSelected}
                                                size={'xs'}
                                                name={`items[${index}].rate`}
                                                className='h-auto p-1 !min-w-auto'
                                                component={Input}
                                                invalid={getIn(errors, `items[${index}].rate`) && isSelected ? true : false}
                                                validate={(value: number) => +value <= 0 && isSelected}
                                                value={i?.rate}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                    e.target.value?.split?.('.')[1]?.length > 2
                                                        ? null
                                                        : calculationHandlerWrapper({ ...items?.[index], rate: +e.target.value })
                                                }
                                            />
                                        ) : (
                                            '₹' + i.rate
                                        )}
                                    </Td>
                                    <Td className='pb-0 px-0 text-right'>
                                        {isEditable ? (
                                            <Field
                                                type='number'
                                                disabled={!isSelected}
                                                size={'xs'}
                                                name={`items[${index}].discountPercent`}
                                                className={'h-auto p-1 !min-w-auto'}
                                                component={Input}
                                                value={i?.discountPercent}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                    +e.target.value > 100 || e.target.value?.split?.('.')?.[1]?.length > 2
                                                        ? null
                                                        : calculationHandlerWrapper({
                                                              ...items?.[index],
                                                              discountType: 'percent',
                                                              discountPercent: e.target.value,
                                                          })
                                                }
                                            />
                                        ) : (
                                            i?.discountPercent + '%'
                                        )}
                                    </Td>
                                    <Td className='pb-0 text-right'>
                                        {isEditable ? (
                                            <Field
                                                size={'xs'}
                                                disabled={!isSelected}
                                                type='number'
                                                name={`items[${index}].discountAmount`}
                                                className='h-auto p-1 !min-w-auto'
                                                component={Input}
                                                value={i?.discountAmount}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                    e.target.value?.split?.('.')?.[1]?.length > 2
                                                        ? null
                                                        : calculationHandlerWrapper({
                                                              ...items?.[index],
                                                              discountType: 'amount',
                                                              discountAmount: e.target.value,
                                                          })
                                                }
                                            />
                                        ) : (
                                            i?.discountAmount
                                        )}
                                    </Td>
                                    <Td className='pb-0 px-0 text-right'>
                                        {isEditable ? (
                                            <FormItem className='mb-0'>
                                                <Field name={`items[${index}].taxRate`}>
                                                    {({ field, form }: FieldProps<QuotationType>) => {
                                                        return (
                                                            <Select
                                                                field={field}
                                                                form={form}
                                                                isDisabled={!isEditable || !isSelected}
                                                                size={'xs'}
                                                                className='h-auto !min-w-22'
                                                                menuPosition='fixed'
                                                                options={taxRates}
                                                                value={taxRates.find((_i) => _i.value === i?.taxRate)}
                                                                onChange={(option) =>
                                                                    calculationHandlerWrapper({ ...items?.[index], taxRate: +(option?.value || 0) })
                                                                }
                                                            />
                                                        )
                                                    }}
                                                </Field>
                                            </FormItem>
                                        ) : (
                                            i?.taxRate + '%'
                                        )}
                                    </Td>
                                    <Td className='pb-0 text-right'>
                                        {isEditable ? (
                                            <Field
                                                type='number'
                                                disabled={!isSelected}
                                                size={'sm'}
                                                name={`items[${index}].delivery`}
                                                className='h-auto p-1 !min-w-auto'
                                                component={Input}
                                                invalid={getIn(errors, `items[${index}].delivery`) && isSelected ? true : false}
                                                validate={(value: number) => +value <= 0 && isSelected}
                                                value={i?.delivery}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue?.(`items[${index}].delivery`, e.target.value)}
                                            />
                                        ) : (
                                            i?.delivery
                                        )}
                                    </Td>
                                    {!isEditable && (
                                        <>
                                            <Td className='p-1 text-right'>{i.amount.basic ? `₹${i.amount.basic}` : null}</Td>
                                            <Td className='p-1 text-right'>{i.amount.taxable ? `₹${i.amount.taxable}` : null}</Td>
                                            <Td className='p-1 text-right'>{i.amount.igst ? `₹${i.amount.igst}` : null}</Td>
                                            <Td className='p-1 text-right'>{i.amount.cgst ? `₹${i.amount.cgst}` : null}</Td>
                                            <Td className='p-1 text-right'>{i.amount.sgst ? `₹${i.amount.sgst}` : null}</Td>
                                            <Td className='p-1 text-right'>{i.amount.total ? `₹${i.amount.total}` : null}</Td>
                                            <Td>
                                                <TextAreaExtended title='Remarks' content={i.remarks} />
                                            </Td>
                                        </>
                                    )}
                                </Tr>
                                {isEditable && (
                                    <Tr>
                                        <Td colSpan={4} className='pt-0' />
                                        <Td colSpan={2} className='pt-0 pr-0'>
                                            {isEditable ? (
                                                <TextAreaExtended
                                                    isEditable={isSelected}
                                                    title='Remarks'
                                                    component={({ isExtended }) => (
                                                        <Field
                                                            textArea={isExtended}
                                                            disabled={!isSelected}
                                                            type='text'
                                                            size={'xs'}
                                                            name={`items[${index}].remarks`}
                                                            className={classNames('h-auto p-1 !min-w-auto', !isExtended ? 'pointer-events-none' : null)}
                                                            component={Input}
                                                            value={i.remarks}
                                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue?.(e.target.name, e.target.value)}
                                                        />
                                                    )}
                                                />
                                            ) : (
                                                <TextAreaExtended title='Remarks' content={i.remarks} />
                                            )}
                                        </Td>
                                        <Td colSpan={5} className='pt-0'>
                                            <div className='flex justify-end gap-4 font-bold'>
                                                <div className='flex gap-1'>
                                                    <span className='text-red-500'>BASIC</span>
                                                    <span>{i?.amount?.basic?.toFixed(2)}</span>
                                                </div>
                                                <div className='flex gap-1'>
                                                    <span className='text-blue-500'>TAXABLE</span>
                                                    <span>{i?.amount?.taxable?.toFixed(2)}</span>
                                                </div>
                                                <div className='flex gap-1'>
                                                    <span className='text-blue-500'>CSGT</span>
                                                    <span>{i?.amount?.cgst?.toFixed(2)}</span>
                                                    <span className='text-blue-500'>SGST</span>
                                                    <span>{i?.amount?.sgst?.toFixed(2)}</span>
                                                </div>
                                                <span className='block text-red-500'>{i?.amount?.total?.toFixed(2)}</span>
                                            </div>
                                        </Td>
                                    </Tr>
                                )}
                            </React.Fragment>
                        )
                    })}
                </TBody>
            </Table>
            <Drawer title='Item Detail' isOpen={!!itemId} onClose={() => setItemId(null)} onRequestClose={() => setItemId(null)}>
                {indents && itemId !== null && (
                    <Table compact borderlessRow>
                        <TBody>
                            <Tr>
                                <Td>
                                    <b>Indent No</b>
                                </Td>
                                <Td>{indents[itemId].indentNumber}</Td>
                            </Tr>
                            <Tr>
                                <Td>
                                    <b>Indent Date</b>
                                </Td>
                                <Td>{formatDate(indents[itemId].documentDate as string)}</Td>
                            </Tr>
                            <Tr>
                                <Td>
                                    <b>Company</b>
                                </Td>
                                <Td>{companies.find((c) => c.plantCode === indents[itemId].company)?.alias || indents[itemId].company}</Td>
                            </Tr>
                            <Tr>
                                <Td>
                                    <b>Line No</b>
                                </Td>
                                <Td>{indents[itemId].lineNumber}</Td>
                            </Tr>
                            <Tr>
                                <Td>
                                    <b>Item Code</b>
                                </Td>
                                <Td>{indents[itemId].itemCode}</Td>
                            </Tr>
                            <Tr>
                                <Td>
                                    <b>Item Description</b>
                                </Td>
                                <Td>{indents[itemId].itemDescription}</Td>
                            </Tr>
                            <Tr>
                                <Td>
                                    <b>Tech Specification</b>
                                </Td>
                                <Td>{indents[itemId].techSpec}</Td>
                            </Tr>
                            <Tr>
                                <Td>
                                    <b>Make</b>
                                </Td>
                                <Td>{indents[itemId].make}</Td>
                            </Tr>
                            <Tr>
                                <Td>
                                    <b>Unit</b>
                                </Td>
                                <Td>{indents[itemId].unitOfMeasure}</Td>
                            </Tr>
                            <Tr>
                                <Td>
                                    <b>Indent Item Remark</b>
                                </Td>
                                <Td>{indents[itemId].remark}</Td>
                            </Tr>
                            <Tr>
                                <Td>
                                    <b>Cost Center</b>
                                </Td>
                                <Td>{indents[itemId].costCenter}</Td>
                            </Tr>
                            <Tr>
                                <Td>
                                    <b>Indent Type</b>
                                </Td>
                                <Td>{indents[itemId].documentType}</Td>
                            </Tr>
                            <Tr>
                                <Td>
                                    <b>Last Changed On</b>
                                </Td>
                                <Td>{formatDateTime(indents[itemId].lastChangedOn)}</Td>
                            </Tr>
                        </TBody>
                    </Table>
                )}
            </Drawer>
        </>
    )
}

export const QuotationItemsDrawer = ({ quotationId }: { quotationId: string }) => {
    const [items, setItems] = useState<QuotationItemType[]>([])
    const [loading, setLoading] = useState(false)

    const fetchData = async () => {
        if (!quotationId) return
        if (!items?.length) {
            setLoading(true)
            try {
                const itemsResponse = await ApiService.fetchData<QuotationItemType[]>({
                    method: 'get',
                    url: '/quotation/items/' + quotationId,
                    params: {
                        appendRFQDetails: true,
                    },
                })

                setItems(clubItems(itemsResponse.data)?.items)
            } catch (error) {
                console.error(error)
            }
            setLoading(false)
        }
    }

    return (
        <CustomDrawer title='Quotation Items' placement='bottom' fetchData={fetchData}>
            <Loading loading={loading}>
                <QuotationItemsTable items={items} isEditable={false} />
            </Loading>
        </CustomDrawer>
    )
}
