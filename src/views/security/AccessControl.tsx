import { Button, Dialog, FormContainer, FormItem, Input, Select, Spinner } from '@/components/ui'
import Table from '@/components/ui/Table'
import React, { useEffect, useState, useCallback, ChangeEvent } from 'react'
import { IoIosAdd } from 'react-icons/io'
import ApiService from '@/services/ApiService'
import { Field, Form, Formik, FormikHelpers } from 'formik'
import { RoleType, UserType as _UserType } from '@/@types/app'
import { MdOutlineDeleteOutline, MdOutlineImage, MdOutlineModeEdit } from 'react-icons/md'
import { showAlert, showError } from '@/utils/hoc/showAlert'
import { PERMISSIONS, permissionsOptions } from '@/utils/permissions'

const { Tr, Th, Td, THead, TBody } = Table

type RoleFormValues = {
    name: string
    permissions: string[]
    status: number
}

type CompanyFields = {
    name: string
    industry: string
    gstin: string
    pan: string
    phone: string
    website: string
    addressLine1: string
    addressLine2: string
    city: string
    state: string
    pincode: string
}

type UserType = _UserType & { roleName?: string; company?: Partial<CompanyFields> }
type EditDialogType = 'user' | 'role' | 'vendor' | null

export default function AccessControl() {
    const [users, setUsers] = useState<UserType[]>([])
    const [roles, setRoles] = useState<RoleType[]>([])
    const [loading, setLoading] = useState(true)
    const [showUserDialog, setShowUserDialog] = useState(false)
    const [showRoleDialog, setShowRoleDialog] = useState(false)
    const [editDialogType, setEditDialogType] = useState<EditDialogType>(null)
    const [editData, setEditData] = useState<UserType | RoleType | null>(null)
    const [deleteDialog, setDeleteDialog] = useState<{ type: EditDialogType; data: UserType | RoleType | null } | null>(null)
    const [actionLoading, setActionLoading] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [usersRes, rolesRes] = await Promise.all([
                ApiService.fetchData<UserType[]>({
                    method: 'get',
                    url: '/user',
                }),
                ApiService.fetchData<{ roles: RoleType[] }>({
                    method: 'get',
                    url: '/role',
                }),
            ])
            setUsers(
                usersRes.data.map((i) => ({
                    ...i,
                    roleName: rolesRes.data.roles.find((r) => r._id === i.role)?.name,
                })),
            )
            setRoles(rolesRes.data.roles)
        } catch (err: any) {
            showError(err?.message || 'Failed to fetch data.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Add/Edit User
    const handleAddEditUser = useCallback(
        async (values: UserType, { resetForm }: FormikHelpers<UserType>) => {
            setActionLoading(true)
            try {
                const formData = new FormData()

                Object.entries(values as any).forEach(([key, value]) => {
                    if (value === undefined || value === null) return

                    // ✅ send nested company correctly
                    if (key === 'company' && typeof value === 'object' && !(value instanceof Blob)) {
                        formData.append('company', JSON.stringify(value))
                        return
                    }

                    // ✅ for any other nested objects/arrays (safe)
                    if (typeof value === 'object' && !(value instanceof Blob)) {
                        formData.append(key, JSON.stringify(value))
                        return
                    }

                    formData.append(key, value as any)
                })

                if (editDialogType === 'user' && editData && (editData as UserType)._id) {
                    await ApiService.fetchData({
                        method: 'put',
                        url: `/user/${(editData as UserType)._id}`,
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                        data: formData,
                    })
                    showAlert('User updated successfully.')
                } else {
                    await ApiService.fetchData({
                        method: 'post',
                        url: '/user',
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                        data: formData,
                    })
                    showAlert('User added successfully.')
                }
                setShowUserDialog(false)
                setEditDialogType(null)
                setEditData(null)
                resetForm()
                fetchData()
            } catch (err: any) {
                showError(err?.message || 'Failed to save user.')
            } finally {
                setActionLoading(false)
            }
        },
        [fetchData, editDialogType, editData],
    )

    // Add/Edit Role
    const handleAddEditRole = useCallback(
        async (values: RoleFormValues, { resetForm }: FormikHelpers<RoleFormValues>) => {
            setActionLoading(true)
            try {
                if (editDialogType === 'role' && editData && (editData as RoleType)._id) {
                    await ApiService.fetchData({
                        method: 'put',
                        url: `/role/${(editData as RoleType)._id}`,
                        data: values,
                    })
                    showAlert('Role updated successfully.')
                } else {
                    await ApiService.fetchData({
                        method: 'post',
                        url: '/role',
                        data: values,
                    })
                    showAlert('Role added successfully.')
                }
                setShowRoleDialog(false)
                setEditDialogType(null)
                setEditData(null)
                resetForm()
                fetchData()
            } catch (err: any) {
                showError(err?.response?.data?.message || err?.message || 'Failed to delete.')
            } finally {
                setActionLoading(false)
            }
        },
        [fetchData, editDialogType, editData],
    )

    // Delete User/Role
    const handleDelete = async () => {
        if (!deleteDialog?.data || !deleteDialog?.type) return
        setActionLoading(true)
        try {
            if (deleteDialog.type === 'user') {
                await ApiService.fetchData({
                    method: 'delete',
                    url: `/user/${(deleteDialog.data as UserType)._id}`,
                })
                showAlert('User deleted successfully.')
            } else if (deleteDialog.type === 'role') {
                await ApiService.fetchData({
                    method: 'delete',
                    url: `/role/${(deleteDialog.data as RoleType)._id}`,
                })
                showAlert('Role deleted successfully.')
            }
            setDeleteDialog(null)
            fetchData()
        } catch (err: any) {
            setDeleteDialog(null)
            showError(err?.response?.data?.message || err?.message || 'Failed to delete.')
        } finally {
            setActionLoading(false)
        }
    }

    const [userView, setUserView] = useState(0)
    const _users = users.filter((u) => (userView === 0 ? !u.vendorCode : u.vendorCode))

    return (
        <div>
            <h2>Access Control</h2>

            <div className='flex justify-between items-center mt-5 mb-3'>
                <div className='flex gap-2 items-center'>
                    <Button size='sm' variant={userView === 0 ? 'solid' : 'plain'} onClick={() => setUserView(0)}>
                        Users
                    </Button>
                    <Button size='sm' variant={userView === 1 ? 'solid' : 'plain'} onClick={() => setUserView(1)}>
                        Vendors
                    </Button>
                </div>

                <Button
                    variant='twoTone'
                    size='sm'
                    icon={<IoIosAdd />}
                    onClick={() => {
                        setShowUserDialog(true)
                        setEditDialogType(null)
                        setEditData(null)
                    }}>
                    Add User
                </Button>
            </div>

            <Table compact className='text-xs relative' containerClassName='max-h-[80vh] overflow-auto relative my-2'>
                <THead className='sticky top-0'>
                    <Tr>
                        <Th>#</Th>
                        <Th>Name</Th>
                        {userView === 0 && <Th>Role</Th>}
                        <Th>Username</Th>
                        <Th>Email</Th>
                        <Th>Status</Th>
                        <Th></Th>
                    </Tr>
                </THead>
                <TBody>
                    {loading ? (
                        <Tr>
                            <Td colSpan={7}>
                                <Spinner size={20} className='mx-auto' />
                            </Td>
                        </Tr>
                    ) : _users.length === 0 ? (
                        <Tr>
                            <Td colSpan={7}>No {userView === 0 ? 'user' : 'vendor'} found.</Td>
                        </Tr>
                    ) : (
                        _users.map((user, idx) => (
                            <Tr key={user._id}>
                                <Td>{idx + 1}.</Td>
                                <Td>{user.name}</Td>
                                {userView === 0 && <Td>{user.roleName}</Td>}
                                <Td>{user.username}</Td>
                                <Td>
                                    <span className='opacity-80'>{user.vendorCode ? `Vendor: (${user.vendorCode}) ` : ''}</span>
                                    {user.email}
                                </Td>
                                <Td>{user.status === 1 ? <span className='text-green-600'>Active</span> : <span className='text-red-600'>Inactive</span>}</Td>
                                <Td>
                                    <Button
                                        variant='twoTone'
                                        size='xs'
                                        icon={<MdOutlineModeEdit />}
                                        onClick={() => {
                                            setShowUserDialog(true)
                                            setEditDialogType('user')
                                            setEditData(user)
                                        }}
                                    />
                                    <Button
                                        variant='twoTone'
                                        size='xs'
                                        color='red'
                                        className='ml-2'
                                        icon={<MdOutlineDeleteOutline />}
                                        onClick={() => setDeleteDialog({ type: user?.vendorCode ? 'vendor' : 'user', data: user })}
                                    />
                                </Td>
                            </Tr>
                        ))
                    )}
                </TBody>
            </Table>

            <div className='flex justify-between items-center'>
                <h4 className='mt-4'>Roles</h4>
                <Button
                    variant='twoTone'
                    size='sm'
                    icon={<IoIosAdd />}
                    onClick={() => {
                        setShowRoleDialog(true)
                        setEditDialogType(null)
                        setEditData(null)
                    }}>
                    Add Role
                </Button>
            </div>

            <Table compact className='text-xs relative' containerClassName='max-h-[80vh] overflow-auto relative my-2'>
                <THead className='sticky top-0'>
                    <Tr>
                        <Td className='p-2'>#</Td>
                        <Td className='p-2'>Role</Td>
                        <Td className='p-2'>Permissions</Td>
                        <Td className='p-2'>Status</Td>
                        <Td className='p-2'></Td>
                    </Tr>
                </THead>
                <TBody>
                    {loading ? (
                        <Tr>
                            <Td colSpan={5}>
                                <Spinner size={20} className='mx-auto' />
                            </Td>
                        </Tr>
                    ) : roles.length === 0 ? (
                        <Tr>
                            <Td colSpan={5}>No roles found.</Td>
                        </Tr>
                    ) : (
                        roles.map((role, idx) => (
                            <Tr key={role._id}>
                                <Td>{idx + 1}</Td>
                                <Td>{role.name}</Td>
                                <Td className='font-mono'>{role.permissions && role.permissions.length > 0 ? role.permissions.join(', ') : '-'}</Td>
                                <Td>{role.status === 1 ? <span className='text-green-600'>Active</span> : <span className='text-red-600'>Inactive</span>}</Td>
                                <Td>
                                    <Button
                                        variant='twoTone'
                                        size='xs'
                                        icon={<MdOutlineModeEdit />}
                                        onClick={() => {
                                            setShowRoleDialog(true)
                                            setEditDialogType('role')
                                            setEditData(role)
                                        }}
                                    />
                                    <Button
                                        variant='twoTone'
                                        size='xs'
                                        color='red'
                                        className='ml-2'
                                        icon={<MdOutlineDeleteOutline />}
                                        onClick={() => setDeleteDialog({ type: 'role', data: role })}
                                    />
                                </Td>
                            </Tr>
                        ))
                    )}
                </TBody>
            </Table>

            <AddUserDialog
                open={showUserDialog}
                roles={roles}
                initialValues={editDialogType === 'user' && editData ? (editData as UserType) : initialUserValues}
                loading={actionLoading}
                onClose={() => {
                    setShowUserDialog(false)
                    setEditDialogType(null)
                    setEditData(null)
                }}
                onSubmit={handleAddEditUser}
            />

            <AddRoleDialog
                open={showRoleDialog}
                initialValues={
                    editDialogType === 'role' && editData
                        ? {
                              name: (editData as RoleType).name,
                              permissions: (editData as RoleType).permissions || [],
                              status: (editData as RoleType).status,
                          }
                        : initialRoleValues
                }
                loading={actionLoading}
                onClose={() => {
                    setShowRoleDialog(false)
                    setEditDialogType(null)
                    setEditData(null)
                }}
                onSubmit={handleAddEditRole}
            />

            <ConfirmDeleteDialog
                open={!!deleteDialog}
                type={deleteDialog?.type}
                name={deleteDialog?.type === 'user' ? (deleteDialog?.data as UserType)?.name : (deleteDialog?.data as RoleType)?.name}
                loading={actionLoading}
                onClose={() => setDeleteDialog(null)}
                onConfirm={handleDelete}
            />
        </div>
    )
}

const initialUserValues: UserType = {
    name: '',
    username: '',
    password: '',
    email: '',
    role: '',
    status: 1,

    company: {
        name: '',
        industry: '',
        gstin: '',
        pan: '',
        phone: '',
        website: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pincode: '',
    },
}

type UserDialogProps = {
    open: boolean
    onClose: () => void
    onSubmit: (values: UserType, helpers: FormikHelpers<UserType>) => Promise<void>
    roles: RoleType[]
    initialValues: UserType
    loading?: boolean
}

const AddUserDialog: React.FC<UserDialogProps> = ({ open, onClose, onSubmit, roles, initialValues, loading }) => (
    <Dialog isOpen={open} onClose={onClose} width={900}>
        <div className='flex max-h-[85vh] flex-col'>
            {/* Header */}
            <div className='mb-4'>
                <h6 className='text-xl font-semibold'>
                    {initialValues._id ? 'Edit' : 'Add'} {initialValues.vendorCode ? 'Vendor' : 'User'}
                </h6>
            </div>

            <Formik enableReinitialize initialValues={initialValues} onSubmit={onSubmit}>
                {({ values, setFieldValue }) => (
                    <Form className='min-h-0 flex flex-col'>
                        {/* Scrollable content */}
                        <div className='flex-1 min-h-0 overflow-y-auto pr-1'>
                            <FormContainer>
                                {/* Basic fields */}
                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                                    <FormItem asterisk label='Name' labelClass='text-xs !mb-1' className='mb-2.5'>
                                        <Field
                                            name='name'
                                            as={Input}
                                            size='sm'
                                            value={values.name}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFieldValue('name', e.target.value)}
                                        />
                                    </FormItem>

                                    <FormItem
                                        asterisk
                                        label={`Username${initialValues?.vendorCode ? ' / Vendor Code' : ''}`}
                                        labelClass='text-xs !mb-1'
                                        className='mb-2.5'>
                                        <Field
                                            disabled={initialValues?.vendorCode}
                                            name='username'
                                            as={Input}
                                            size='sm'
                                            value={values.username}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFieldValue('username', e.target.value)}
                                        />
                                    </FormItem>
                                </div>

                                {!values._id && (
                                    <FormItem asterisk label='Password' labelClass='text-xs !mb-1' className='mb-2.5'>
                                        <Field
                                            name='password'
                                            type='password'
                                            as={Input}
                                            size='sm'
                                            value={(values as any).password}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFieldValue('password', e.target.value)}
                                        />
                                    </FormItem>
                                )}

                                <FormItem asterisk label={`${initialValues?.vendorCode ? 'Vendor ' : ''}Email`} labelClass='text-xs !mb-1' className='mb-2.5'>
                                    <Field
                                        name='email'
                                        type='email'
                                        as={Input}
                                        size='sm'
                                        value={values.email}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFieldValue('email', e.target.value)}
                                    />
                                </FormItem>

                                {!initialValues.vendorCode && (
                                    <>
                                        {/* Role + Status */}
                                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                                            <FormItem asterisk label='Role' labelClass='text-xs !mb-1' className='mb-2.5'>
                                                <Select
                                                    getOptionLabel={(o) => o.name}
                                                    getOptionValue={(o) => o._id || ''}
                                                    placeholder='Select Role'
                                                    size='sm'
                                                    options={roles}
                                                    value={roles.find((i) => i._id === values.role)}
                                                    onChange={(val) => setFieldValue('role', val?._id)}
                                                />
                                            </FormItem>

                                            <FormItem label='Status' labelClass='text-xs !mb-1' className='mb-2.5'>
                                                <Select
                                                    size='sm'
                                                    value={statusOptions.find((i) => i.value === values.status)}
                                                    options={statusOptions}
                                                    onChange={(val) => setFieldValue('status', val?.value)}
                                                />
                                            </FormItem>
                                        </div>

                                        {/* Signature */}
                                        {values.role && roles.find((i) => i._id === values.role)?.permissions.includes(PERMISSIONS.AUTHORIZE_PO) && (
                                            <FormItem asterisk label='Signature File' labelClass='text-xs !mb-1' className='mb-2.5'>
                                                <label>
                                                    <input
                                                        type='file'
                                                        hidden
                                                        accept='image/*'
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFieldValue('digitalSignature', e.target.files?.[0])}
                                                    />
                                                    <Input
                                                        size='sm'
                                                        prefix={<MdOutlineImage size={18} />}
                                                        type='text'
                                                        className='pointer-events-none'
                                                        value={
                                                            (typeof (values as any).digitalSignature === 'object'
                                                                ? (values as any).digitalSignature?.name
                                                                : (values as any).digitalSignature) || 'No file selected'
                                                        }
                                                    />
                                                </label>
                                            </FormItem>
                                        )}

                                        {/* Company Details */}
                                        <div className='mt-2 rounded-xl border border-gray-200 dark:border-gray-700 p-4'>
                                            <div className='text-sm font-bold text-gray-900 dark:text-gray-100 mb-3'>Company Details</div>

                                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                                                <FormItem asterisk label='Company Name' labelClass='text-xs !mb-1' className='mb-0'>
                                                    <Input
                                                        size='sm'
                                                        value={(values as any)?.company?.name || ''}
                                                        onChange={(e) => setFieldValue('company.name', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem label='Industry' labelClass='text-xs !mb-1' className='mb-0'>
                                                    <Input
                                                        size='sm'
                                                        value={(values as any)?.company?.industry || ''}
                                                        onChange={(e) => setFieldValue('company.industry', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem label='GSTIN' labelClass='text-xs !mb-1' className='mb-0'>
                                                    <Input
                                                        size='sm'
                                                        value={(values as any)?.company?.gstin || ''}
                                                        onChange={(e) => setFieldValue('company.gstin', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem label='PAN' labelClass='text-xs !mb-1' className='mb-0'>
                                                    <Input
                                                        size='sm'
                                                        value={(values as any)?.company?.pan || ''}
                                                        onChange={(e) => setFieldValue('company.pan', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem label='Phone' labelClass='text-xs !mb-1' className='mb-0'>
                                                    <Input
                                                        size='sm'
                                                        value={(values as any)?.company?.phone || ''}
                                                        onChange={(e) => setFieldValue('company.phone', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem label='Website' labelClass='text-xs !mb-1' className='mb-0'>
                                                    <Input
                                                        size='sm'
                                                        value={(values as any)?.company?.website || ''}
                                                        onChange={(e) => setFieldValue('company.website', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem label='Address Line 1' labelClass='text-xs !mb-1' className='mb-0 sm:col-span-2'>
                                                    <Input
                                                        size='sm'
                                                        value={(values as any)?.company?.addressLine1 || ''}
                                                        onChange={(e) => setFieldValue('company.addressLine1', e.target.value)}
                                                    />
                                                </FormItem>

                                                <FormItem label='Address Line 2' labelClass='text-xs !mb-1' className='mb-0 sm:col-span-2'>
                                                    <Input
                                                        size='sm'
                                                        value={(values as any)?.company?.addressLine2 || ''}
                                                        onChange={(e) => setFieldValue('company.addressLine2', e.target.value)}
                                                    />
                                                </FormItem>

                                                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 sm:col-span-2'>
                                                    <FormItem label='City' labelClass='text-xs !mb-1' className='mb-0'>
                                                        <Input
                                                            size='sm'
                                                            value={(values as any)?.company?.city || ''}
                                                            onChange={(e) => setFieldValue('company.city', e.target.value)}
                                                        />
                                                    </FormItem>

                                                    <FormItem label='State' labelClass='text-xs !mb-1' className='mb-0'>
                                                        <Input
                                                            size='sm'
                                                            value={(values as any)?.company?.state || ''}
                                                            onChange={(e) => setFieldValue('company.state', e.target.value)}
                                                        />
                                                    </FormItem>

                                                    <FormItem label='Pincode' labelClass='text-xs !mb-1' className='mb-0'>
                                                        <Input
                                                            size='sm'
                                                            value={(values as any)?.company?.pincode || ''}
                                                            onChange={(e) => setFieldValue('company.pincode', e.target.value)}
                                                        />
                                                    </FormItem>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </FormContainer>
                        </div>

                        {/* Sticky footer */}
                        <div className='sticky bottom-0 mt-3 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur pt-3'>
                            <div className='flex flex-col sm:flex-row justify-end gap-2'>
                                <Button type='button' size='sm' variant='plain' disabled={loading} onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button type='submit' size='sm' variant='solid' disabled={loading}>
                                    {loading ? <Spinner size={16} /> : 'Save'}
                                </Button>
                            </div>
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    </Dialog>
)

const initialRoleValues: RoleFormValues = {
    name: '',
    permissions: [],
    status: 1,
}

type RoleDialogProps = {
    open: boolean
    onClose: () => void
    onSubmit: (values: RoleFormValues, helpers: FormikHelpers<RoleFormValues>) => Promise<void>
    initialValues: RoleFormValues
    loading?: boolean
}

const statusOptions = [
    { label: 'Active', value: 1 },
    { label: 'Inactive', value: 0 },
]

const AddRoleDialog: React.FC<RoleDialogProps> = ({ open, onClose, onSubmit, initialValues, loading }) => (
    <Dialog isOpen={open} onClose={onClose}>
        <h6 className='mb-4 text-xl'>{initialValues && initialValues.name ? 'Edit Role' : 'Add Role'}</h6>
        <Formik enableReinitialize initialValues={initialValues} onSubmit={onSubmit}>
            {({ values, setFieldValue }) => (
                <Form>
                    <FormContainer>
                        <div>
                            <FormItem label='Role Name' labelClass='text-xs !mb-1' className='mb-2.5'>
                                <Field
                                    name='name'
                                    as={Input}
                                    size='sm'
                                    value={values.name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFieldValue('name', e.target.value)}
                                />
                            </FormItem>

                            <FormItem label='Permissions' labelClass='text-xs !mb-1' className='mb-2.5 !max-h-auto !h-auto'>
                                <Select
                                    isMulti
                                    closeMenuOnSelect={false}
                                    value={permissionsOptions.filter((i) => values.permissions?.includes(i.value))}
                                    options={permissionsOptions}
                                    styles={{ control: (base) => ({ ...base, minHeight: 'auto', height: 'auto' }) }}
                                    placeholder='Select Permissions'
                                    className='!h-auto !max-h-auto min-h-auto'
                                    size='sm'
                                    onChange={(valArr) => setFieldValue('permissions', valArr?.map((v) => v.value) || [])}
                                />
                            </FormItem>

                            <FormItem label='Status' labelClass='text-xs !mb-1' className='mb-2.5'>
                                <Select
                                    size='sm'
                                    value={statusOptions.find((i) => i.value === values.status)}
                                    options={statusOptions}
                                    onChange={(val) => setFieldValue('status', val?.value)}
                                />
                            </FormItem>
                        </div>

                        <div className='flex justify-end gap-2 mt-4'>
                            <Button type='button' variant='plain' disabled={loading} onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type='submit' variant='solid' disabled={loading}>
                                {loading ? <Spinner size={16} /> : 'Save'}
                            </Button>
                        </div>
                    </FormContainer>
                </Form>
            )}
        </Formik>
    </Dialog>
)

type ConfirmDeleteDialogProps = {
    open: boolean
    type?: EditDialogType
    name?: string
    onClose: () => void
    onConfirm: () => void
    loading?: boolean
}

const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({ open, type, name, onClose, onConfirm, loading }) => (
    <Dialog isOpen={open} onClose={onClose}>
        <h6 className='mb-4 text-xl'>Confirm Delete</h6>
        <div className='mb-4'>
            Are you sure you want to delete {type} <b>{name}</b>?
        </div>
        <div className='flex justify-end gap-2'>
            <Button type='button' variant='plain' disabled={loading} onClick={onClose}>
                Cancel
            </Button>
            <Button type='button' variant='solid' color='red' disabled={loading} onClick={onConfirm}>
                {loading ? <Spinner size={16} /> : 'Delete'}
            </Button>
        </div>
    </Dialog>
)
