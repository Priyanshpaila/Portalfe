import CustomDrawer from './CustomDrawer'
import { ConfirmDialog, Loading } from '../shared'
import { useEffect, useRef, useState } from 'react'
import { RiMailSendLine } from 'react-icons/ri'
import { MdAdd, MdOpenInNew, MdOutlineHistory } from 'react-icons/md'
import classNames from 'classnames'

import ApiService from '@/services/ApiService'
import { Button, Spinner, Table, Tag } from '@/components/ui'
import { QuotationType, RFQVendorType, VendorType as _VendorType } from '@/@types/app'
import { useNavigate } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import QuotationPrint from '../prints/Quotation.print'
import { showAlert, showError, showWarning } from '@/utils/hoc/showAlert'
import VendorModal from './VendorModal'
import { IoPrintOutline } from 'react-icons/io5'
import { clubItems } from '@/utils/clubItems'

const { Tr, Th, Td, THead, TBody } = Table

type VendorType = RFQVendorType & { quotation?: QuotationType }

export function VendorQuotationsTable({ rfqId, vendors }: { rfqId?: string; vendors: VendorType[]; isEditable?: boolean }) {
    const [flags, setFlags] = useState<{
        sendingEmail?: string | boolean
    }>({})

    const handleMailSend = async (vendor: VendorType) => {
        if (flags.sendingEmail) return
        setFlags((prev) => ({ ...prev, sendingEmail: vendor.vendorCode }))
        try {
            const response = await ApiService.fetchData<{ success: boolean }>({
                method: 'get',
                url: `/rfq/resend-email?rfqId=${rfqId}&vendorCode=${vendor.vendorCode}`,
            })
            if (response.data.success) {
                showAlert('Email sent successfully')
            }
        } catch (error) {
            console.error('Error sending email:', error)
            showError(error?.response?.status !== 500 ? error?.response?.data?.message : 'Failed to send email')
        }
        setFlags((prev) => ({ ...prev, sendingEmail: false }))
    }

    return (
        <Table compact className='text-xs'>
            <THead className='sticky top-0'>
                <Tr>
                    <Th>#</Th>
                    <Th>Vendor Code</Th>
                    <Th>Vendor Name</Th>
                    <Th>Location</Th>
                    <Th>Contact Person</Th>
                    <Th>Email</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                </Tr>
            </THead>
            <TBody>
                {vendors?.map(({ quotation, ...i }, index) => (
                    <Tr key={i.vendorCode}>
                        <Td>{index + 1}</Td>
                        <Td>{i.vendorCode}</Td>
                        <Td>{i.name}</Td>
                        <Td>{i.location}</Td>
                        <Td>{i.contactPerson.name}</Td>
                        <Td>{i.contactPerson.email}</Td>
                        <Td>
                            <div className='flex gap-2 items-center'>
                                <Tag
                                    className='w-fit border-none p-0'
                                    prefix={
                                        <span
                                            className={classNames(
                                                'size-2.5 mr-1 rounded-full block border',
                                                i?.status === 2
                                                    ? 'bg-red-600 border-red-700'
                                                    : quotation?._id
                                                      ? 'bg-green-500 border-green-600'
                                                      : 'bg-amber-600 border-amber-700',
                                            )}
                                        />
                                    }>
                                    {i?.status === 2 ? 'Regret' : quotation?._id ? 'Received' : 'Pending'}
                                </Tag>
                            </div>
                        </Td>
                        <Td>
                            <div className='flex gap-1'>
                                <Button variant='twoTone' size='xs' icon={<MdOutlineHistory size={16} />} />

                                {i?.status !== 2 &&
                                    (flags.sendingEmail === i.vendorCode ? (
                                        <Spinner size={16} />
                                    ) : (
                                        <Button variant='twoTone' color='red' size='xs' icon={<RiMailSendLine size={16} />} onClick={() => handleMailSend(i)} />
                                    ))}

                                {quotation?._id && <QuotaionPrintComponent quotation={quotation} vendorName={i.name as string} />}
                            </div>
                        </Td>
                    </Tr>
                ))}
            </TBody>
        </Table>
    )
}

