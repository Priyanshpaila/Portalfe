// src/components/app/VendorModal.tsx
import { useEffect, useMemo, useState } from 'react'
import { Button, Dialog, Select, Spinner } from '../ui'
import { RFQVendorType, VendorType } from '@/@types/app'
import { SingleValue } from 'react-select'
import { showError } from '@/utils/hoc/showAlert'

type VendorModalProps = {
    isOpen: boolean
    onClose: () => void
    addVendor: (vendor: RFQVendorType, shouldClose: boolean) => void
    vendors: VendorType[]
    loading?: number
}

// Contact person shape from your API
type ContactPerson = {
    name?: string
    email?: string
    mobilePhoneIndicator?: string
    fullPhoneNumber?: string
    callerPhoneNumber?: string
}

function safeArr<T = any>(v: any): T[] {
    return Array.isArray(v) ? v : []
}

function pickContactPersons(v: any): ContactPerson[] {
    // ✅ supports both shapes:
    // - v.contactPerson (legacy)
    // - v.vendorProfile.contactPerson (your current response)
    return safeArr<ContactPerson>(v?.contactPerson).length
        ? safeArr<ContactPerson>(v?.contactPerson)
        : safeArr<ContactPerson>(v?.vendorProfile?.contactPerson)
}

function pickVendorStreet(v: any): string {
    // ✅ prefer vendorProfile street (your response)
    return (
        String(v?.vendorProfile?.street || '').trim() ||
        String(v?.street || '').trim() ||
        String(v?.vendorProfile?.streetHouseNumber || '').trim() ||
        ''
    )
}

export default function VendorModal({ loading, isOpen, onClose, vendors, addVendor }: VendorModalProps) {
    const safeVendors = useMemo(() => (Array.isArray(vendors) ? vendors : []), [vendors])

    const [selection, setSelection] = useState<VendorType | null>(null)
    const [selectedContact, setSelectedContact] = useState<ContactPerson | null>(null)

    useEffect(() => {
        if (!isOpen) return
        setSelection(null)
        setSelectedContact(null)
    }, [isOpen])

    const contactOptions = useMemo<ContactPerson[]>(() => {
        const cps = pickContactPersons(selection)
        return cps.filter((i) => Boolean(String(i?.name || '').trim() || String(i?.email || '').trim()))
    }, [selection])

    const locationText = useMemo(() => {
        const s = pickVendorStreet(selection)
        return s || ''
    }, [selection])

    const handleAddVendor = (shouldClose = false) => {
        if (!selection || !selectedContact) return showError('Vendor and contact person are required.')

        addVendor(
            {
                name: (selection as any)?.name || (selection as any)?.vendorProfile?.name || '',
                vendorCode: String((selection as any)?.vendorCode || (selection as any)?.vendorProfile?.vendorCode || ''),
                contactPerson: {
                    name: String(selectedContact?.name || ''),
                    email: String(selectedContact?.email || ''),
                },
                location: locationText || '',
            },
            shouldClose,
        )

        setSelection(null)
        setSelectedContact(null)
    }

    return (
        <Dialog isOpen={isOpen} closable={false}>
            <div>
                <h4 className="text-lg font-bold mb-4 block">Add Vendor</h4>
            </div>

            <div className="space-y-2">
                {/* Vendor */}
                <div className="flex items-center gap-2">
                    <span className="block mb-1 w-40 text-sm">Vendor</span>

                    <Select
                        size="sm"
                        className="text-sm w-full"
                        value={selection || null}
                        options={safeVendors}
                        getOptionLabel={(option: any) => option?.name || option?.vendorProfile?.name || String(option?.vendorCode || option?.vendorProfile?.vendorCode || '')}
                        getOptionValue={(option: any) => String(option?.vendorCode || option?.vendorProfile?.vendorCode || option?._id || '')}
                        onChange={(s: SingleValue<VendorType>) => {
                            const sel = (s as any) || null
                            setSelection(sel)

                            const cps = pickContactPersons(sel)
                            const usable = cps.filter((i) => Boolean(String(i?.name || '').trim() || String(i?.email || '').trim()))

                            if (usable.length === 1) setSelectedContact(usable[0] || null)
                            else setSelectedContact(null)
                        }}
                    />
                </div>

                {/* Location */}
                <div className="flex items-center gap-2">
                    <span className="block mb-1 w-40 text-sm">Location</span>
                    <span className="block w-full">
                        {locationText ? locationText : <span className="opacity-60">N/A</span>}
                    </span>
                </div>

                {/* Contact Person */}
                <div className="flex items-center gap-2">
                    <span className="block mb-1 w-40 text-sm">Contact Person</span>

                    <Select
                        size="sm"
                        className="text-sm w-full"
                        isDisabled={!selection}
                        value={selectedContact || null}
                        options={contactOptions} // ✅ always array
                        getOptionLabel={(option: ContactPerson) => {
                            const name = String(option?.name || '').trim() || 'Contact'
                            const email = String(option?.email || '').trim()
                            return email ? `${name} (${email.toLowerCase()})` : name
                        }}
                        getOptionValue={(option: ContactPerson) => {
                            // ✅ stable unique-ish value
                            return (
                                String(option?.callerPhoneNumber || '').trim() ||
                                String(option?.fullPhoneNumber || '').trim() ||
                                String(option?.email || '').trim() ||
                                String(option?.name || '').trim()
                            )
                        }}
                        onChange={(val: any) => setSelectedContact(val || null)}
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-between gap-2 mt-8">
                    <Button size="sm" variant="default" className="mr-auto" onClick={onClose}>
                        Close
                    </Button>

                    <Button size="sm" variant="twoTone" icon={loading === 1 ? <Spinner /> : null} onClick={() => handleAddVendor(false)}>
                        Add Vendor
                    </Button>

                    <Button size="sm" variant="solid" icon={loading === 2 ? <Spinner /> : null} onClick={() => handleAddVendor(true)}>
                        Add & Close
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}