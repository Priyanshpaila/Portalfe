import { forwardRef } from 'react'
import classNames from 'classnames'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from './context'
import { useConfig } from '../ConfigProvider'
import { CONTROL_SIZES, LAYOUT } from '../utils/constants'
import type { CommonProps, TypeAttributes } from '../@types/common'
import type { ReactNode } from 'react'

export interface FormItemProps extends CommonProps {
    asterisk?: boolean
    errorMessage?: string
    extra?: string | ReactNode
    htmlFor?: string
    invalid?: boolean | ''
    label?: string
    labelClass?: string
    componentContainerClass?: string
    labelWidth?: string | number
    layout?: TypeAttributes.FormLayout
    size?: TypeAttributes.ControlSize
}

const FormItem = forwardRef<HTMLDivElement, FormItemProps>((props, ref) => {
    const {
        asterisk,
        children,
        className,
        errorMessage,
        extra,
        htmlFor,
        invalid,
        label,
        labelClass,
        labelWidth,
        componentContainerClass,
        layout,
        style,
        size,
    } = props
    const isInvalid = invalid || errorMessage

    const formContext = useForm()
    const { controlSize } = useConfig()

    const formItemLabelHeight = size || formContext?.size || controlSize
    const formItemLabelWidth = labelWidth || formContext?.labelWidth
    const formItemLayout = layout || formContext?.layout

    const getFormLabelLayoutClass = () => {
        switch (formItemLayout) {
            case LAYOUT.HORIZONTAL:
                return label ? `h-${CONTROL_SIZES[formItemLabelHeight]} ${label && 'ltr:pr-2 rtl:pl-2'}` : 'ltr:pr-2 rtl:pl-2'
            case LAYOUT.VERTICAL:
                return `mb-1`
            case LAYOUT.INLINE:
                return `h-${CONTROL_SIZES[formItemLabelHeight]} ${label && 'ltr:pr-2 rtl:pl-2'}`
            default:
                break
        }
    }

    const formItemClass = classNames('form-item', formItemLayout, className, isInvalid ? 'invalid' : '')

    const formLabelClass = classNames('form-label', label && getFormLabelLayoutClass(), labelClass)

    const formLabelStyle = () => {
        if (formItemLayout === LAYOUT.HORIZONTAL) {
            return { ...style, ...{ minWidth: formItemLabelWidth } }
        }

        return { ...style }
    }

    const enterStyle = { opacity: 1, marginTop: 3, bottom: -22 }
    const exitStyle = { opacity: 0, marginTop: -10 }
    const initialStyle = exitStyle

    return (
        <div ref={ref} className={formItemClass}>
            <label htmlFor={htmlFor} className={formLabelClass} style={formLabelStyle()}>
                {asterisk && <span className='text-red-500 ltr:mr-1 rtl:ml-1'>*</span>}
                {label}
                {extra && <span>{extra}</span>}
                {label && formItemLayout !== 'vertical' && ':'}
            </label>
            <div className={classNames(formItemLayout === LAYOUT.HORIZONTAL ? 'w-full flex flex-col justify-center relative' : '', componentContainerClass)}>
                {children}
                <AnimatePresence mode='wait'>
                    {isInvalid && (
                        <motion.div
                            className='form-explain '
                            //  z-30 border border-gray-300 rounded-sm p-1 translate-y-1.5 text-white bg-red-500 w-full text-center text-xs
                            initial={initialStyle}
                            animate={enterStyle}
                            exit={exitStyle}
                            transition={{ duration: 0.15, type: 'tween' }}>
                            {errorMessage}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
})

FormItem.displayName = 'FormItem'

export default FormItem
