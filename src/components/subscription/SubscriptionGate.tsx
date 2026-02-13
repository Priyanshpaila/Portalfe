import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import BillingService from '@/services/BillingService'
import SubscribeView from './SubscribeView'

type Props = { children: React.ReactNode }

const BYPASS_PATHS = ['/sign-in', '/login', '/auth'] // adjust to your routes

export default function SubscriptionGate({ children }: Props) {
    const location = useLocation()
    const [checking, setChecking] = useState(true)
    const [active, setActive] = useState<boolean>(true)

    const shouldBypass = BYPASS_PATHS.some((p) => location.pathname.startsWith(p))

    const refresh = async () => {
        try {
            setChecking(true)
            const res = await BillingService.getStatus()
            setActive(Boolean(res.data.active))
        } catch (e) {
            // if billing fails, don’t brick app; but be strict if you want:
            setActive(true)
        } finally {
            setChecking(false)
        }
    }

    useEffect(() => {
        if (shouldBypass) {
            setChecking(false)
            setActive(true)
            return
        }
        refresh()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname])

    // listen to 402 event from axios interceptor
    useEffect(() => {
        const onRequired = () => {
            setActive(false)
        }
        window.addEventListener('subscription-required', onRequired as any)
        return () => window.removeEventListener('subscription-required', onRequired as any)
    }, [])

    if (shouldBypass) return <>{children}</>

    if (checking) return <div className="p-6">Checking subscription...</div>

    if (!active) {
        return <SubscribeView onSuccess={refresh} />
    }

    return <>{children}</>
}