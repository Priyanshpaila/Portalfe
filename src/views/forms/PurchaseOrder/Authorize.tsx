import { POType, UserType } from '@/@types/app'
import { ConfirmDialog } from '@/components/shared'
import { Button, Table, Select, Input } from '@/components/ui'
import ApiService from '@/services/ApiService'
import { useAppSelector } from '@/store'
import { formatDateTime, formatTimeDifference } from '@/utils/formatDate'
import { showAlert, showError, showWarning } from '@/utils/hoc/showAlert'
import { FormikHelpers } from 'formik'
import { useEffect, useState } from 'react'
import { BiSolidCheckSquare, BiSolidXSquare } from 'react-icons/bi'
import { MdAdd } from 'react-icons/md'
import { AxiosError } from 'axios'

const { Tr, Th, Td, THead, TBody } = Table

export default function Authorize({
    values,
    setFieldValue,
    setValues,
    checkUnsavedChanges,
    updateAuthorize,
}: {
    values: POType
    setFieldValue: FormikHelpers<POType>['setFieldValue']
    setValues: FormikHelpers<POType>['setValues']
    checkUnsavedChanges: (values: POType) => boolean
    updateAuthorize: (authorize: POType['authorize']) => void
}) {
    const [authDialogState, setAuthDialogState] = useState<{
        status: 1 | 2
        statusLabel: 'Approve' | 'Reject'
        idx: number
    } | null>(null)
    const [flags, setFlags] = useState<{
        loading?: boolean
        authorize?: [number, 1 | 2]
    }>({})
    const loggedInUser = useAppSelector((state) => state?.auth?.user)
    const [users, setUsers] = useState<UserType[]>([])

    useEffect(() => {
        ;(async () => {
            try {
                const response = await ApiService.fetchData<UserType[]>({
                    method: 'get',
                    url: '/user/po-vendors',
                })
                setUsers(response.data)
            } catch (error) {
                console.error(error)
            }
        })()
    }, [])

    const handleAddLevel = () =>
        setValues((prev) => ({
            ...prev,
            authorize: [
                ...(prev?.authorize || []),
                {
                    level: '',
                    user: '',
                    assignOn: new Date(),
                    changedOn: '',
                    duration: '',
                    status: '',
                    approvalStatus: 0,
                    comment: '',
                    lastStatus: '',
                    lastComment: '',
                },
            ],
        }))

    const handleLevelChange = (idx: number, value: Partial<POType['authorize'][0]>) => {
        setValues((prev) => ({
            ...prev,
            authorize: prev?.authorize?.map((row, i) => (i === idx ? { ...row, ...value } : row)),
        }))
    }

    const handleAuthorize = async (idx: number, approvalStatus: 1 | 2) => {
        setAuthDialogState(null)
        setFlags({ authorize: [idx, approvalStatus] })
        const row = values.authorize[idx]
        try {
            const payload = {
                id: values._id,
                comment: row.comment,
                changedOn: new Date(),
                approvalStatus,
            }

            const response = await ApiService.fetchData<{ errorMessage?: string; authorize: POType['authorize'][0] }>({
                method: 'patch',
                url: '/po/authorize',
                data: payload,
            })

            updateAuthorize(values?.authorize?.map((row, i) => (i === idx ? { ...row, ...response.data.authorize } : row)))
            if (response?.data?.errorMessage) showWarning(response?.data?.errorMessage)
            else showAlert((approvalStatus ? 'Approved' : 'Rejected') + ' purchase order successfully.')
        } catch (error) {
            const message = 'Failed to update approval status. Please contact support.'
            const axiosError = error as AxiosError
            if (axiosError?.response?.status === 500) showError(message)
            else showError((axiosError?.response?.data as any)?.message || message)
        }
        setFlags({})
    }

    return (
        <>
            <div className='flex justify-end items-center gap-4 my-2'>
                <label className='flex items-center gap-2 justify-end cursor-pointer select-none'>
                    <input
                        disabled={Boolean(values?.readyForAuthorization)}
                        type='checkbox'
                        className='size-4'
                        checked={Boolean(values._readyForAuthorization)}
                        onChange={(e) => setFieldValue('_readyForAuthorization', e.target.checked)}
                    />
                    <span>Ready for authorization</span>
                </label>
                {!values?.readyForAuthorization && (
                    <Button type='button' variant='solid' size='xs' icon={<MdAdd />} className='items-center' onClick={handleAddLevel}>
                        Add Level
                    </Button>
                )}
            </div>
            <Table compact className='relative small-table'>
                <THead className='sticky top-0'>
                    <Tr>
                        <Th>#</Th>
                        <Th>Level</Th>
                        <Th>User</Th>
                        <Th>Assign On</Th>
                        <Th>Changed On</Th>
                        <Th>Duration</Th>
                        <Th>Status</Th>
                        <Th>Action</Th>
                        <Th>Comment</Th>
                        <Th></Th>
                    </Tr>
                </THead>
                <TBody>
                    {values.authorize?.map((row, idx) => {
                        const isActionDisabled =
                            !users.some((i) => i._id === row.user && i.username === loggedInUser.username) ||
                            (idx !== 0 && !values.authorize[idx - 1]?.approvalStatus)

                        return (
                            <Tr key={'auth-user:' + idx}>
                                <Td>{idx + 1}</Td>
                                <Td>{`Level ${idx + 1}`}</Td>
                                <Td>
                                    {values?.readyForAuthorization || row?.approvalStatus ? (
                                        users.find((i) => i._id === row.user)?.name
                                    ) : (
                                        <Select
                                            size='xs'
                                            menuPosition='fixed'
                                            name={`authorize[${idx}].user`}
                                            className='w-56'
                                            value={users.find((i) => i._id === row.user)}
                                            options={users.filter((i) => !values.authorize?.filter((_i) => _i.user === i._id)?.length)}
                                            getOptionLabel={(o) => `${o.name} (${o.username})`}
                                            getOptionValue={(o) => o._id as string}
                                            onChange={(newValue) => handleLevelChange(idx, { user: newValue?._id || '' })}
                                        />
                                    )}
                                </Td>
                                <Td>{formatDateTime(row.assignOn as string)}</Td>
                                <Td>{formatDateTime(row.changedOn as string)}</Td>
                                <Td>{formatTimeDifference(row.assignOn as string, row.changedOn as string)}</Td>
                                <Td>{row.approvalStatus === 2 ? 'Rejected' : row.approvalStatus === 1 ? 'Authorized' : 'Initial'}</Td>
                                <Td>
                                    <div className='flex items-center gap-1'>
                                        <Button
                                            disabled={Boolean(isActionDisabled || row.approvalStatus)}
                                            type='button'
                                            variant='plain'
                                            className='p-0 w-[29.33px] h-[29.33px]'
                                            icon={<BiSolidCheckSquare className='text-green-500 size-7' />}
                                            loading={flags?.authorize?.[0] === idx && flags?.authorize?.[1] === 1}
                                            onClick={() => {
                                                if (checkUnsavedChanges(values))
                                                    return showError('Please save the unsaved changes before updating approval status.')
                                                setAuthDialogState({ idx, status: 1, statusLabel: 'Approve' })
                                            }}
                                        />
                                        <Button
                                            disabled={Boolean(isActionDisabled || row.approvalStatus)}
                                            type='button'
                                            variant='plain'
                                            className='p-0 w-[29.33px] h-[29.33px]'
                                            icon={<BiSolidXSquare className='text-red-600 size-7' />}
                                            loading={flags?.authorize?.[0] === idx && flags?.authorize?.[1] === 2}
                                            onClick={() => {
                                                if (checkUnsavedChanges(values))
                                                    return showError('Please save the unsaved changes before updating approval status.')
                                                if (!values.authorize[idx]?.comment?.length) return showError('Comments must be provided for PO rejection')
                                                setAuthDialogState({ idx, status: 2, statusLabel: 'Reject' })
                                            }}
                                        />
                                    </div>
                                </Td>
                                <Td>
                                    {isActionDisabled || row.approvalStatus ? (
                                        row.comment
                                    ) : (
                                        <Input
                                            size='xs'
                                            placeholder='Enter comment'
                                            name={`authorize[${idx}].comment`}
                                            value={row.comment}
                                            onChange={(e) => handleLevelChange(idx, { comment: e.target.value })}
                                        />
                                    )}
                                </Td>
                                <Td>
                                    {!values?.readyForAuthorization && !row?.approvalStatus && (
                                        <Button
                                            type='button'
                                            variant='plain'
                                            className='p-0 w-auto h-auto'
                                            icon={<BiSolidXSquare className='text-red-600 size-7' />}
                                            onClick={() =>
                                                setValues((prev) => ({
                                                    ...prev,
                                                    authorize: prev.authorize.slice(0, idx).concat(prev.authorize.slice(idx + 1, values.authorize.length)),
                                                }))
                                            }
                                        />
                                    )}
                                </Td>
                            </Tr>
                        )
                    })}
                </TBody>
            </Table>

            <ConfirmDialog
                isOpen={authDialogState !== null}
                closable={false}
                type='danger'
                title={`${authDialogState?.statusLabel} Purchase Order`}
                confirmText={`${authDialogState?.statusLabel} PO`}
                cancelText='Cancel'
                confirmButtonColor={authDialogState?.status === 1 ? 'green' : 'red'}
                onCancel={() => setAuthDialogState(null)}
                onConfirm={() => handleAuthorize(authDialogState?.idx as number, authDialogState?.status as 1 | 2)}>
                Are you sure you want to {authDialogState?.statusLabel?.toLowerCase()} the PO? This action is irreversible.
            </ConfirmDialog>
        </>
    )
}
