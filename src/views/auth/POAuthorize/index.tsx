import { Button, Input, Table, Tag } from '@/components/ui'
import React, { useEffect, useMemo, useState } from 'react'
import Menu from '@/components/ui/Menu'
import Tr from '@/components/ui/Table/Tr'
import Td from '@/components/ui/Table/Td'
import TBody from '@/components/ui/Table/TBody'
import { termsConditionsOptions } from '@/utils/data'
import { IndentType, POType, VendorType } from '@/@types/app'
import { formatDateTime, formatTimeDifference, formatDate } from '@/utils/formatDate'
import { AttachmentsTable } from '@/components/app/Attachments'
import useQuery from '@/utils/hooks/useQuery'
import ApiService from '@/services/ApiService'
import { showAlert, showError, showWarning } from '@/utils/hoc/showAlert'
import { useAppSelector } from '@/store'
import { Link } from 'react-router-dom'
import useAuth from '@/utils/hooks/useAuth'
import { ConfirmDialog } from '@/components/shared'
import CSModal from '@/components/app/CSModal'

type _POType = Omit<POType, 'authorize'> & {
    authorize: (POType['authorize'][0] & {
        name: string
        username: string
    })[]
}

function getUserCompanyName(u: any) {
    // supports: user.company.name OR user.company (string)
    return String(u?.company?.name ?? u?.company ?? '').trim()
}

// optional: if you have company meta in user (gstin/pan), it will be used automatically
function getUserCompanyMeta(u: any): { label?: string; gstin?: string; pan?: string; division?: string } {
    const companyObj: any = u?.company
    return {
        label: String(companyObj?.label ?? companyObj?.name ?? companyObj ?? '').trim(),
        gstin: String(companyObj?.gstin ?? '').trim(),
        pan: String(companyObj?.pan ?? '').trim(),
        division: String(companyObj?.division ?? '').trim(),
    }
}

