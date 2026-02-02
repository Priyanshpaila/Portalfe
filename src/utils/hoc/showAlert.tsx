import { Alert, toast } from '@/components/ui'
import { ReactNode } from 'react'
import { IoCheckmarkDoneCircleSharp, IoClose, IoInformationCircle } from 'react-icons/io5'
import { MdOutlineError } from 'react-icons/md'

export const showAlert = (message: string | ReactNode) => {
    toast.push(
        <Alert
            showIcon
            closable
            type='success'
            className='mb-4 bg-green-500 !text-white'
            duration={3000}
            customIcon={<IoCheckmarkDoneCircleSharp className='!text-white' />}
            customClose={<IoClose className='size-5' />}>
            <span className='pr-2'>{message}</span>
        </Alert>,
        {
            placement: 'bottom-center',
        },
    )
}

export const showWarning = (message: string | ReactNode) => {
    toast.push(
        <Alert
            showIcon
            closable
            type='warning'
            className='mb-4 !bg-orange-400 !text-white'
            duration={3000}
            customIcon={<IoInformationCircle className='!text-white' />}
            customClose={<IoClose className='size-5' />}>
            <span className='pr-2'>{message}</span>
        </Alert>,
        {
            placement: 'bottom-center',
        },
    )
}

export const showError = (message: string | ReactNode) => {
    toast.push(
        <Alert
            showIcon
            closable
            type='danger'
            className='mb-4 bg-red-500 !text-white'
            duration={3000}
            customIcon={<MdOutlineError className='!text-white' />}
            customClose={<IoClose className='size-5' />}>
            <span className='pr-2'>{message}</span>
        </Alert>,
        {
            placement: 'bottom-center',
        },
    )
}
