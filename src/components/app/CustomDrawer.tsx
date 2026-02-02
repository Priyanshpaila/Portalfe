import { Button, Drawer, DrawerProps, Spinner } from '@/components/ui'
import React, { ReactNode, useState } from 'react'
import { ButtonProps } from 'react-scroll/modules/components/Button'

type CustomDrawerProps = Omit<DrawerProps, 'isOpen' | 'footer'> & {
    children: React.ReactNode
    buttonColor?: string
    buttonLabel?: string
    customButton?: (props: Pick<ButtonProps, 'onClick'>) => ReactNode
    footer?: (props: { handleClose: () => void }) => ReactNode
    fetchData?: () => Promise<void>
}

const CustomDrawer = ({
    children,
    buttonColor,
    fetchData,
    buttonLabel = 'View',
    customButton,
    footer,
    ...props
}: CustomDrawerProps) => {
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    const handleOpen = async () => {
        setIsOpen(true)
        if (!fetchData) return
        try {
            setLoading(true)
            await fetchData()
            setLoading(false)
        } catch (error) {
            console.error(error)
        }
    }

    const handleClose = () => setIsOpen(false)

    return (
        <>
            {customButton ? (
                customButton({ onClick: handleOpen })
            ) : (
                <Button
                    size='xs'
                    type="button"
                    variant={'twoTone'}
                    color={buttonColor}
                    onClick={handleOpen}
                >
                    {buttonLabel}
                </Button>
            )}
            <Drawer
                {...props}
                isOpen={isOpen}
                footer={footer ? footer({ handleClose }) : null}
                onClose={handleClose}
                onRequestClose={handleClose}
            >
                {loading ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <Spinner size={'2.5rem'} className="mb-6" />
                    </div>
                ) : (
                    children
                )}
            </Drawer>
        </>
    )
}

export default CustomDrawer
