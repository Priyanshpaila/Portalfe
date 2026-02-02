import React, { ChangeEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoMdArrowDropright } from 'react-icons/io'
import { MdDeleteOutline, MdOutlineDownloadDone, MdOutlineSave } from 'react-icons/md'
import classNames from 'classnames'

import { Button, DatePicker, Dialog, Input, Select, Table, Tabs } from '@/components/ui'
import DateTimepicker from '@/components/ui/DatePicker/DateTimepicker'
import useQuery from '@/utils/hooks/useQuery'
import ApiService from '@/services/ApiService'
import { getIndentID, termsConditionsOptions } from '@/utils/data'
import { formatDate, formatDateTime } from '@/utils/formatDate'
import TFoot from '@/components/ui/Table/TFoot'
import { CSType, CSVendor } from '@/@types/app'
import TabContent from '@/components/ui/Tabs/TabContent'
import { csTypes } from '@/utils/constants'
import { useAppSelector } from '@/store'
import { PERMISSIONS } from '@/utils/permissions'
import { showAlert, showError } from '@/utils/hoc/showAlert'
import { ConfirmDialog, Loading } from '@/components/shared'
import TabList from '@/components/ui/Tabs/TabList'
import TabNav from '@/components/ui/Tabs/TabNav'
import Negotiation from '../pages/Negotiation'
import { IoPrintOutline } from 'react-icons/io5'
import { useReactToPrint } from 'react-to-print'
import { RiFileExcel2Line } from 'react-icons/ri'
import { exportTableToExcel } from '@/utils/exportTableToExcel'

const { Tr, Th, Td, THead, TBody } = Table

const particulars = [
    { label: 'Last PO Rate', value: 'lastPoRate' },
    { label: 'Last PO No', value: 'lastPoNo' },
    { label: 'Last PO Date', value: 'lastPoDate' },
    { label: 'Last PO Vendor', value: 'lastPoVendor' },
    { label: 'Make', value: 'make' },
    { label: 'Rate', value: 'rate' },
    { label: 'Basic Amount', value: 'basicAmount' },
    { label: 'Discount', value: 'discount' },
    { label: 'Tax Rate', value: 'taxRate', extra: '%' },
    { label: 'Basic After Discount', value: 'basicAfterDiscount' },
    { label: 'Rate After Discount', value: 'rateAfterDiscount' },
]

const particularsTotal = [
    { label: 'Basic After Disc (Total)', value: 'basicAfterDiscount' },
    {
        label: 'Other Charges',
        getValue: (vendor: CSVendor) => (vendor.charges ? `${vendor.charges.otherCharges.amount} (${vendor.charges.otherCharges.gstRate}%)` : 0),
    },
    {
        label: 'Packaging & Forwarding',
        getValue: (vendor: CSVendor) => (vendor.charges ? `${vendor.charges.packagingForwarding.amount} (${vendor.charges.packagingForwarding.gstRate}%)` : 0),
    },
    { label: 'GST', value: 'gst' },
    { label: 'Net Amount', value: 'netAmount' },
]

const INITAL_VALUES: Omit<CSType, 'csType'> = {
    csNumber: '',
    csRemarks: '',
    rfqNumber: '',
    rfqDate: new Date(),
    vendors: [],
    items: [],
    leastValues: {
        basicAfterDiscount: { value: 0, vendorCode: '' },
        netAmount: { value: 0, vendorCode: '' },
    },
}

const tabs = ['CS', 'Negotiation']

export default function ComparativeStatement() {
    const query = useQuery()
    const rfqNumber = query.get('rfqNumber') || undefined
    const csNumber = query.get('csNumber') || undefined

    return <ComparativeStatementComponent viewOnly={false} rfqNumber={rfqNumber} csNumber={csNumber} />
}

