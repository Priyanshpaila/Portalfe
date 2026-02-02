import { useEffect, useState } from 'react'
import { Button, Dialog, Input, Select, Spinner } from '../ui'
import { RFQVendorType, VendorType } from '@/@types/app'
import { SingleValue } from 'react-select'
import { showError } from '@/utils/hoc/showAlert'
import { set } from 'lodash'

type VendorModalProps = {
    isOpen: boolean
    onClose: () => void
    addVendor: (vendor: RFQVendorType, shouldClose: boolean) => void
    vendors: VendorType[]
    loading?: number
}

export default function VendorModal({ loading, isOpen, onClose, vendors, addVendor }: VendorModalProps) {
    const [selection, setSelection] = useState<VendorType | null>(null)
    const [selectedContact, setSelectedContact] = useState<VendorType['contactPerson'][0] | null>(null)

    useEffect(() => {
        setSelection(null)
        setSelectedContact(null)
    }, [isOpen])

    const handleAddVendor = (shouldClose = false) => {
        if (!selectedContact || !selection) return showError('Vendor and contact person are required.')
        addVendor(
            {
                name: selection?.name,
                vendorCode: selection?.vendorCode || '',
                contactPerson: {
                    name: selectedContact?.name || '',
                    email: selectedContact?.email || '',
                },
                location: selection?.street || '',
            },
            shouldClose,
        )
        setSelection(null)
        setSelectedContact(null)
    }

    return (
        <Dialog isOpen={isOpen} closable={false}>
            <div>
                <h4 className='text-lg font-bold mb-4 block'>Add Vendor</h4>
            </div>
            <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                    <span className='block mb-1 w-40 text-sm'>Vendor</span>
                    <Select
                        size='sm'
                        className='text-sm w-full'
                        value={selection || null}
                        options={vendors}
                        getOptionLabel={(option: VendorType) => option.name || option.vendorCode}
                        getOptionValue={(option: VendorType) => option.vendorCode.toString()}
                        onChange={(s: SingleValue<VendorType>) => {
                            setSelection(s)
                            if (s?.contactPerson?.length === 1) setSelectedContact(s?.contactPerson[0] || null)
                            else setSelectedContact(null)
                        }}
                    />
                </div>
                <div className='flex items-center gap-2'>
                    <span className='block mb-1 w-40 text-sm'>Location</span>
                    <span className='block w-full'>{selection?.street || <span className='opacity-60'>N/A</span>}</span>
                </div>

                <div className='flex items-center gap-2'>
                    <span className='block mb-1 w-40 text-sm'>Contact Person</span>
                    <Select
                        size='sm'
                        className='text-sm w-full'
                        isDisabled={!selection}
                        value={selectedContact || null}
                        options={selection?.contactPerson.filter((i) => i.name || i.email)}
                        getOptionLabel={(option: VendorType['contactPerson'][0]) => `${option.name} (${option.email.toLowerCase()})`}
                        getOptionValue={(option: VendorType['contactPerson'][0]) => option.callerPhoneNumber}
                        onChange={(val) => setSelectedContact(val)}
                    />
                </div>

                <div className='flex justify-between gap-2 mt-8'>
                    <Button size='sm' variant='default' className='mr-auto' onClick={onClose}>
                        Close
                    </Button>
                    <Button size='sm' variant='twoTone' icon={loading === 1 ? <Spinner /> : null} onClick={() => handleAddVendor()}>
                        Add Vendor
                    </Button>
                    <Button size='sm' variant='solid' icon={loading === 2 ? <Spinner /> : null} onClick={() => handleAddVendor(true)}>
                        Add & Close
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}
