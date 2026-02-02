import { TermsAndConditionsType } from '@/@types/app'
import { Input, Table } from '@/components/ui'
import { termsConditionsOptions } from '@/utils/data'
import CustomDrawer from './CustomDrawer'
import { Loading } from '../shared'

const { Tr, Th, Td, THead, TBody } = Table

export default function TermsAndConditions({
    isEditable,
    termsConditions,
    setFieldValue,
}: {
    isEditable?: boolean
    termsConditions: TermsAndConditionsType
    setFieldValue?: (key: string, value: string) => void
}) {
    return (
        <div className='h-[45vh] overflow-auto'>
            <Table compact className='text-xs' containerClassName='h-full small-table'>
                <THead className='sticky top-0'>
                    <Tr>
                        <Th className='border-r  border-r-slate-400/80'>Type</Th>
                        <Th className='w-full '>Terms & Conditions</Th>
                    </Tr>
                </THead>
                <TBody>
                    {termsConditionsOptions.map(({ value: key }) => (
                        <Tr key={key}>
                            <Td className='border-r border-r-slate-400/80 whitespace-nowrap'>
                                <div className='flex items-center gap-2'>
                                    <span>{termsConditionsOptions.find((i) => i.value === key)?.label}</span>
                                </div>
                            </Td>
                            <Td className='py-0'>
                                {isEditable ? (
                                    <Input
                                        size='xs'
                                        name={`termsConditions.${key}`}
                                        className='border-none !p-0 ring-0 outline-0 m-0'
                                        placeholder='Terms & Conditions'
                                        value={termsConditions[key]}
                                        onChange={(e) => setFieldValue?.(e.target.name, e.target.value)}
                                    />
                                ) : (
                                    termsConditions[key]
                                )}
                            </Td>
                        </Tr>
                    ))}
                </TBody>
            </Table>
        </div>
    )
}

export const TnCDrawer = ({ data }: { data: TermsAndConditionsType }) => (
    <CustomDrawer title='Terms And Conditions' placement='bottom'>
        <Loading>
            <TermsAndConditions termsConditions={data} isEditable={false} />
        </Loading>
    </CustomDrawer>
)