export function ComparativeStatementComponent({ viewOnly, rfqNumber, csNumber }: { viewOnly: boolean; rfqNumber?: string; csNumber?: string }) {
    const navigate = useNavigate()

    const sheetRef = useRef<HTMLDivElement>(null)
    const reactToPrintFn = useReactToPrint({ contentRef: sheetRef })

    const [isLoading, setIsLoading] = useState(false)
    const [selection, setSelection] = useState<CSType['selection']>([])

    const [vendorModalState, setVendorModalState] = useState<Pick<CSType['items'][0], 'indentNumber' | 'itemCode' | 'itemDescription' | 'qty'> | null>(null)
    const [csSheet, setCSSheet] = useState<Omit<CSType, 'csType'>>(INITAL_VALUES)
    const [csType, setCSType] = useState(csTypes[1].value)
    const [tab, setTab] = useState(tabs[0])

    useEffect(() => {
        if (!rfqNumber && !csNumber) return
        ;(async () => {
            setIsLoading(true)
            try {
                const response = await ApiService.fetchData<CSType>({
                    method: 'get',
                    url: '/cs' + (csNumber ? '/' : '/generate'),
                    params: {
                        rfqNumber,
                        csNumber,
                    },
                })

                if (response.data?.selection)
                    setSelection(
                        response.data.selection?.map((i) => {
                            if (i.itemCode) {
                                const item = response.data.items?.find((_i) => _i.itemCode === i.itemCode && _i.indentNumber === i.indentNumber)
                                i.itemDescription = item?.itemDescription
                            }
                            const vendor = response.data.vendors.find((v) => v.vendorCode === i.vendorCode)
                            i.name = vendor?.name
                            i.vendorLocation = vendor?.vendorLocation

                            return i
                        }),
                    )

                setCSSheet(response.data)
                setCSType(response.data?.csType)
            } catch (error) {
                const message = 'Failed to generate CS for this RFQ. Please contact support.'
                if (error?.response?.status === 500) showError(message)
                else if (error?.response?.status === 404) showError('Comparative Statement not found for this RFQ.')
                else showError(error?.response?.data?.message || message)

                navigate('/comparative-statements')
            }
            setIsLoading(false)
        })()
    }, [rfqNumber, csNumber])

    const handleSave = async (formValues: CSType) => {
        if (!formValues.csNumber) return showError('CS number is required.')
        if (!formValues.csDate) return showError('CS date is required.')
        if (!formValues.csValidity) return showError('Validity date is required.')
        if (formValues?.status === 1 && !selection?.length) return showError('Vendor selection is required.')

        setIsLoading(true)
        try {
            await ApiService.fetchData({
                method: csNumber ? 'put' : 'post',
                url: '/cs' + (csNumber ? '/' : '/create'),
                data: {
                    ...csSheet,
                    ...formValues,
                    csType,
                    selection,
                },
            })

            showAlert((formValues?.status === 1 ? 'Submitted' : 'Saved') + ' comparative statement successfully.')
            navigate('/comparative-statements')
        } catch (error) {
            const message = 'Failed to save comparative statement. Please contact support.'
            if (error?.response?.status === 500) showError(message)
            else showError(error?.response?.data?.message || message)
        }
        setIsLoading(false)
    }

    const isEditable = !viewOnly && csSheet?.status !== 1

    return (
        <div>
            <title>Comparative Statement</title>
            <Loading type='cover' loading={isLoading || (!rfqNumber && !csNumber)}>
                <CSForm
                    viewOnly={viewOnly}
                    isEditable={isEditable}
                    csSheet={csSheet}
                    csType={csType}
                    setCSType={setCSType}
                    handleSave={handleSave}
                    rfqDetails={{
                        rfqNumber: csSheet?.rfqNumber,
                        rfqDate: csSheet?.rfqDate ? new Date(csSheet.rfqDate) : null,
                        dueDate: csSheet?.rfqDueDate,
                    }}
                />

                <Tabs variant='underline' className='mt-4' value={tab} onChange={setTab}>
                    <TabList>
                        {(viewOnly ? tabs.slice(0, 1) : tabs).map((i) => (
                            <TabNav key={i} className='pt-0' value={i}>
                                <span className='text-xs'>{i}</span>
                            </TabNav>
                        ))}
                        <TabNav disabled className='p-0 opacity-100 cursor-auto flex-1 justify-end gap-1' value='actions'>
                            {tab === tabs[0] && (
                                <>
                                    <Button type='button' variant='twoTone' size='xs' icon={<IoPrintOutline />} onClick={() => reactToPrintFn()}>
                                        Print PDF
                                    </Button>
                                    <Button
                                        type='button'
                                        variant='twoTone'
                                        size='xs'
                                        color='green'
                                        icon={<RiFileExcel2Line />}
                                        onClick={() => exportTableToExcel(sheetRef)}>
                                        Export to Excel
                                    </Button>
                                </>
                            )}
                        </TabNav>
                    </TabList>
                    <TabContent value={tabs[0]}>
                        <div ref={sheetRef} className='print:p-4'>
                            <h4 className='hidden print:block print:mb-4'>
                                Comparative sheet for RFQ {csSheet?.rfqNumber} [{formatDate(csSheet?.rfqDate)}]
                            </h4>

                            <Table compact className='small-table' containerClassName='overflow-auto whitespace-nowrap w-full relative'>
                                <THead className='sticky top-0'>
                                    <Tr>
                                        <Th>Item Description</Th>
                                        <Th>QTY</Th>
                                        <Th>Unit</Th>
                                        <Th>Particular</Th>
                                        {csSheet?.items?.[0]?.vendors?.map((_, idx) => (
                                            <Th key={'v:0:' + idx} className='text-center'>
                                                V{idx + 1}
                                            </Th>
                                        ))}
                                        <Th className='text-center'>L1 Value</Th>
                                        <Th className='text-center'>L1</Th>
                                    </Tr>
                                </THead>

                                <TBody>
                                    <Tr>
                                        <Td></Td>
                                        <Td></Td>
                                        <Td></Td>
                                        <Td>Vendor Name</Td>
                                        {csSheet.vendors?.map((v, idx) => (
                                            <Td key={'v-name:' + idx} className='text-center'>
                                                {v.name}
                                            </Td>
                                        ))}
                                        <Td />
                                        <Td />
                                    </Tr>

                                    <Tr>
                                        <Td></Td>
                                        <Td></Td>
                                        <Td></Td>
                                        <Td>Vendor Contact</Td>
                                        {csSheet.vendors?.map((v, idx) => (
                                            <Td key={'v-contact:' + idx} className='text-center'>
                                                {v.contactPersonName}
                                                {(v.contactNumber || v.contactEmail) && v.contactPersonName ? <br /> : null}({v.contactNumber || v.contactEmail}
                                                )
                                            </Td>
                                        ))}
                                        <Td />
                                        <Td />
                                    </Tr>

                                    <Tr>
                                        <Td></Td>
                                        <Td></Td>
                                        <Td></Td>
                                        <Td>Quotation No & Date</Td>
                                        {csSheet.vendors?.map((v, idx) => (
                                            <Td key={'qn+qd:' + idx} className='text-center'>
                                                {v.quotationNumber} {v.quotationDate && <>({formatDate(v.quotationDate)})</>}
                                            </Td>
                                        ))}
                                        <Td />
                                        <Td />
                                    </Tr>

                                    <Tr>
                                        <Td></Td>
                                        <Td></Td>
                                        <Td></Td>
                                        <Td>Quotation Revision Number</Td>
                                        {csSheet.vendors?.map((v, idx) => <Td key={'qr:' + idx} className='text-center'></Td>)}
                                        <Td />
                                        <Td />
                                    </Tr>

                                    {csSheet?.items?.map((i) => (
                                        <React.Fragment key={i._id}>
                                            <Tr>
                                                <Td className='border-t border-t-slate-500'>
                                                    {!viewOnly && csType === csTypes[0].value && csSheet?.status !== 1 ? (
                                                        <button
                                                            type='button'
                                                            className='flex items-center'
                                                            onClick={() =>
                                                                setVendorModalState({
                                                                    indentNumber: i.indentNumber,
                                                                    itemCode: i.itemCode,
                                                                    itemDescription: i.itemDescription,
                                                                    qty: i.qty,
                                                                })
                                                            }>
                                                            <IoMdArrowDropright size={16} className='text-green-500' />
                                                            {i.itemDescription}
                                                        </button>
                                                    ) : (
                                                        i.itemDescription
                                                    )}
                                                </Td>
                                                <Td className='border-t border-t-slate-500 text-r'>{i.qty?.toFixed(3)}</Td>
                                                <Td className='border-t border-t-slate-500'>{i.unit}</Td>
                                                <Td className='border-t border-t-slate-500'>{particulars[0].label}</Td>
                                                {i.vendors?.map((v, idx) => (
                                                    <Td key={`v-prtclr:${i._id}:v-` + idx} className='border-t border-t-slate-500 text-center'>
                                                        {v[particulars[0].value]}
                                                        {particulars[0]?.extra}
                                                    </Td>
                                                ))}
                                                <Td className='border-t border-t-slate-500' />
                                                <Td className='border-t border-t-slate-500' />
                                            </Tr>
                                            {particulars.slice(1).map((p) => (
                                                <Tr key={`particular:${i._id}:${p.value}`}>
                                                    <Td />
                                                    <Td />
                                                    <Td />
                                                    <Td>{p.label}</Td>
                                                    {i.vendors?.map((v, vIdx) => (
                                                        <Td
                                                            key={`pclr:${i._id}:${p.value}:${vIdx}`}
                                                            className={classNames(
                                                                'text-center !pr-1',
                                                                i?.leastValues?.[p.value] && i?.leastValues?.[p.value]?.vendorCode === vIdx + 1
                                                                    ? 'bg-yellow-400/40 text-black'
                                                                    : null,
                                                            )}>
                                                            {v[p.value]}
                                                            {p?.extra}
                                                        </Td>
                                                    ))}
                                                    <Td className='text-center !pr-1'>{i.leastValues[p.value]?.value || null}</Td>
                                                    <Td className='text-center'>
                                                        {i.leastValues[p.value] ? 'V' : null}
                                                        {i.leastValues[p.value]?.vendorCode}
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </React.Fragment>
                                    ))}

                                    {particularsTotal.map((p, idx) => (
                                        <Tr key={'total:' + p.value} className={idx === particularsTotal.length - 1 ? 'bg-gray-200' : ''}>
                                            <Td className={classNames(idx === 0 ? 'border-t border-t-slate-500' : '', 'bg-white')} colSpan={3} />
                                            <Td
                                                className={classNames(
                                                    idx === 0 ? 'border-t border-t-slate-500' : null,
                                                    idx === particularsTotal.length - 1 ? 'bg-green-600 text-white' : null,
                                                )}>
                                                {p.label}
                                            </Td>
                                            {csSheet?.vendors?.map((v, vIdx) => (
                                                <Td
                                                    key={`total:${p.value}:${vIdx}`}
                                                    className={classNames(
                                                        'text-center !pr-1',
                                                        idx === 0 ? 'border-t border-t-slate-500' : null,
                                                        csSheet?.leastValues?.[p.value] && csSheet?.leastValues?.[p.value]?.vendorCode === vIdx + 1
                                                            ? 'bg-yellow-400/40 text-black'
                                                            : null,
                                                    )}>
                                                    {p.getValue?.(v) || v.total?.[p.value]}
                                                </Td>
                                            ))}
                                            <Td className={classNames('text-center !pr-1', idx === 0 ? 'border-t border-t-slate-500' : '')}>
                                                {csSheet?.leastValues?.[p.value]?.value || null}
                                            </Td>
                                            <Td className={classNames('text-center', idx === 0 ? 'border-t border-t-slate-500' : '')}>
                                                {csSheet?.leastValues?.[p.value] ? 'V' : null}
                                                {csSheet?.leastValues?.[p.value]?.vendorCode}
                                            </Td>
                                        </Tr>
                                    ))}

                                    <Tr>
                                        <Td colSpan={6 + (csSheet?.vendors?.length || 0)} className='h-5' />
                                    </Tr>

                                    <Tr>
                                        <Td colSpan={3} />
                                        <Td>Freight Type</Td>
                                        {csSheet?.vendors?.map((v, idx) => <Td key={'freightType' + idx}>{v.freightType || null}</Td>)}
                                        <Td colSpan={2} />
                                    </Tr>
                                    <Tr>
                                        <Td colSpan={3} />
                                        <Td>Remarks</Td>
                                        {csSheet?.vendors?.map((v, idx) => <Td key={'remarks' + idx}>{v.remarks || null}</Td>)}
                                        <Td colSpan={2} />
                                    </Tr>

                                    {termsConditionsOptions.map((tc) => (
                                        <Tr key={tc.value}>
                                            <Td colSpan={3} />
                                            <Td>{tc.label}</Td>
                                            {csSheet.vendors?.map((v, idx) => <Td key={'tc' + idx}>{v.termsConditions?.[tc.value]}</Td>)}
                                            <Td colSpan={2} />
                                        </Tr>
                                    ))}
                                </TBody>
                            </Table>
                        </div>

                        {csType === csTypes[0].value ? (
                            <Table compact className='small-table'>
                                <THead className='sticky top-0'>
                                    <Tr>
                                        <Th>#</Th>
                                        <Th>Item Description</Th>
                                        <Th>QTY</Th>
                                        <Th>Vendor Name</Th>
                                        <Th>Vendor Location</Th>
                                        <Th>Quotation Number</Th>
                                        <Th>Quotation Date</Th>
                                        <Th></Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {selection?.map((s, idx) => (
                                        <Tr key={`selection-${idx}`}>
                                            <Td>{idx + 1}</Td>
                                            <Td>{s.itemDescription}</Td>
                                            <Td>{s.qty}</Td>
                                            <Td>{s.name}</Td>
                                            <Td>{s.vendorLocation}</Td>
                                            <Td>{s.quotationNumber}</Td>
                                            <Td>{formatDate(s.quotationDate)}</Td>
                                            <Td>
                                                {isEditable && (
                                                    <button
                                                        type='button'
                                                        className='text-red-600'
                                                        onClick={() => setSelection((prev) => prev.slice(0, idx).concat(prev.slice(idx + 1)))}>
                                                        REMOVE
                                                    </button>
                                                )}
                                            </Td>
                                        </Tr>
                                    ))}
                                </TBody>
                            </Table>
                        ) : (
                            <Table compact className='small-table'>
                                <THead className='sticky top-0'>
                                    <Tr>
                                        <Th>#</Th>
                                        <Th></Th>
                                        <Th>Vendor Name</Th>
                                        <Th>Vendor Location</Th>
                                        <Th>Quotation Number</Th>
                                        <Th>Quotation Date</Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {csSheet?.vendors
                                        ?.filter((v) => v?.quotationNumber)
                                        ?.map((v, idx) => (
                                            <Tr
                                                key={`vendor-1-${idx}`}
                                                className={isEditable ? 'cursor-pointer' : null}
                                                onClick={() =>
                                                    isEditable
                                                        ? setSelection([
                                                              {
                                                                  vendorCode: v.vendorCode,
                                                                  quotationNumber: v.quotationNumber,
                                                                  quotationDate: v.quotationDate,
                                                              },
                                                          ])
                                                        : null
                                                }>
                                                <Td>{idx + 1}</Td>
                                                <Td>
                                                    <input
                                                        disabled={!isEditable}
                                                        type='radio'
                                                        checked={selection?.[0]?.vendorCode === v.vendorCode}
                                                        onChange={() => null}
                                                    />
                                                </Td>
                                                <Td>{v.name}</Td>
                                                <Td>{v.vendorLocation}</Td>
                                                <Td>{v.quotationNumber}</Td>
                                                <Td>{formatDate(v.quotationDate)}</Td>
                                            </Tr>
                                        ))}
                                </TBody>
                            </Table>
                        )}

                        <VendorModal
                            isEditable={isEditable}
                            csType={csType}
                            selection={selection}
                            vendors={csSheet?.vendors}
                            vendorModalState={vendorModalState}
                            close={() => setVendorModalState(null)}
                            submit={(_s) => {
                                if (vendorModalState === null) return
                                setSelection((prev) => {
                                    const result = (prev || [])
                                        .filter((i) => getIndentID(i) !== getIndentID(vendorModalState))
                                        .concat(_s)
                                        .reduce<Record<string, CSType['selection']>>((obj, i) => {
                                            const id = getIndentID(i)
                                            return {
                                                ...obj,
                                                [id]: (obj?.[id] || []).concat(i),
                                            }
                                        }, {})

                                    return csSheet?.items?.map((i) => result[getIndentID(i)] || []).flat()
                                })
                                setVendorModalState(null)
                            }}
                        />
                    </TabContent>

                    {!viewOnly && (
                        <TabContent value={tabs[1]}>
                            <Negotiation csSheet={csSheet} />
                        </TabContent>
                    )}
                </Tabs>
            </Loading>
        </div>
    )
}

function CSForm({ viewOnly, isEditable, csType, setCSType, handleSave, rfqDetails, csSheet }) {
    const navigate = useNavigate()
    const [values, setValues] = useState({})
    const authority = useAppSelector((state) => state.auth.user?.authority)
    const [deleteState, setDeleteState] = useState<number | null>()

    useEffect(() => {
        setValues((prev) => ({
            ...prev,
            ...rfqDetails,
            csType: csType,
            csNumber: csSheet?.csNumber,
            csRemarks: csSheet?.csRemarks,
            csDate: new Date(csSheet?.csDate),
            csValidity: new Date(csSheet?.csValidity),
            remarks: Array.isArray(csSheet?.remarks) ? csSheet?.remarks?.[0] : csSheet?.remarks,
        }))
    }, [rfqDetails])

    const handleDelete = async () => {
        setDeleteState(2)
        try {
            const response = await ApiService.fetchData<{ success: true }>({
                method: 'delete',
                url: '/cs/' + csSheet?._id,
            })
            if (response.data.success) {
                setDeleteState(null)
                showAlert(`CS ${csSheet?.csNumber} has been deleted successfully.`)
                navigate('/comparative-statements')
            }
        } catch (error) {
            setDeleteState(1)
            if (error?.response?.status === 500) showError('Failed to delete CS. Please contact support.')
            else if (error?.response?.data?.message) showError(error?.response?.data?.message)
            console.error(error)
        }
    }

    return (
        <div className='text-xs'>
            <ConfirmDialog
                isOpen={!!deleteState}
                type='danger'
                title='Delete CS'
                confirmText='Delete'
                cancelText='Cancel'
                confirmButtonColor='red'
                loading={deleteState === 2}
                closable={!false}
                onCancel={() => setDeleteState(null)}
                onConfirm={handleDelete}>
                Are you sure you want to delete this CS? This action cannot be undone.
            </ConfirmDialog>

            <div className='mb-4 flex justify-between'>
                <div className='flex gap-2 items-center'>
                    <h4>Comparative Statement Sheet</h4>
                    <span
                        className={classNames(
                            'px-2 font-semibold text-white h-full flex items-center rounded-md',
                            csSheet?.status === 1 ? 'bg-green-600' : 'bg-slate-600',
                        )}>
                        {csSheet?.status === 1 ? 'Authorized' : 'Initial'}
                    </span>
                </div>
                {!viewOnly && (
                    <div className='flex gap-2'>
                        {isEditable && (
                            <>
                                <Button variant='solid' size='xs' icon={<MdOutlineSave />} onClick={() => handleSave(values)}>
                                    Save
                                </Button>
                                {authority?.includes(PERMISSIONS.AUTHORIZE_CS) && (
                                    <>
                                        <hr className='h-full w-[1.5px] bg-slate-200' />
                                        <Button variant='solid' size='xs' icon={<MdOutlineDownloadDone />} onClick={() => handleSave({ ...values, status: 1 })}>
                                            Submit
                                        </Button>
                                    </>
                                )}
                            </>
                        )}
                        {csSheet?._id && (
                            <Button variant='solid' size='xs' color='red' icon={<MdDeleteOutline />} onClick={() => setDeleteState(1)}>
                                Delete
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <div className='flex gap-2'>
                <div className='mb-3'>
                    <span className='block mb-2 text-xs'>CS Number</span>
                    <Input
                        disabled
                        type='text'
                        name='csNumber'
                        size={'xs'}
                        value={values.csNumber}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setValues((prev) => ({ ...prev, csNumber: e.target.value }))}
                    />
                </div>
                <div className='mb-3'>
                    <span className='block mb-2 text-xs'>CS Date</span>
                    <DatePicker
                        disabled
                        name='csDate'
                        size={'xs'}
                        inputFormat='DD/MM/YYYY'
                        value={values.csDate || null}
                        onChange={(newDate: Date | null) => setValues((prev) => ({ ...prev, csDate: newDate }))}
                    />
                </div>
                <div className='mb-3'>
                    <span className='block mb-2 text-xs'>Validity Date</span>
                    <DateTimepicker
                        disabled={!isEditable}
                        name='csValidity'
                        size={'xs'}
                        value={values.csValidity || null}
                        onChange={(newDate: Date | null) => setValues((prev) => ({ ...prev, csValidity: newDate }))}
                    />
                </div>
                <div className='mb-3'>
                    <span className='block mb-2 text-xs'>CS Type</span>
                    <Select
                        isDisabled={!isEditable}
                        size='xs'
                        name='csType'
                        className='w-56'
                        value={csTypes.find((i) => i.value === csType) || null}
                        options={csTypes.filter((i) => i.value !== csType)}
                        onChange={(newValue) => setCSType(newValue?.value)}
                    />
                </div>
            </div>
            <div className='flex gap-2'>
                <div>
                    <div className='flex gap-2'>
                        <div>
                            <span className='block mb-2 text-xs'>RFQ Number</span>
                            <Input disabled type='text' name='rfqNumber' size={'xs'} value={values.rfqNumber} onChange={() => null} />
                        </div>
                        <div>
                            <span className='block mb-2 text-xs'>RFQ Date</span>
                            <DatePicker disabled inputFormat='DD/MM/YYYY' name='rfqDate' size={'xs'} value={values.rfqDate || null} onChange={() => null} />
                        </div>
                    </div>
                    <div>
                        <span className='inline-block mt-3 font-bold'>
                            {csSheet.vendors?.filter((i) => i.quotationNumber).length} / {csSheet.vendors?.length} : (Submitted Quotation / Total Vendors )
                        </span>
                        <br />
                        <span className='inline-block mt-0.5 mb-1'>RFQ due till: {formatDateTime(rfqDetails.dueDate)}</span>
                    </div>
                </div>
                <div className='mb-3 flex-1'>
                    <span className='block mb-2 text-xs'>Remarks</span>
                    <Input
                        disabled={!isEditable}
                        textArea={true}
                        name='csRemarks'
                        size={'xs'}
                        className='!h-15 min-h-auto resize-none'
                        value={values.csRemarks || null}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setValues((prev) => ({ ...prev, csRemarks: e.target.value }))}
                    />
                </div>
            </div>
        </div>
    )
}

const VendorModal = ({ isEditable, vendors, csType, vendorModalState, close, submit, selection: _prevSelection }) => {
    const [selection, setSelection] = useState([])

    useEffect(() => {
        if (!vendorModalState) return setSelection([])
        setSelection(
            _prevSelection
                ?.filter((i) => getIndentID(i) === getIndentID(vendorModalState))
                ?.map((i) => ({
                    ...i,
                    checked: true,
                })) || [],
        )
    }, [vendorModalState, _prevSelection])

    const usedQty = selection?.reduce((sum, _i) => sum + (+_i?.qty || 0), 0)

    return (
        <Dialog isOpen={!!vendorModalState} width={window.innerWidth * 0.8} closable={false}>
            <h4 className='mb-4'>Select Vendors ({vendorModalState?.itemCode})</h4>
            <Table compact className='text-xs'>
                <THead className='sticky top-0'>
                    <Tr>
                        <Th>#</Th>
                        <Th></Th>
                        <Th>Vendor Name</Th>
                        <Th>Vendor Location</Th>
                        <Th>Quotation Number</Th>
                        <Th>Quotation Date</Th>
                        <Th>Qty</Th>
                    </Tr>
                </THead>
                <TBody>
                    {vendors
                        ?.filter((v) => v?.quotationNumber)
                        ?.map((v, idx) => {
                            const vendorQty = +selection?.find((i) => i.vendorCode === v.vendorCode)?.qty || 0
                            return (
                                <Tr key={`vendor-2-${idx}`}>
                                    <Td>{idx + 1}</Td>
                                    <Td>
                                        <input
                                            disabled={!isEditable}
                                            type='checkbox'
                                            checked={
                                                selection?.find(
                                                    (i) =>
                                                        (csType === csTypes[0].value ? i.itemCode === vendorModalState?.itemCode : true) &&
                                                        i.vendorCode === v.vendorCode,
                                                )?.checked
                                            }
                                            onChange={(e) =>
                                                setSelection((prev) =>
                                                    e.target.checked
                                                        ? prev.concat([
                                                              {
                                                                  ...vendorModalState,
                                                                  ...v,
                                                                  vendorCode: v.vendorCode,
                                                                  checked: e.target.checked,
                                                                  qty: e.target.checked ? Math.max(+vendorModalState?.qty - usedQty, 0).toFixed(3) : undefined,
                                                              },
                                                          ])
                                                        : prev.filter((i) => i.vendorCode !== v.vendorCode && i.itemCode === vendorModalState?.itemCode),
                                                )
                                            }
                                        />
                                    </Td>
                                    <Td>{v.name}</Td>
                                    <Td>{v.vendorLocation}</Td>
                                    <Td>{v.quotationNumber}</Td>
                                    <Td>{formatDate(v.quotationDate)}</Td>
                                    <Td>
                                        <Input
                                            disabled={!isEditable}
                                            className='p-1 w-16'
                                            type='number'
                                            size='xs'
                                            value={selection?.find((i) => i.vendorCode === v.vendorCode)?.qty}
                                            onChange={(e) =>
                                                usedQty - vendorQty + +e.target.value > +vendorModalState?.qty || e.target.value.split('.')?.[1]?.length > 3
                                                    ? null
                                                    : setSelection((prev) =>
                                                          prev.map((i) => (i.vendorCode === v.vendorCode ? { ...i, qty: e.target.value } : i)),
                                                      )
                                            }
                                        />
                                    </Td>
                                </Tr>
                            )
                        })}
                </TBody>
                <TFoot>
                    <Tr>
                        <Td colSpan={7}>
                            {isEditable && (
                                <div className='flex justify-end gap-2'>
                                    <Button variant='twoTone' size='sm' className='w-20' onClick={close}>
                                        Cancel
                                    </Button>
                                    <Button variant='solid' size='sm' className='w-20' onClick={() => submit(selection)}>
                                        Save
                                    </Button>
                                </div>
                            )}
                        </Td>
                    </Tr>
                </TFoot>
            </Table>
        </Dialog>
    )
}
