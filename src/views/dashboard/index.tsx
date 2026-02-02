import { useAppSelector } from '@/store'
import React from 'react'
import VendorDashboard from './VendorDashboard'
import UserDashboard from './UserDashboard'
import { PERMISSIONS } from '@/utils/permissions'
import POApproverDashboard from './POApproverDashboard'

export default function Index() {
    const user = useAppSelector((state) => state.auth.user)
    return user?.vendorCode ? (
        <VendorDashboard />
    ) : user?.authority?.includes(PERMISSIONS.AUTHORIZE_PO) && user?.authority?.length === 1 ? (
        <POApproverDashboard />
    ) : (
        <UserDashboard />
    )
}
