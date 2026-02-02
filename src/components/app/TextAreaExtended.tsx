import React from 'react'
import { Button, Dialog, Input, InputProps } from '../ui'
import classNames from 'classnames'
import { MdEdit } from 'react-icons/md'

type TextAreaExtendedProps = InputProps & {
    isEditable?: boolean
    showButton?: boolean
    name?: string
    title?: string
    content?: string
    setContent?: (content: string) => void
    component?: ({ isExtended }: { isExtended: boolean }) => React.ReactNode
}

export default function TextAreaExtended({ title = 'Content', content, setContent, isEditable, component, showButton, ...props }: TextAreaExtendedProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    return (
        <>
            {showButton ? (
                <Button
                    type='button'
                    size='xs'
                    variant='plain'
                    className='p-0 h-fit flex justify-center w-full'
                    icon={<MdEdit />}
                    onClick={() => setIsOpen(true)}
                />
            ) : (
                <button
                    type='button'
                    tabIndex={0}
                    className={classNames(isEditable || content ? 'cursor-pointer' : null, 'focus:outline-gray-200 rounded-xl')}
                    onClick={() => setIsOpen(true)}>
                    {component ? (
                        component({ isExtended: false })
                    ) : (
                        <span className={classNames(isEditable ? 'w-30' : null, 'block max-w-30 h-4 text-ellipsis !line-clamp-1')}>
                            {content || (isEditable ? <small className='opacity-60'>Click here...</small> : null)}
                        </span>
                    )}
                </button>
            )}
            <Dialog isOpen={Boolean(isOpen && (isEditable || content))} onClose={() => setIsOpen(false)} onRequestClose={() => setIsOpen(false)}>
                <h6 className='text-lg font-semibold mb-3'>{title}</h6>
                {isEditable ? (
                    component ? (
                        component({ isExtended: true })
                    ) : (
                        <Input
                            className='px-[5px]'
                            {...props}
                            autoFocus
                            textArea
                            value={props.value || content}
                            onChange={props.onChange || ((e) => setContent?.(e.target.value as string))}
                        />
                    )
                ) : (
                    <p>{content}</p>
                )}
            </Dialog>
        </>
    )
}