export const QuotaionPrintComponent = ({ quotation, vendorName }: { quotation: QuotationType; vendorName: string }) => {
    const quotationPreviewRef = useRef<HTMLDivElement>(null)
    const reactToPrintFn = useReactToPrint({ contentRef: quotationPreviewRef })

    const [quotationData, setQuotationData] = useState<QuotationType | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (quotationData?._id) reactToPrintFn()
    }, [reactToPrintFn, quotationData])

    const handlePrint = async () => {
        if (quotationData?._id === quotation?._id) return reactToPrintFn()
        setLoading(true)
        try {
            const response = await ApiService.fetchData<QuotationType['items']>({
                url: `/quotation/items/${quotation._id}`,
                params: {
                    appendRFQDetails: true,
                },
            })
            setQuotationData({ ...quotation, items: clubItems(response.data)?.items })
        } catch (e) {
            showError('Failed to fetch quotation data to print. Please contact support.')
        }
        setLoading(false)
    }

    return (
        <>
            <Button variant='twoTone' size='xs' icon={<IoPrintOutline />} loading={loading} onClick={handlePrint}>
                QT
            </Button>
            <div ref={quotationPreviewRef} className='hidden print:block'>
                <QuotationPrint quotation={quotationData as QuotationType} vendorName={vendorName} />
            </div>
        </>
    )
}

type CSStateType = { _id: string; csNumber: string; status: 0 | 1; poNumber?: number }
export const VendorQuotationsDrawer = ({ rfqId, rfqNumber }: { rfqId: string; rfqNumber?: string }) => {
    const [vendors, setVendors] = useState<VendorType[]>([])
    const [csState, setCSState] = useState<CSStateType>()
    const [loading, setLoading] = useState(false)

    const fetchData = async () => {
        if (!rfqId) return
        if (!vendors?.length) {
            setLoading(true)
            try {
                const itemsResponse = await ApiService.fetchData<{
                    vendors: VendorType[]
                    cs?: CSStateType
                }>({
                    method: 'get',
                    url: '/rfq/vendors/' + rfqId,
                })

                setVendors(itemsResponse.data?.vendors)
                setCSState(itemsResponse.data.cs)
            } catch (error) {
                console.error(error)
            }
            setLoading(false)
        }
    }

    return (
        <CustomDrawer
            title='Quotations'
            placement='bottom'
            fetchData={fetchData}
            footer={() => (
                <div className='flex gap-3 justify-end w-full'>
                    <AddVendor rfqId={rfqId} vendors={vendors?.map((i) => i.vendorCode)} onAdd={(vendor) => setVendors((prev) => prev.concat(vendor))} />
                    <GenerateCSButton rfqNumber={rfqNumber as string} csState={csState} isDisabled={!vendors?.some((i) => i.quotation?._id)} />
                </div>
            )}>
            <Loading loading={loading}>
                <VendorQuotationsTable rfqId={rfqId} vendors={vendors} isEditable={false} />
            </Loading>
        </CustomDrawer>
    )
}