export default function POAuthorize() {
    const { signOut } = useAuth()
    const user = useAppSelector((state) => state.auth.user)
    const [po, setPO] = useState<_POType>()
    const [vendor, setVendor] = useState<VendorType | undefined>()
    const [indents, setIndents] = useState<IndentType[]>([])
    const [signOutPrompt, setSignOutPrompt] = useState(false)
    const [data, setData] = useState<{
        user?: string
        assignOn?: Date | string | null
        changedOn?: Date | string | null
        approvalStatus?: 0 | 1 | 2
        comment?: string
        nextApprover?: string
    }>()

    const query = useQuery()
    const poNumber = query.get('poNumber')

    // ✅ Company details from logged in user
    const myCompanyName = useMemo(() => getUserCompanyName(user), [user])
    const myCompanyMeta = useMemo(() => getUserCompanyMeta(user), [user])

    useEffect(() => {
        if (!poNumber || !user?.username) return
        ;(async () => {
            try {
                const poResponse = await ApiService.fetchData<_POType>({
                    method: 'get',
                    url: '/po',
                    params: {
                        poNumber,
                        attachAuthUsers: true,
                    },
                })

                const userIdx = poResponse.data?.authorize?.findIndex((i) => i.username === user?.username)

                setData({
                    ...poResponse.data?.authorize?.[userIdx],
                    nextApprover: poResponse.data?.authorize?.[userIdx + 1]?.name,
                })
                setPO(poResponse.data)

                if (poResponse.data.vendorCode) {
                    const vendorResponse = await ApiService.fetchData<VendorType[]>({
                        method: 'get',
                        url: '/vendor/list',
                        params: {
                            vendorCode: poResponse.data.vendorCode,
                        },
                    })

                    setVendor(vendorResponse.data?.[0])
                }

                if (poResponse.data.items?.length) {
                    const indentNumbers: string[] = []
                    const itemCodes: string[] = []
                    for (const i of poResponse.data.items) {
                        indentNumbers.push(i.indentNumber)
                        itemCodes.push(i.itemCode)
                    }
                    if (indentNumbers.length) {
                        const indentsResponse = await ApiService.fetchData<IndentType[]>({
                            method: 'post',
                            url: '/indent',
                            data: {
                                indentNumber: indentNumbers,
                                itemCode: itemCodes,
                            },
                        })
                        setIndents(indentsResponse.data)
                    }
                }
            } catch (error) {
                console.error(error)
            }
        })()
    }, [poNumber, user])

    const handlePOAction = async (approvalStatus: 1 | 2) => {
        if (!po?.poNumber) return
        if (approvalStatus === 2 && !data?.comment?.trim()?.length) {
            return showError('Comments must be provided for PO rejection.')
        }
        const action = approvalStatus === 1 ? 'approve' : 'reject'

        try {
            const response = await ApiService.fetchData<{ success: boolean; errorMessage?: string; authorize: POType['authorize'][0] }>({
                method: 'patch',
                url: `/po/authorize`,
                data: {
                    ...data,
                    id: po?._id,
                    approvalStatus,
                },
            })
            if (response?.data?.errorMessage) showWarning(response?.data?.errorMessage)
            else showAlert(`PO ${action}${action?.endsWith('e') ? 'd' : 'ed'} successfully.`)
            setData(response.data.authorize)
        } catch (error) {
            console.error(error)
            showError(`Failed to ${action} PO.`)
        }
    }

    return (
        <>
            <ConfirmDialog
                isOpen={signOutPrompt}
                closable={false}
                type='danger'
                title='Sign Out'
                confirmText='Sign out'
                cancelText='Cancel'
                confirmButtonColor='red'
                onCancel={() => setSignOutPrompt(false)}
                onConfirm={signOut}>
                Are you sure you want to sign out? You will be redirected to sign in page.
            </ConfirmDialog>

            <div className='fixed top-0 left-0 w-screen h-screen overflow-auto bg-white z-30 text-xs'>
                <header className='flex justify-between items-center px-6 py-2 bg-blue-600'>
                    <h1 className='text-lg text-white'>PO Authorize</h1>
                    <div className='flex gap-2'>
                        <Link to={'/dashboard'}>
                            <Button size='xs' variant='twoTone'>
                                Dashboard
                            </Button>
                        </Link>
                        <Button size='xs' variant='twoTone' onClick={() => setSignOutPrompt(true)}>
                            Logout
                        </Button>
                    </div>
                </header>

                <main className='px-6 pt-4 pb-20'>
                    <div className='flex justify-between text-xs gap-8 mb-4'>
                        {data?.nextApprover && (
                            <div className='h-full flex gap-2'>
                                <span>Next Approver: </span>
                                <span>{data.nextApprover}</span>
                            </div>
                        )}
                        <div className='flex gap-2 flex-1'>
                            <span>Comment: </span>
                            <Input
                                textArea
                                disabled={!!data?.changedOn}
                                className='min-h-auto'
                                rows={3}
                                value={data?.comment}
                                onChange={(e) => setData((prev) => ({ ...prev, comment: e.target.value }))}
                            />
                        </div>
                        <div className='h-full flex gap-2'>
                            {po?.shippingAccount?.priority && (
                                <Tag className='border-red-500 border-2 bg-red-500 text-white'>{po?.shippingAccount?.priority}</Tag>
                            )}
                        </div>
                    </div>

                    <div className='flex justify-between'>
                        {/* ✅ COMPANY (removed hard-coded RR ISPAT) */}
                        <div className='flex-1'>
                            <span className='inline-block mb-2 text-[#DB7744] font-[900] text-sm'>
                                <b>Company</b>
                            </span>
                            <div>
                                <p className='my-0.5'>
                                    <span className='font-bold block'>[0] ({formatDate(po?.poDate as string)})</span>
                                    <span>
                                        {myCompanyMeta?.label || myCompanyName || po?.company || '—'}
                                        {myCompanyMeta?.division ? ` (${myCompanyMeta.division})` : ''}
                                    </span>
                                </p>

                                <table>
                                    <tbody>
                                        <tr>
                                            <td className='pr-2 font-bold'>Portal PO No.</td>
                                            <td>: {po?.poNumber}</td>
                                        </tr>

                                        <tr>
                                            <td className='pr-2 font-bold'>GSTIN NO.</td>
                                            <td>: {myCompanyMeta?.gstin || (po as any)?.gstin || '—'}</td>
                                        </tr>

                                        <tr>
                                            <td className='pr-2 font-bold'>PAN NO.</td>
                                            <td>: {myCompanyMeta?.pan || (po as any)?.pan || '—'}</td>
                                        </tr>

                                        <tr>
                                            <td className='pr-2 font-bold'>Contact Detail</td>
                                            <td>: {po?.contactPersonName}</td>
                                        </tr>

                                        <tr>
                                            <td className='pr-2 font-bold'>Ref. Document Type</td>
                                            <td className='capitalize'>: {po?.refDocumentType}</td>
                                        </tr>

                                        <tr>
                                            <td className='pr-2 font-bold'>Ref. Document No.</td>
                                            <td>
                                                : {po?.refDocumentNumber}
                                                {po?.refCSNumber && <CSModal csNumber={po.refCSNumber} />}
                                            </td>
                                        </tr>

                                        <tr>
                                            <td className='pr-2 font-bold'>PO Validity</td>
                                            <td>: {formatDate(po?.validityDate as string)}</td>
                                        </tr>

                                        <tr>
                                            <td className='pr-2 font-bold'>PO Remarks</td>
                                            <td>: {po?.remarks}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* VENDOR */}
                        <div className='flex-1'>
                            <div>
                                <p className='my-0.5'>
                                    <span className='inline-block mb-2 text-[#DB7744] font-[900] text-sm'>
                                        <b>Vendor</b>
                                    </span>
                                    <span className='font-bold block'>{vendor?.name}</span>
                                    <span>
                                        {vendor?.street}, {vendor?.city}, {vendor?.countryKey}
                                    </span>
                                </p>
                                <table>
                                    <tbody>
                                        <tr>
                                            <td className='pr-2 font-bold'>GSTIN No</td>
                                            <td>: {vendor?.gstin}</td>
                                        </tr>
                                        <tr>
                                            <td className='pr-2 font-bold'>PAN No.</td>
                                            <td>: {vendor?.panNumber}</td>
                                        </tr>
                                        <tr>
                                            <td className='pr-2 font-bold'>Contact Detail</td>
                                            <td>:</td>
                                        </tr>
                                        <tr>
                                            <td className='pr-2 font-bold'>Email</td>
                                            <td>: {vendor?.contactPerson?.map((i) => i.email)?.join(', ')}</td>
                                        </tr>
                                        <tr>
                                            <td className='pr-2 font-bold'>Contact Person</td>
                                            <td>: {vendor?.contactPerson?.map((i) => i.name)?.join(', ')}</td>
                                        </tr>
                                        <tr>
                                            <td className='pr-2 font-bold'>MSME No.</td>
                                            <td>: {vendor?.msme}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* SHIPMENT */}
                        <div className='flex-1'>
                            <span className='inline-block mb-2 text-[#DB7744] font-[900] text-sm'>
                                <b>Shipment</b>
                            </span>
                            <div>
                                <table>
                                    <tbody>
                                        <tr>
                                            <td className='pr-2 font-bold'>From Location</td>
                                            <td>: {po?.shippingAccount?.fromLocation}</td>
                                        </tr>
                                        <tr>
                                            <td className='pr-2 font-bold'>To Location</td>
                                            <td>: {po?.shippingAccount?.toLocation}</td>
                                        </tr>
                                        <tr>
                                            <td className='pr-2 font-bold'>Freight Type</td>
                                            <td>: {po?.shippingAccount?.freightType}</td>
                                        </tr>
                                        <tr>
                                            <td className='pr-2 font-bold'>Shipping Address</td>
                                            <td>: {po?.shippingAccount?.shippingAddress}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <VerticalTabs po={po as _POType} indents={indents} />
                </main>

                <footer className='flex bg-white gap-2 justify-end px-6 py-2 fixed bottom-0 w-full border-t border-2'>
                    {data?.approvalStatus ? (
                        <div className='font-bold'>
                            <span className={data?.approvalStatus === 1 ? 'text-green-600' : 'text-red-500'}>
                                {data?.approvalStatus === 1 ? 'Approved' : 'Rejected'}
                            </span>{' '}
                            on {formatDateTime(data?.changedOn as string)}
                        </div>
                    ) : (
                        <>
                            <Button size='xs' variant='solid' color='red' onClick={() => handlePOAction(2)}>
                                Reject
                            </Button>
                            <Button size='xs' variant='solid' color='green' onClick={() => handlePOAction(1)}>
                                Approve
                            </Button>
                        </>
                    )}
                </footer>
            </div>
        </>
    )
}

