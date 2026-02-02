// import Dropdown, { DropdownItemProps } from '@/components/ui/Dropdown'
// import Button from '@/components/ui/Button'
// import { IoSync } from 'react-icons/io5'
// import { IoIosArrowDown } from 'react-icons/io'
// import { Spinner, Tooltip } from '../ui'
// import { useState } from 'react'
// import { showAlert, showError } from '@/utils/hoc/showAlert'
// import ApiService from '@/services/ApiService'
// import { AiOutlineInfoCircle } from 'react-icons/ai'

// const options: { label?: string; info?: string; url?: string; variant?: DropdownItemProps['variant'] }[] = [
//     {
//         label: 'Import Indents',
//         info: 'Import indent records from SAP and store them in the system database, followed by a quantity synchronization.',
//         url: '/indent/import',
//     },
//     {
//         label: 'Import Vendors',
//         info: 'Import vendor records from SAP and store them in the system database.',
//         url: '/vendor/import',
//     },
//     {
//         variant: 'divider',
//     },
//     {
//         label: 'Sync Indents Qty',
//         info: 'Synchronize indent quantities with their associated RFQs and purchase orders.',
//         url: '/indent/sync',
//     },
//     // {
//     //     label: 'Sync CS Status',
//     //     info: 'Update CS records to align their quantities and statuses with the corresponding purchase orders.',
//     //     url: '/cs/sync',
//     // },
// ]

// const SyncControl = () => {
//     const [loading, setLoading] = useState(false)
//     const handleSelect = async (eventIndex: number) => {
//         setLoading(true)
//         try {
//             const response = await ApiService.fetchData<{ success: boolean }>({
//                 method: 'get',
//                 url: options[eventIndex].url,
//             })
//             if (response.data.success) showAlert(`Request to ${options[eventIndex].label} succeeded.`)
//         } catch (error) {
//             const message = `Failed to ${options[eventIndex].label}. Please contact support.`
//             showError(error?.response?.status === 500 ? message : error?.response?.data?.message || message)
//         }
//         setLoading(false)
//     }

//     return (
//         <Dropdown
//             disabled={loading}
//             renderTitle={
//                 <Button size='xs' variant='plain' className='h-full' icon={loading ? <Spinner /> : <IoSync className='size-6' />}>
//                     <IoIosArrowDown />
//                 </Button>
//             }
//             onSelect={(eventKey) => handleSelect(+eventKey)}>
//             {options.map((i, idx) => (
//                 <Dropdown.Item key={idx} eventKey={idx.toString()} variant={i.variant || 'default'} className='flex justify-between'>
//                     {i.label}
//                     {i.info && (
//                         <Tooltip title={i.info}>
//                             <AiOutlineInfoCircle />
//                         </Tooltip>
//                     )}
//                 </Dropdown.Item>
//             ))}
//         </Dropdown>
//     )
// }

// export default SyncControl
