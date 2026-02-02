import { ComparativeStatementComponent } from '@/views/forms/ComparativeStatement'
import { ReactNode, useState } from 'react'
import { Dialog } from '../ui'

const CSModal = ({ csNumber, customButton }: { csNumber: string; customButton?: ({ onClick }: { onClick: () => void }) => ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false)
    const handleOpen = () => setIsOpen(true)
    return (
        <>
            {customButton?.({ onClick: handleOpen }) || (
                <button className='text-xs px-2 py-0.5 bg-blue-100 text-blue-700 font-semibold rounded-md border border-gray-300 ml-2' onClick={handleOpen}>
                    View CS
                </button>
            )}
            <Dialog isOpen={isOpen} width={window.innerWidth * 0.9} onClose={() => setIsOpen(false)} onRequestClose={() => setIsOpen(false)}>
                <div className={'max-h-[78vh] overflow-auto'}>
                    <ComparativeStatementComponent viewOnly csNumber={csNumber} />
                </div>
            </Dialog>
        </>
    )
}

export default CSModal