function GenerateCSButton({ rfqNumber, csState, isDisabled }: { rfqNumber: string; csState: CSStateType; isDisabled: boolean }) {
    const navigate = useNavigate()
    const [promptStatus, setPromptStatus] = useState(false)

    const checkStatus = () => {
        if (csState?.csNumber) setPromptStatus(true)
        else navigate(`/comparative-statement?rfqNumber=${encodeURIComponent(rfqNumber || '')}`)
    }

    return (
        <>
            <Button disabled={isDisabled} variant='solid' size='sm' icon={<MdOpenInNew />} onClick={checkStatus}>
                <span>Generate CS</span>
            </Button>

            <ConfirmDialog
                isOpen={promptStatus}
                closable={false}
                showCancelButton={!csState?.poNumber}
                confirmText={csState?.poNumber ? 'Close' : 'Regenerate CS'}
                onCancel={() => setPromptStatus(false)}
                onConfirm={() => {
                    if (csState?.poNumber && false) setPromptStatus(false)
                    else navigate(`/comparative-statement?rfqNumber=${encodeURIComponent(rfqNumber)}`)
                }}>
                <div>
                    <p>
                        CS{' '}
                        <b>
                            {csState?.csNumber} ({csState?.status === 1 ? 'Approved' : 'Unapproved'})
                        </b>{' '}
                        already exists for this RFQ. {!csState?.poNumber ? 'Would you like to refresh the CS?' : null}
                    </p>
                    {csState?.poNumber && (
                        <p className='my-2'>
                            <span className='inline-block'>
                                PO Status: <b>Generated</b>
                            </span>
                            <span className='inline-block opacity-75'>In order to regenerate the CS, please delete the generated PO first.</span>
                        </p>
                    )}
                    <Button
                        color={'green'}
                        className='mt-2'
                        variant='solid'
                        size='sm'
                        icon={<MdOpenInNew />}
                        onClick={() => navigate(`/comparative-statement?csNumber=${encodeURIComponent(csState?.csNumber)}`)}>
                        <span>View CS</span>
                    </Button>
                </div>
            </ConfirmDialog>
        </>
    )
}

function AddVendor({ rfqId, vendors: currVendors, onAdd }: { rfqId: string; vendors: string[]; onAdd: (vendor: RFQVendorType) => void }) {
    const [promptStatus, setPromptStatus] = useState(false)
    const [vendors, setVendors] = useState<_VendorType[]>([])
    const [loading, setLoading] = useState<number | boolean>(false)

    useEffect(() => {
        if (!currVendors?.length) return
        ;(async () => {
            setLoading(true)
            try {
                const response = await ApiService.fetchData<_VendorType[]>({
                    method: 'get',
                    url: '/vendor/basic-details',
                })
                setVendors(response.data?.filter((i) => !currVendors.includes(i.vendorCode)))
            } catch (error) {
                console.error(error)
            }
            setLoading(false)
        })()
    }, [currVendors])

    const handleAddVendor = async (vendor: RFQVendorType, shouldClose: boolean) => {
        setLoading(shouldClose ? 2 : 1)
        try {
            const response = await ApiService.fetchData<{errorMessage?:string}>({
                method: 'patch',
                url: '/rfq/add-vendor/' + rfqId,
                data: { vendor },
            })

            if (shouldClose) setPromptStatus(false)
            if (response?.data?.errorMessage) showWarning(response?.data?.errorMessage)
            onAdd(vendor)
        } catch (error) {
            if (error?.response?.error?.status !== 500) showError(error?.response?.data?.message)
            else showError('Failed to add new vendor')
            console.error(error)
        }
        setLoading(false)
    }

    return (
        <>
            <Button type='button' variant='twoTone' size='sm' icon={loading ? <Spinner /> : <MdAdd />} onClick={() => setPromptStatus(true)}>
                <span>Add Vendor</span>
            </Button>

            <VendorModal
                loading={loading as number}
                isOpen={promptStatus}
                vendors={vendors}
                addVendor={handleAddVendor}
                onClose={() => setPromptStatus(false)}
            />
            {/* <Dialog >
                <div className='py-3 px-4'>
                    <h4 className='text-lg mb-3'>Add New Vendor</h4>

                </div>
                <div className='flex justify-start flex-row-reverse gap-3 py-3 px-4 border-t'>
                    <Button variant='solid' size='sm' icon={<MdAdd />}>
                        Add Vendor
                    </Button>
                    <Button variant='default' size='sm'>
                        Cancel
                    </Button>
                </div>
            </Dialog> */}
        </>
    )
}