const VerticalTabs = ({ po, indents }: { po: _POType; indents: IndentType[] }) => {
    if (!po || !indents?.[0]) return null
    return (
        <Menu className='mt-4'>
            <Menu.MenuCollapse eventKey='itemDetail' label='Item Detail' className='bg-gray-100 hover:bg-slate-400/20 mb-1'>
                <table className='w-full my-3'>
                    {po?.items?.map((i) => (
                        <React.Fragment key={i.indentNumber + ':' + i.itemCode}>
                            <tr>
                                <td className='pt-2 pr-1.5' colSpan={2}>
                                    <b>{i.itemDescription}</b>
                                </td>
                                <td className='pt-2 pr-1.5 text-right'>
                                    <b>Qty</b> : {Number(i.qty)?.toFixed(3)} {i.unit}
                                </td>
                                <td className='pt-2 pr-1.5 text-right'>
                                    <b>Rate</b> : {Number(i.rate)?.toFixed(2)}
                                </td>
                                <td className='pt-2 pr-1.5 text-right'>
                                    <b>Basic</b> : {i.amount?.taxable?.toFixed(2)}
                                </td>
                                <td className='pt-2 pr-1.5 text-right'>
                                    <b>CGST</b> : {(((i.amount.cgst ?? 0 / (i.amount.taxable ?? 1)) * 100) / 2).toFixed(2)} %
                                </td>
                                <td className='pt-2 pr-1.5 text-right'>
                                    <b>SGST</b> : {(((i.amount.sgst ?? 0 / (i.amount.taxable ?? 1)) * 100) / 2).toFixed(2)} %
                                </td>
                                <td className='pt-2 pr-1.5 text-right'>
                                    <b>Net Amt</b> : {i.amount.total?.toFixed(2)}
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <b>HSN</b> : {i.hsnCode}
                                </td>
                                <td>
                                    <b>PO Make</b> : {i.make}
                                </td>
                                <td colSpan={3} />
                                <td className='text-right'>{i.amount?.cgst}</td>
                                <td className='text-right'>{i.amount?.sgst}</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td className='pr-1.5 pb-2 border-b'>
                                    <b>Delivery Date</b> : {formatDate(i.schedule as string)}
                                </td>
                                <td colSpan={7} className='pb-2 border-b' />
                            </tr>
                        </React.Fragment>
                    ))}
                </table>
            </Menu.MenuCollapse>

            <Menu.MenuCollapse eventKey='chargeDetail' label='Charge Detail' className='bg-gray-100 hover:bg-slate-400/20 mb-1'>
                <Table compact containerClassName='w-[30vw] ml-auto border my-3'>
                    <TBody>
                        <Tr>
                            <Td>
                                <b>Basic</b>
                            </Td>
                            <Td className='border-l'>{po?.amount?.basic}</Td>
                        </Tr>
                        <Tr>
                            <Td>
                                <b>CGST @ 9%</b>
                            </Td>
                            <Td className='border-l'>{po?.amount?.cgst}</Td>
                        </Tr>
                        <Tr>
                            <Td>
                                <b>SGST @ 9%</b>
                            </Td>
                            {/* NOTE: this line was hard-coded "200" before; kept as-is? If you want, change to po.amount.sgst */}
                            <Td className='border-l'>{po?.amount?.sgst}</Td>
                        </Tr>
                        {po?.taxDetails?.map((i) => (
                            <Tr key={'tax:' + i.chargeName}>
                                <Td>
                                    <b>{i.chargeName}</b>
                                </Td>
                                <Td className='border-l'>{i.chargeAmount}</Td>
                            </Tr>
                        ))}
                        <Tr>
                            <Td>
                                <b>Total</b>
                            </Td>
                            <Td className='border-l'>{po?.amount.total?.toFixed(2)}</Td>
                        </Tr>
                    </TBody>
                </Table>
            </Menu.MenuCollapse>

            <Menu.MenuCollapse eventKey='terms&condition' label='Terms & Condition' className='bg-gray-100 hover:bg-slate-400/20 mb-1'>
                <Table compact containerClassName='border my-3'>
                    <TBody>
                        {termsConditionsOptions.map(({ label, value: key }) => (
                            <Tr key={key}>
                                <Td className='border-r whitespace-nowrap'>{label}</Td>
                                <Td className='py-0'>{(po as any)?.termsConditions?.[key]}</Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>
            </Menu.MenuCollapse>

            <Menu.MenuCollapse eventKey='paymentTerms' label='Payment Terms' className='bg-gray-100 hover:bg-slate-400/20 mb-1'>
                <ol>
                    {po.paymentTerms?.map((pt, i) => (
                        <li key={'pt:list-' + i}>
                            {i + 1}. {pt.paymentType} -- {pt.payValuePercent?.toFixed?.(2)}% on {pt.payOn} within {pt.days} Days
                        </li>
                    ))}
                </ol>
            </Menu.MenuCollapse>

            <Menu.MenuCollapse eventKey='indentDetail' label='Indent Detail' className='bg-gray-100 hover:bg-slate-400/20 mb-1'>
                <table className='w-full my-3'>
                    <tbody>
                        {indents?.map((i) => (
                            <React.Fragment key={'indent:' + i.indentNumber + ':' + i.itemCode}>
                                <tr>
                                    <td className='pt-2 pr-2 align-top'>
                                        <b>{i.indentNumber}</b> ({formatDate(i.documentDate)}, ERP Authorized Date : 08/07/2025, ERP Created Date :{' '}
                                        {formatDate(i.createdOn as string)} ) <b>{i?.itemCode}</b>
                                    </td>
                                    <td className='pt-2 pr-2 whitespace-nowrap align-top'>
                                        <b>Unit</b>
                                    </td>
                                    <td className='pt-2 pr-2 whitespace-nowrap align-top'>
                                        <b>Make</b>
                                    </td>
                                    <td className='pt-2 pr-2 whitespace-nowrap align-top'>
                                        <b>Cost Center</b>
                                    </td>
                                    <td className='pt-2 pr-2 whitespace-nowrap align-top'>
                                        <b>Requested By</b>
                                    </td>
                                    <td className='pt-2 pr-2 whitespace-nowrap align-top'>
                                        <b>Indent Type</b>
                                    </td>
                                    <td className='pt-2 pr-2 whitespace-nowrap align-top text-right'>
                                        <b>Ind. Qty</b>
                                        <span>: {(+i.indentQty)?.toFixed(3)}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td className='border-b pb-2 pr-2'>{i.techSpec}</td>
                                    <td className='border-b pb-2 pr-2'>{i.unitOfMeasure}</td>
                                    <td className='border-b pb-2 pr-2'>{i.make}</td>
                                    <td className='border-b pb-2 pr-2'>{i.costCenter}</td>
                                    <td className='border-b pb-2 pr-2'>{i.requestedBy}</td>
                                    <td className='border-b pb-2 pr-2'>{(i as any).documentType}</td>
                                    <td className='border-b pb-2 pr-2 text-right'>
                                        PO Qty:{' '}
                                        {(+(po?.items?.find((_i) => _i.indentNumber === i.indentNumber && _i.itemCode === i.itemCode)?.qty ?? 0))?.toFixed(3)}
                                    </td>
                                </tr>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </Menu.MenuCollapse>

            <Menu.MenuCollapse eventKey='attachment' label='Attachment' className='bg-gray-100 hover:bg-slate-400/20 mb-1'>
                <AttachmentsTable id={po?._id as string} attachments={po?.attachments || []} />
            </Menu.MenuCollapse>

            <Menu.MenuCollapse eventKey='authorizationDetail' label='Authorization Detail' className='bg-gray-100 hover:bg-slate-400/20 mb-1'>
                <Table>
                    <TBody>
                        {po?.authorize?.map((i, idx) => (
                            <Tr key={'authorize:' + i.user}>
                                <Td className='align-top'>
                                    <b>Level {idx + 1}</b>
                                    <br />
                                    {i.name}
                                </Td>
                                <Td className='align-top'>
                                    <b>Assigned On</b>
                                    <br />
                                    {formatDate(i.assignOn as string)}
                                </Td>
                                <Td className='align-top'>
                                    <b>Duration</b>
                                    <br />
                                    {formatTimeDifference(i.assignOn as string, i.changedOn as string)}
                                </Td>
                                <Td className='align-top'>
                                    <b>Current Status</b>
                                    <br />
                                    {i.approvalStatus === 1 ? 'Authorized' : i.approvalStatus === 2 ? 'Rejected' : 'Initial'}
                                    {i.approvalStatus && i.changedOn ? <>[{formatDateTime(i.changedOn as string)}]</> : null}
                                </Td>
                                <Td className='align-top'>
                                    <b>Comment</b>
                                    <br />
                                    {i.comment}
                                </Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>
            </Menu.MenuCollapse>
        </Menu>
    )
}