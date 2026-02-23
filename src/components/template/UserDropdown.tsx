import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiOutlineCreditCard, HiOutlineExternalLink, HiOutlineLogout, HiOutlineUser, HiOutlineUserGroup } from 'react-icons/hi'

import Avatar from '@/components/ui/Avatar'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import useAuth from '@/utils/hooks/useAuth'
import { useAppSelector } from '@/store'
import { ConfirmDialog } from '../shared'
import { Button } from '../ui'

type AuthUser = {
    name?: string
    username?: string
}

type RootStateLike = {
    auth?: {
        user?: AuthUser
    }
}

const _UserDropdown = () => {
    const user = useAppSelector((state: RootStateLike) => state?.auth?.user)
    const [signOutPrompt, setSignOutPrompt] = useState<boolean>(false)
    const { signOut } = useAuth()
    const navigate = useNavigate()

    return (
        <div>
            <div className='flex items-center gap-1 group'>
                {/* ✅ tappable block */}
                <button
                    type='button'
                    onClick={() => navigate('/profile')}
                    className='py-2 px-3 flex items-center gap-2 min-w-34 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition'
                    title='Open Profile'>
                    <Avatar shape='circle' icon={<HiOutlineUser />} />
                    <div>
                        <div className='font-bold text-gray-900 dark:text-gray-100'>{user?.name || 'User'}</div>
                        <div className='text-xs text-gray-600 dark:text-gray-300'>{user?.username || ''}</div>
                    </div>
                </button>

                <div className='self-stretch h-6 w-[1.5px] rounded-xl my-auto bg-gray-300 group-hover:opacity-0' />

                <Button
                    icon={<HiOutlineCreditCard />}
                    type='button'
                    variant='plain'
                    className='hover:bg-slate-100 hover:shadow-md'
                    onClick={() => navigate('/billing')}
                    title='Billing'
                />

                <Button
                    icon={<HiOutlineUserGroup />}
                    type='button'
                    variant='plain'
                    className='hover:bg-slate-100 hover:shadow-md'
                    onClick={() => navigate('/connection')}
                    title='Connection'
                />

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
