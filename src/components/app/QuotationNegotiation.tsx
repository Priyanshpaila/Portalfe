import { NegotiationItemType, NegotiationType, QuotationType } from '@/@types/app'
import { Button, Table } from '../ui'
import React from 'react'
import { getIndentID } from '@/utils/data'
import classNames from 'classnames'
import { FormikHelpers } from 'formik'
import { handleAmountCalculation, handleItemAmount } from '@/utils/amountCalculation'

const { Tr, Th, Td, THead, TBody } = Table

export const QuotationNegotiation = ({
    negotiation,
    quotation,
    indents,
    setValues,
}: {
    negotiation?: NegotiationType
    quotation?: QuotationType
    indents: Record<string, { itemDescription: string }>
    setValues: FormikHelpers<QuotationType>['setValues']
}) => {
    const onAgree = (i: NegotiationItemType, indentId: string) => {
        setValues((prev) =>
            handleAmountCalculation({
                ...prev,
                items: prev.items.map((qi) =>
                    getIndentID(qi) === indentId
                        ? handleItemAmount({
                              ...qi,
                              ...i.negotiationOn?.reduce(
                                  (obj, field) => ({
                                      ...obj,
                                      [field]: i[field],
                                  }),
                                  {},
                              ),
                              ...(i.negotiationOn?.includes('discountAmount')
                                  ? { discountPercent: 0 }
                                  : i.negotiationOn?.includes('discountPercent')
                                    ? { discountAmount: 0 }
                                    : {}),
                              make: i.make || qi.make,
                          })
                        : qi,
                ),
            }),
        )
    }

    return (
        <Table compact className='relative border border-gray-200'>
            <THead className='sticky top-0 whitespace-nowrap'>
                <Tr>
                    <Th>Item Description</Th>
                    <Th>Particulars</Th>
                    <Th className='text-right'>Quoted</Th>
                    <Th className='text-right'>Expected</Th>
                    <Th className='text-right'>Difference</Th>
                    <Th>Action</Th>
                </Tr>
            </THead>
            <TBody>
                {negotiation?.items?.map((i) => {
                    const qItem = quotation?.items?.find((_i) => getIndentID(_i) === getIndentID(i))
                    if (!qItem) return
                    const indentId = getIndentID(qItem)
                    return (
                        <React.Fragment key={`negotiation:${i.indentNumber}:${i.itemCode}`}>
                            <Tr>
                                <Td rowSpan={5} className={'align-top'}>
                                    <span className='mt-1 inline-block'>{indents[indentId]?.itemDescription}</span>
                                    <br />
                                    <p>Qty: {qItem.qty}</p>
                                </Td>
                                <Td className={i.negotiationOn?.includes('rate') ? 'bg-yellow-200' : ''}>Rate</Td>
                                <Td className={'text-right'}>{qItem?.rate.toFixed(2)}</Td>
                                <Td className={'text-right'}>{i?.rate.toFixed(2)}</Td>

                                <Td rowSpan={5} className={'align-middle text-right'}>
                                    {i.savings.toFixed(2)}
                                </Td>
                                <Td rowSpan={5} className={'align-middle w-42 text-center'}>
                                    <Button type='button' variant='twoTone' size='xs' className='mb-2' color='green' onClick={() => onAgree(i, indentId)}>
                                        Agree
                                    </Button>
                                    <br />
                                    <span>(click agree to update changes automatically)</span>
                                </Td>
                            </Tr>
                            <Tr>
                                <Td className={i.negotiationOn?.includes('discountPercent') ? 'bg-yellow-200' : ''}>Dis %</Td>
                                <Td className={'text-right'}>{((+(qItem?.discountAmount || 0) * 100) / (qItem?.amount.basic || 1)).toFixed(2)}</Td>
                                <Td className={'text-right'}>{i?.discountPercent.toFixed(2)}</Td>
                            </Tr>
                            <Tr>
                                <Td className={i.negotiationOn?.includes('discountAmount') ? 'bg-yellow-200' : ''}>Dis Amt</Td>
                                <Td className={'text-right'}>{(+(qItem?.discountAmount || 0)).toFixed(2)}</Td>
                                <Td className={'text-right'}>{(i?.discountAmount || 0).toFixed(2)}</Td>
                            </Tr>
                            <Tr>
                                <Td>Make</Td>
                                <Td className={'text-right'}>{qItem?.make}</Td>
                                <Td className={'text-right'}>{i?.make}</Td>
                            </Tr>
                            <Tr className='text-xs'>
                                <Td className={classNames('font-bold', i.negotiationOn?.includes('basicAfterDiscount') ? 'bg-yellow-200' : '')}>B.A.D</Td>
                                <Td className={'text-right'}>{qItem?.amount.taxable?.toFixed(2)}</Td>
                                <Td className={'text-right'}>{i.basicAfterDiscount?.toFixed(2)}</Td>
                            </Tr>
                        </React.Fragment>
                    )
                })}
            </TBody>
        </Table>
    )
}
