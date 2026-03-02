// QuotationItemsTable.tsx
import { IndentType, QuotationItemType, QuotationType } from '@/@types/app'
import { Field, FieldProps, FormikErrors, FormikHelpers, getIn } from 'formik'
import { Button, Drawer, FormItem, Input, Select, Table } from '../ui'
import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
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

// ✅ GST from HSN map (adjust path if needed)
import { getHsnInfo } from '@/utils/hsnGstMap'

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

const normalizeDigits = (v: any) => String(v ?? '').replace(/\D+/g, '')

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

    // ✅ Track manual override of tax rate (so auto-fill won’t override user selection)
    // key = `${indentNumber}:${itemCode}`
    const manualTaxKeysRef = useRef<Set<string>>(new Set())
    const lastHsnByKeyRef = useRef<Record<string, string>>({})

    const getKey = (it: { indentNumber: string; itemCode: string }) => `${it.indentNumber}:${it.itemCode}`

    // -------------------- GST helper (HSN -> GST%) --------------------
    const parseSingleGstPercent = (txt: string): number | null => {
        const t = String(txt ?? '').trim()
        if (!t) return null
        const nums = (t.match(/\d+(\.\d+)?/g) || [])
            .map((x) => Number(x))
            .filter((n) => Number.isFinite(n))
        if (!nums.length) return null

        // "5% / 18%" -> [5,18] => ambiguous => null
        const uniq = Array.from(new Set(nums.map((n) => +n.toFixed(2))))
        if (uniq.length !== 1) return null
        return uniq[0]
    }

    const getGstRateFromHsn = (hsn: string | number | undefined): number | null => {
        if (!hsn) return null

        // IMPORTANT: slab mapping is heading-based (first 4 digits), so require >= 4 digits
        const digits = normalizeDigits(hsn)
        if (digits.length < 4) return null

        const info = getHsnInfo(hsn)
        return parseSingleGstPercent(String(info.gstPercent ?? ''))
    }

    // ✅ Apply auto-tax ONLY when:
    // - user has NOT manually overridden tax rate for this item
    // - and mapped GST exists
    const applyAutoTaxIfAllowed = (item: QuotationItemType, opts?: { force?: boolean }) => {
        const key = getKey(item)
        const isManual = manualTaxKeysRef.current.has(key)
        const force = !!opts?.force

        if (isManual && !force) return item
        if (!item.hsnCode) return item

        const gst = getGstRateFromHsn(item.hsnCode)
        if (gst === null) return item

        return { ...item, taxRate: gst }
    }

    // -------------------- Recalculation wrapper --------------------
    const selectedItemsCount = values?.items?.filter((i) => i.selected)?.length || 0

    const calculationHandlerWrapper = (_values: QuotationItemType, opts?: { forceAutoTax?: boolean }) => {
        if (!setValues) return

        const patched =
            _values?.selected
                ? applyAutoTaxIfAllowed(_values, { force: !!opts?.forceAutoTax })
                : _values

        setValues((prev) =>
            handleAmountCalculation({
                ...prev,
                items: prev.items?.map((i) =>
                    i.itemCode !== patched.itemCode || i.indentNumber !== patched.indentNumber ? i : handleItemAmount(patched, true),
                ),
            }),
        )
    }

    // -------------------- Auto-fill GST once when items are loaded --------------------
    const didInit = useRef(false)
    useEffect(() => {
        if (didInit.current) return
        if (!setValues) return
        if (!values?.items?.length) return

        didInit.current = true

        setValues((prev) =>
            handleAmountCalculation({
                ...prev,
                items: prev.items?.map((it) => {
                    if (!it.selected) return it

                    // Don’t override if user already chose (manual set)
                    const key = getKey(it)
                    if (manualTaxKeysRef.current.has(key)) return it

                    // If already has a taxRate from backend, keep it
                    if (Number.isFinite(+it.taxRate) && +it.taxRate !== 0) return it

                    // Try auto from HSN
                    const patched = applyAutoTaxIfAllowed(it, { force: true })
                    if (patched.taxRate !== it.taxRate) return handleItemAmount(patched, true)
                    return it
                }),
            }),
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setValues, values?.items?.length])

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
                                                items: prev.items?.map((i) => {
                                                    const key = getKey(i)

                                                    const next = {
                                                        ...i,
                                                        selected: e.target.checked,
                                                        ...(e.target.checked ? {} : overwriteDefaultFields),
                                                    } as any

                                                    // If item is deselected, clear manual override so future selection can auto-fill again
                                                    if (!e.target.checked) {
                                                        manualTaxKeysRef.current.delete(key)
                                                    }

                                                    // When selecting, auto-fill GST if available (unless user manually set before)
                                                    const patched = e.target.checked
                                                        ? applyAutoTaxIfAllowed(next as QuotationItemType)
                                                        : (next as QuotationItemType)

                                                    return handleItemAmount(patched, true)
                                                }),
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
                        const key = `${i.indentNumber}:${i.itemCode}`

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
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                    // If deselected -> clear manual flag + reset fields
                                                    if (!e.target.checked) {
                                                        manualTaxKeysRef.current.delete(key)
                                                    }

                                                    calculationHandlerWrapper(
                                                        {
                                                            ...items?.[index],
                                                            selected: e.target.checked,
                                                            ...(e.target.checked ? {} : overwriteDefaultFields),
                                                        } as any,
                                                    )
                                                }}
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
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                    const hsnCode = e.target.value

                                                    // ✅ If HSN actually changed (not just same value), clear manual override
                                                    // so that new HSN can auto-fill correct GST again.
                                                    const prevHsn = lastHsnByKeyRef.current[key]
                                                    if (prevHsn !== hsnCode) {
                                                        lastHsnByKeyRef.current[key] = hsnCode
                                                        manualTaxKeysRef.current.delete(key)
                                                    }

                                                    calculationHandlerWrapper(
                                                        {
                                                            ...items?.[index],
                                                            hsnCode,
                                                        } as any,
                                                        // force auto tax fill after HSN change (manual was cleared above)
                                                        { forceAutoTax: true },
                                                    )
                                                }}
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
                                                        : calculationHandlerWrapper({ ...items?.[index], rate: +e.target.value } as any)
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
                                                          } as any)
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
                                                          } as any)
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
                                                                onChange={(option) => {
                                                                    // ✅ User manually overrides taxRate via dropdown
                                                                    manualTaxKeysRef.current.add(key)

                                                                    calculationHandlerWrapper({
                                                                        ...items?.[index],
                                                                        taxRate: +(option?.value || 0),
                                                                    } as any)
                                                                }}
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
                                            <Td className='p-1 text-right'>{(i as any).amount.igst ? `₹${(i as any).amount.igst}` : null}</Td>
                                            <Td className='p-1 text-right'>{(i as any).amount.cgst ? `₹${(i as any).amount.cgst}` : null}</Td>
                                            <Td className='p-1 text-right'>{(i as any).amount.sgst ? `₹${(i as any).amount.sgst}` : null}</Td>
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
                                                    <span>{(i as any)?.amount?.cgst?.toFixed?.(2)}</span>
                                                    <span className='text-blue-500'>SGST</span>
                                                    <span>{(i as any)?.amount?.sgst?.toFixed?.(2)}</span>
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