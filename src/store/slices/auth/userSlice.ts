import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { SLICE_BASE_NAME } from './constants'
import { UserType } from '@/@types/app'

export type UserState = Omit<UserType,  'password' | 'status' | '_id'> & {
    authority?: string[]
    permissions?: string[]
    role?: string
}

const initialState: UserState = {
    name: '',
    username: '',
    vendorCode: '',
    email: '',
    passwordStatus: '',
    authority: [],
}

const userSlice = createSlice({
    name: `${SLICE_BASE_NAME}/user`,
    initialState,
    reducers: {
        setUser(state, action: PayloadAction<UserState>) {
            state.name = action.payload?.name
            state.username = action.payload?.username
            state.role = action.payload?.role
            state.vendorCode = action.payload?.vendorCode
            state.email = action.payload?.email
            state.passwordStatus = action.payload?.passwordStatus
            state.authority = action.payload?.permissions || action.payload?.authority || []
        },
    },
})

export const { setUser } = userSlice.actions
export default userSlice.reducer
