import { FormItem, Input, Table } from '@/components/ui'
import CustomDrawer from './CustomDrawer'
import { Loading } from '../shared'
import ApiService from '@/services/ApiService'
import { ChangeEvent, useState } from 'react'
import { Field } from 'formik'
import { RFQItemType } from '@/@types/app'
import TextAreaExtended from './TextAreaExtended'

const { Tr, Th, Td, THead, TBody } = Table

export function RFQItemsTable({
    items,
    isEditable = true,
    setFieldValue,
}: {
    items: RFQItemType[]
    isEditable?: boolean
    setFieldValue?: (x: string, y: string) => void
}) {
    return (
        <Table compact className='relative'>
            <THead className='sticky top-0'>
                <Tr>
                    <Th>#</Th>
                    <Th>Indent Number</Th>
                    <Th>Item Code</Th>
                    <Th>Item Description</Th>
                    <Th className='text-center'>Tech. Spec.</Th>
                    <Th>HSN Code</Th>
                    <Th className='text-center'>Make</Th>
                    <Th>
                        <span className='text-red-500'>*</span> Qty
                    </Th>
                    <Th>Unit</Th>
                    <Th>Remarks</Th>
                </Tr>
            </THead>
            <TBody>
                {items
                    ?.map((i, index) => (
                        <Tr key={i.itemCode + index}>
                            <Td>{index + 1}</Td>
                            <Td>{i.indentNumber}</Td>
                            <Td>{i.itemCode}</Td>
                            <Td>{i.itemDescription}</Td>
                            <Td>
                                {isEditable && setFieldValue ? (
                                    <TextAreaExtended
                                        isEditable
                                        title='Technical Specification'
                                        name={`items[${index}].techSpec`}
                                        content={i.techSpec}
                                        setContent={(text) => setFieldValue(`items[${index}].techSpec`, text)}
                                    />
                                ) : (
                                    <TextAreaExtended title='Technical Specification' content={i.techSpec} />
                                )}
                            </Td>
                            <Td>{i.hsnCode}</Td>
                            <Td>
                                {isEditable && setFieldValue ? (
                                    <TextAreaExtended
                                        isEditable
                                        title='RFQ Make'
                                        name={`items[${index}].rfqMake`}
                                        content={i.rfqMake}
                                        setContent={(text) => setFieldValue(`items[${index}].rfqMake`, text)}
                                    />
                                ) : (
                                    <TextAreaExtended title='RFQ Make' content={i.rfqMake} />
                                )}
                            </Td>
                            <Td>
                                {isEditable && setFieldValue ? (
                                    <FormItem className='mb-0'>
                                        <Field
                                            component={Input}
                                            size='xs'
                                            type='number'
                                            className='px-[5px] w-20'
                                            name={`items[${index}].rfqQty`}
                                            value={i.rfqQty}
                                            validate={(value: number) => (+value <= 0 ? 'Invalid Qty' : undefined)}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                e.target.value?.split('.')?.[1]?.length > 3 || +e.target.value > +(i?.balanceQty || 0)
                                                    ? null
                                                    : setFieldValue(e.target.name, e.target.value)
                                            }
                                        />
                                    </FormItem>
                                ) : (
                                    i.rfqQty
                                )}
                            </Td>
                            <Td>{i.unit}</Td>
                            <Td>
                                {isEditable && setFieldValue ? (
                                    <TextAreaExtended
                                        isEditable
                                        title='RFQ Remarks'
                                        name={`items[${index}].rfqRemarks`}
                                        content={i.rfqRemarks}
                                        setContent={(text) => setFieldValue(`items[${index}].rfqRemarks`, text)}
                                    />
                                ) : (
                                    <TextAreaExtended title='RFQ Remarks' content={i.rfqRemarks} />
                                )}
                            </Td>
                        </Tr>
                    ))
                    .flat()}
            </TBody>
        </Table>
    )
}

export const RFQItemsDrawer = ({ rfqId }: { rfqId: string }) => {
    const [items, setItems] = useState<RFQItemType[]>([])
    const [loading, setLoading] = useState(false)

    const fetchData = async () => {
        if (!rfqId) return
        if (!items?.length) {
            setLoading(true)
            try {
                const itemsResponse = await ApiService.fetchData<RFQItemType[]>({
                    method: 'get',
                    url: '/rfq/items/' + rfqId,
                })

                setItems(itemsResponse.data)
            } catch (error) {
                console.error(error)
            }
            setLoading(false)
        }
    }

    return (
        <CustomDrawer title='RFQ Indent Items' placement='bottom' fetchData={fetchData}>
            <Loading loading={loading}>
                <RFQItemsTable items={items} isEditable={false} />
            </Loading>
        </CustomDrawer>
    )
}
