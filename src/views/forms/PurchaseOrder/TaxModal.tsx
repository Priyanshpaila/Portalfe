import { OptionType, TaxChargeType } from '@/@types/app'
import { Button, Dialog, Input, Select } from '@/components/ui'
import { chargeNames, chargeNatures, chargeOnOptions, chargeTypes } from '@/utils/data'
import React, { ChangeEvent, useState } from 'react'
import { SingleValue } from 'react-select'

type TaxModalProps = {
    isOpen: boolean
    onClose: () => void
    onSubmit: (state: TaxChargeType) => void
}

export default function TaxModal({ isOpen, onClose, onSubmit }: TaxModalProps) {
    const [state, setState] = useState<TaxChargeType>({
        chargeName: '',
        chargeType: '',
        nature: '',
        chargeOn: '',
        chargeValue: '',
        chargeAmount: 0,
        status: 0,
        taxField: '',
    })

    return (
        <Dialog isOpen={isOpen} closable={false} className={'text-xs'}>
            <h6 className='mb-4'>Tax Details</h6>

            <div className='flex items-center mt-2'>
                <span className='inline-block w-40'>Charge Name</span>
                <Select
                    size='xs'
                    className='w-full'
                    value={chargeNames.find((i) => i.value === state?.chargeName)}
                    options={chargeNames}
                    onChange={(option: SingleValue<OptionType>) =>
                        setState((prev) => ({
                            ...prev,
                            chargeName: option?.value as string,
                            taxField: option?.label?.split('@')?.[0]?.trim()?.toLowerCase() || '',
                        }))
                    }
                />
            </div>
            <div className='flex items-center mt-2'>
                <span className='inline-block w-40'>Charge Type</span>
                <Select
                    size='xs'
                    className='w-full'
                    value={chargeTypes.find((i) => i.value === state?.chargeType)}
                    options={chargeTypes}
                    onChange={(option: SingleValue<OptionType>) => setState((prev) => ({ ...prev, chargeType: option?.value as string }))}
                />
            </div>
            <div className='flex items-center mt-2'>
                <span className='inline-block w-40'>Nature</span>
                <Select
                    size='xs'
                    className='w-full'
                    value={chargeNatures.find((i) => i.value === state?.nature)}
                    options={chargeNatures}
                    onChange={(option: SingleValue<OptionType>) => setState((prev) => ({ ...prev, nature: option?.value as string }))}
                />
            </div>
            <div className='flex items-center mt-2'>
                <span className='inline-block w-40'>Charge On</span>
                <Select
                    size='xs'
                    className='w-full'
                    value={chargeOnOptions.find((i) => i.value === state?.chargeOn)}
                    options={chargeOnOptions}
                    onChange={(option: SingleValue<OptionType>) => setState((prev) => ({ ...prev, chargeOn: option?.value as string }))}
                />
            </div>
            <div className='flex items-center mt-2'>
                <span className='inline-block w-40'>Charge Value</span>
                <Input
                    size='xs'
                    className='w-full px-1'
                    value={state.chargeValue}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setState((prev) => ({ ...prev, chargeValue: e.target?.value }))}
                />
            </div>

            <div className='flex gap-2 justify-end mt-6'>
                <Button type='button' variant='default' size='sm' onClick={() => onClose()}>
                    Close
                </Button>
                <Button type='button' variant='solid' size='sm' onClick={() => onSubmit(state)}>
                    Add
                </Button>
            </div>
        </Dialog>
    )
}
