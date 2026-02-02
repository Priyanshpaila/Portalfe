import { lazy } from 'react'
import authRoute from './authRoute'
import type { Routes } from '@/@types/routes'
import { PERMISSIONS } from '@/utils/permissions'

export const publicRoutes: Routes = [
    ...authRoute,
    {
        key: 'user.login',
        path: '/login/:id',
        component: lazy(() => import('@/views/auth/UserLogin')),
        authority: [],
    },
]

export const protectedRoutes = [
    {
        key: 'dashboard',
        path: '/dashboard',
        component: lazy(() => import('@/views/dashboard')),
        authority: [],
    },
    {
        key: 'forms.rfq',
        path: '/rfq',
        component: lazy(() => import('@/views/forms/RFQ')),
        authority: [PERMISSIONS.MANAGE_RFQ],
    },
    {
        key: 'forms.quotation',
        path: '/quotation',
        component: lazy(() => import('@/views/forms/Quotation')),
        authority: [PERMISSIONS.VENDOR_ACCESS],
    },
    {
        key: 'forms.comparative_statement',
        path: '/comparative-statement',
        component: lazy(() => import('@/views/forms/ComparativeStatement')),
        authority: [PERMISSIONS.MANAGE_CS],
    },
    {
        key: 'forms.purchase-order',
        path: '/purchase-order',
        component: lazy(() => import('@/views/forms/PurchaseOrder')),
        authority: [PERMISSIONS.MANAGE_PO],
    },

    {
        key: 'reports.rfqs',
        path: '/rfqs',
        component: lazy(() => import('@/views/reports/RFQs')),
        authority: [PERMISSIONS.MANAGE_RFQ, PERMISSIONS.VENDOR_ACCESS],
    },
    {
        key: 'reports.quotations',
        path: '/quotations',
        component: lazy(() => import('@/views/reports/Quotations')),
        authority: [PERMISSIONS.VIEW_QUOTATION, PERMISSIONS.VENDOR_ACCESS],
    },
    {
        key: 'reports.comparative_statements',
        path: '/comparative-statements',
        component: lazy(() => import('@/views/reports/ComparativeStatements')),
        authority: [PERMISSIONS.MANAGE_CS],
    },
    {
        key: 'reports.purchase-orders',
        path: '/purchase-orders',
        component: lazy(() => import('@/views/reports/PurchaseOrders')),
        authority: [PERMISSIONS.MANAGE_PO, PERMISSIONS.VENDOR_ACCESS],
    },
    // {
    //     key: 'reports.advance-payments',
    //     path: '/advance-payments',
    //     component: lazy(() => import('@/views/reports/AdvancePayments')),
    //     authority: [PERMISSIONS.VIEW_INDENT_REGISTER],
    // },
    {
        key: 'reports.indent-register',
        path: '/indent-register',
        component: lazy(() => import('@/views/reports/IndentRegister')),
        authority: [PERMISSIONS.VIEW_INDENT_REGISTER],
    },

    {
        key: 'security.access-control',
        path: '/access-control',
        component: lazy(() => import('@/views/security/AccessControl')),
        authority: [PERMISSIONS.ACCESS_CONTROL],
    },
        {
        key: 'security.master-control',
        path: '/master-control',
        component: lazy(() => import('@/views/security/MasterControl')),
        authority: [PERMISSIONS.MASTER_CONTROL],
    },
        {
        key: 'security.approve-vendor',
        path: '/approve-vendor',
        component: lazy(() => import('@/views/security/ApproveVendor')),
        authority: [PERMISSIONS.APPROVE_VENDOR],
    },


    {
        key: 'page.po-authorize',
        path: '/po-authorize',
        component: lazy(() => import('@/views/auth/POAuthorize')),
        authority: [PERMISSIONS.AUTHORIZE_PO],
    },
]
