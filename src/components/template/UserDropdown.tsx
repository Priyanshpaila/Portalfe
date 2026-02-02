import Avatar from '@/components/ui/Avatar'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import useAuth from '@/utils/hooks/useAuth'
import { HiOutlineLogout, HiOutlineUser } from 'react-icons/hi'
import { useState } from 'react'
import { useAppSelector } from '@/store'
import { ConfirmDialog } from '../shared'
import { Button } from '../ui'

const _UserDropdown = () => {
    const user = useAppSelector((state) => state?.auth?.user)
    const [signOutPrompt, setSignOutPrompt] = useState(false)
    const { signOut } = useAuth()

    return (
        <div>
            <div className='flex items-center gap-1 group'>
                <div className='py-2 px-3 flex items-center gap-2 min-w-34'>
                    <Avatar shape='circle' icon={<HiOutlineUser />} />
                    <div>
                        <div className='font-bold text-gray-900 dark:text-gray-100'>{user?.name}</div>
                        <div className='text-xs'>{user?.username}</div>
                    </div>
                </div>
                <div className='self-stretch h-6 w-[1.5px] rounded-xl my-auto bg-gray-300 group-hover:opacity-0' />
                <Button
                    icon={<HiOutlineLogout />}
                    type='button'
                    variant='plain'
                    className='hover:bg-slate-100 hover:shadow-md'
                    onClick={() => setSignOutPrompt(true)}
                />
            </div>

            <ConfirmDialog
                isOpen={signOutPrompt}
                closable={false}
                type='danger'
                title='Sign Out'
                confirmText='Sign out'
                cancelText='Cancel'
                confirmButtonColor='red'
                onCancel={() => setSignOutPrompt(false)}
                onConfirm={signOut}>
                Are you sure you want to sign out? You will be redirected to sign in page.
            </ConfirmDialog>
        </div>
    )
}

const UserDropdown = withHeaderItem(_UserDropdown)

export default UserDropdown
