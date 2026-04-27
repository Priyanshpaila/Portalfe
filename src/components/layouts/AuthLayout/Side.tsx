import { cloneElement, type ReactElement, type ReactNode } from 'react'
import Logo from '@/components/template/Logo'
import { APP_NAME, PARENT_APP_NAME, PARENT_APP_URL } from '@/constants/app.constant'
import type { CommonProps } from '@/@types/common'

interface SideProps extends CommonProps {
    content?: ReactNode
}

const Side = ({ children, content, ...rest }: SideProps) => {
    return (
        <div className='min-h-screen bg-[#eef2f7]'>
            <div className='grid min-h-screen lg:grid-cols-[1fr_1.6fr]'>
                {/* Left visual section */}
                <div className='relative hidden overflow-hidden lg:block'>
                    <div
                        className='absolute inset-0 scale-[1] bg-cover bg-center bg-no-repeat'
                        style={{
                            backgroundImage: `url('/img/others/auth-side-bg.jpg')`,
                        }}
                    />
                    <div className='absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/20 to-slate-950/75' />
                    <div className='absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_28%,transparent_72%,rgba(255,255,255,0.06))]' />

                    <div className='relative z-10 flex h-full flex-col justify-between px-10 py-8 xl:px-14 xl:py-12'>
                        <div className='flex items-center'>
                            <div className='rounded-full backdrop-blur-md'>
                                <Logo mode='dark' />
                            </div>
                        </div>

                        <div className='max-w-xl'>
                            <div className='mb-5 flex items-center gap-2'>
                                <span className='h-2.5 w-12 rounded-full bg-white shadow-sm' />
                                <span className='h-2.5 w-2.5 rounded-full bg-white/70' />
                                <span className='h-2.5 w-2.5 rounded-full bg-white/40' />
                            </div>

                            <h1 className='text-[42px] font-semibold leading-[1.08] tracking-[-0.03em] text-white xl:text-[54px]'>
                                Smarter <span className='text-amber-300'>procurement</span>, built for speed
                            </h1>

                            <p className='mt-5 max-w-lg text-[15px] leading-7 text-white/85 xl:text-base'>
                                PurchaseQ helps teams manage procurement end-to-end from vendor onboarding and RFQ creation to approvals,
                                comparative statements, and purchase order processing with better visibility, tighter control, and faster
                                execution.
                            </p>

                       
                        </div>

                        <div className='flex flex-col gap-2 border-t border-white/10 pt-5 text-sm text-white/85 xl:flex-row xl:items-center xl:justify-between'>
                            <span>
                                Copyright &copy; {new Date().getFullYear()} <span className='font-semibold text-white'>{APP_NAME}</span>
                            </span>

                            <span>
                                Powered by{' '}
                                <a href={PARENT_APP_URL} target='_blank' rel='noreferrer' className='font-semibold text-white hover:underline'>
                                    {PARENT_APP_NAME}
                                </a>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right content section */}
                <div className='relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-6 sm:px-6 lg:px-10'>
                    <div className='absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.05),transparent_24%),linear-gradient(to_bottom,#f8fafc,#eef2f7)]' />
                    <div className='absolute right-[-60px] top-[-60px] h-72 w-72 rounded-full bg-blue-100/60 blur-3xl' />
                    <div className='absolute bottom-[-80px] left-[-50px] h-72 w-72 rounded-full bg-slate-200/70 blur-3xl' />

                    <div className='relative z-10 w-full max-w-[560px]'>
                        <div className='relative overflow-hidden rounded-[32px] border border-white/60 bg-white/90 shadow-[0_25px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl'>
                            <div className='absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/80 to-transparent' />
                            <div className='absolute right-0 top-0 h-32 w-32 rounded-full bg-blue-50 blur-2xl' />

                            <div className='relative z-10 p-6 sm:p-8 md:p-10'>
                                {/* Mobile / tablet logo only */}
                                <div className='mb-6 flex items-center justify-start lg:hidden'>
                                    <Logo mode='light' />
                                </div>

                                {content ? <div className='mb-8'>{content}</div> : null}

                                <div className='w-full'>
                                    {children
                                        ? cloneElement(children as ReactElement, {
                                              ...rest,
                                          })
                                        : null}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Side