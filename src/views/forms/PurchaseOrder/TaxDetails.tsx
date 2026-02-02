import { POType } from '@/@types/app'
import { Button, Table } from '@/components/ui'
import { handleAmountCalculation, handleItemAmount } from '@/utils/amountCalculation'
import { chargeNames, chargeNatures } from '@/utils/data'
import { FormikHelpers } from 'formik'
import { IoMdRemoveCircle } from 'react-icons/io'

const { Tr, Th, Td, THead, TBody } = Table

export default function TaxDetails({
    isPurchaseRequest,
    state,
    setValues,
}: {
    isPurchaseRequest: boolean
    state: POType
    setValues: FormikHelpers<POType>['setValues']
}) {
    return (
        <Table compact className='relative small-table'>
            <THead className='sticky top-0'>
                <Tr>
                    <Th>#</Th>
                    <Th>Charge Name</Th>
                    <Th>Nature</Th>
                    <Th>Charge On</Th>
                    <Th className='text-right'>Charge Value</Th>
                    <Th className='text-right'>Total Value</Th>
                    <Th></Th>
                </Tr>
            </THead>
            <TBody>
                {state?.items?.[0]?.taxDetails?.map((t, idx) => (
                    <Tr key={'tax-details:item:' + idx}>
                        <Td>{idx + 1}</Td>
                        <Td className='uppercase'>{t.chargeName}</Td>
                        <Td className='capitalize'>{t.nature}</Td>
                        <Td className='capitalize'>{t.chargeOn}</Td>
                        <Td className='text-right'>
                            {t.nature === chargeNatures[0].value
                                ? t.chargeValue + '%'
                                : (+t.chargeValue).toFixed(2) + (t.nature === chargeNatures[2].value ? '/Unit' : '')}
                        </Td>
                        <Td className='text-right'>{state?.items?.reduce((sum, i) => sum + +(i?.taxDetails?.[idx]?.chargeAmount || 0), 0).toFixed(2)}</Td>
                        <Td className='text-right'>
                            {isPurchaseRequest && (
                                <Button
                                    type='button'
                                    variant='plain'
                                    icon={<IoMdRemoveCircle className='text-red-500 scale-110' />}
                                    size='xs'
                                    className='!p-0'
                                    onClick={() =>
                                        setValues?.((prev) =>
                                            handleAmountCalculation({
                                                ...prev,
                                                items: prev.items?.map((i) =>
                                                    handleItemAmount({
                                                        ...i,
                                                        taxDetails: i.taxDetails.filter((_i, _idx) => _idx !== idx),
                                                    }),
                                                ),
                                            }),
                                        )
                                    }
                                />
                            )}
                        </Td>
                    </Tr>
                ))}
                {state.taxDetails?.map((i, idx) => (
                    <Tr key={'tax-details:' + idx}>
                        <Td>{idx + 1}</Td>
                        <Td>{chargeNames.find((c) => c.value === i.chargeName)?.label}</Td>
                        <Td className='capitalize'>{i.nature}</Td>
                        <Td className='capitalize'>{i.chargeOn}</Td>
                        <Td className='text-right'>
                            {i.nature === chargeNatures[0].value
                                ? i.chargeValue + '%'
                                : (+i.chargeValue).toFixed(2) + (i.nature === chargeNatures[2].value ? '/Unit' : '')}
                        </Td>
                        <Td className='text-right'>{(+i.chargeAmount).toFixed(2)}</Td>
                        <Td className='text-right'>
                            {isPurchaseRequest && (
                                <Button
                                    type='button'
                                    variant='plain'
                                    icon={<IoMdRemoveCircle className='text-red-500 scale-110' />}
                                    size='xs'
                                    className='!p-0'
                                    onClick={() =>
                                        setValues?.((prev) =>
                                            handleAmountCalculation({
                                                ...prev,
                                                taxDetails: prev.taxDetails.filter((_i, _idx) => _idx !== idx),
                                            }),
                                        )
                                    }
                                />
                            )}
                        </Td>
                    </Tr>
                ))}
            </TBody>
        </Table>
    )
}
