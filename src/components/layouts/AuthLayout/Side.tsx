import { cloneElement } from 'react'
import Logo from '@/components/template/Logo'
import { APP_NAME, PARENT_APP_NAME, PARENT_APP_URL } from '@/constants/app.constant'
import type { CommonProps } from '@/@types/common'

interface SideProps extends CommonProps {
    content?: React.ReactNode
}

const Side = ({ children, content, ...rest }: SideProps) => {
    return (
        <div className='grid lg:grid-cols-3 h-full'>
            <div
                className='bg-no-repeat bg-cover py-6 px-16 flex-col justify-between hidden lg:flex'
                style={{
                    backgroundImage: `url('/img/others/auth-side-bg.jpg')`,
                }}>
                <Logo mode='dark' />
                <div>
                    <p className='text-sm text-white opacity-80'>
                        PurchaseQ is a streamlined purchase portal designed to manage procurement end-to-end from vendor onboarding and RFQ creation to
                        approvals, comparative statements, and purchase order processing ensuring faster workflows, transparency, and control.
                    </p>
                </div>
                <div className='flex justify-between'>
                    <span className='text-white'>
                        Copyright &copy; {`${new Date().getFullYear()}`} <span className='font-semibold'>{`${APP_NAME}`}</span>{' '}
                    </span>
                    <span className='text-white'>
                        PoweredBy{' '}
                        <a
                            href={PARENT_APP_URL} 
                            target='_blank'
                            rel='noreferrer'
                            className='font-semibold hover:underline'>
                            {PARENT_APP_NAME}
                        </a>
                    </span>
                </div>
            </div>
            <div className='col-span-2 flex flex-col justify-center items-center bg-white dark:bg-gray-800'>
                <div className='w-full xl:max-w-[450px] px-8 max-w-[380px]'>
                    <div className='mb-8'>{content}</div>
                    {children
                        ? cloneElement(children as React.ReactElement, {
                              ...rest,
                          })
                        : null}
                </div>
            </div>
        </div>
    )
}

export default Side
