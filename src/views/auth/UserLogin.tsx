import { Dialog, Spinner } from '@/components/ui'
import { showAlert } from '@/utils/hoc/showAlert'
import useAuth from '@/utils/hooks/useAuth'
import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'

export default function UserLogin() {
    const { id } = useParams()
    const { signIn } = useAuth()

    useEffect(() => {
        if (!id) return
        ;(async () => {
            try {
                await signIn({ id })
                showAlert('Logged in successfully')
            } catch (error) {
                console.error('Error fetching vendor data:', error)
            }
        })()
    }, [id, signIn])

    return (
        <Dialog isOpen={true} closable={false} className={'fixed !left-[50vw] !top-[50vh] z-50 -translate-1/2'}>
            <div className='flex items-center gap-3'>
                <Spinner className='!size-6' />
                <span>Please wait, you are being logged into your account.</span>
            </div>
        </Dialog>
    )
}
