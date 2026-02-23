// src/services/user.api.ts
import ApiService from '@/services/ApiService'
import { USER_ROUTES } from './user.routes'

/* ---------------- Types (lightweight / safe) ---------------- */

export type FirmEmployee = {
  _id?: string
  name?: string
  username?: string
  email?: string
  role?: any
  status?: number
  createdAt?: string
  passwordStatus?: 'temporary' | 'permanent'
}

export type GetFirmEmployeesResponse = {
  ok?: boolean
  firmId?: string
  employees?: FirmEmployee[]
}

export type CreateFirmEmployeePayload = {
  username: string
  password: string
  name: string
  email?: string
  role?: string | null
}

export type CreateFirmEmployeeResponse = {
  ok?: boolean
  employee?: FirmEmployee
  message?: string
}

export type ResetPasswordResponse = { message?: string }
export type ConnectionsResponse = any
export type DirectoryResponse = any

function buildQuery(params?: Record<string, any>) {
  if (!params) return ''
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    sp.set(k, String(v))
  })
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

export const UserApi = {
  /* ---------------- Profile ---------------- */

  getProfile() {
    return ApiService.fetchData({ url: USER_ROUTES.PROFILE_GET, method: 'get' })
  },

  

  patchProfile(payload: any) {
    return ApiService.fetchData({ url: USER_ROUTES.PROFILE_PATCH, method: 'patch', data: payload })
  },

  changePassword(currentPassword: string, newPassword: string) {
    return ApiService.fetchData({
      url: USER_ROUTES.PROFILE_CHANGE_PASSWORD,
      method: 'post',
      data: { currentPassword, newPassword },
    })
  },

  uploadDigitalSignature(file: File) {
    const fd = new FormData()
    fd.append('digitalSignature', file)

    return ApiService.fetchData({
      url: USER_ROUTES.PROFILE_DIGITAL_SIGNATURE,
      method: 'post',
      data: fd,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

    getDirectory(params?: { search?: string; discover?: boolean }) {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', String(params.search))
    if (params?.discover) qs.set('discover', '1')
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    return ApiService.fetchData({
      url: `${USER_ROUTES.DIRECTORY_GET}${suffix}`,
      method: 'get',
    })
  },

  /* ---------------- Existing ---------------- */

  getMe() {
    return ApiService.fetchData({ url: USER_ROUTES.ME_GET, method: 'get' })
  },

  resetPassword(password: string) {
    return ApiService.fetchData<ResetPasswordResponse>({
      url: USER_ROUTES.RESET_PASSWORD,
      method: 'post',
      data: { password },
    })
  },

  /* ---------------- Firm seat users ---------------- */

  getFirmEmployees() {
    return ApiService.fetchData<GetFirmEmployeesResponse>({
      url: USER_ROUTES.FIRM_EMPLOYEES_GET,
      method: 'get',
    })
  },

  createFirmEmployee(payload: CreateFirmEmployeePayload) {
    return ApiService.fetchData<CreateFirmEmployeeResponse>({
      url: USER_ROUTES.FIRM_EMPLOYEES_POST,
      method: 'post',
      data: payload,
    })
  },

  /* ---------------- Connections ---------------- */

  getConnections() {
    return ApiService.fetchData<ConnectionsResponse>({
      url: USER_ROUTES.CONNECTIONS_GET,
      method: 'get',
    })
  },

  requestConnection(payload: any) {
    return ApiService.fetchData({
      url: USER_ROUTES.CONNECTION_REQUEST,
      method: 'post',
      data: payload,
    })
  },

  respondConnection(payload: { targetUserId: string; action: 'accept' | 'decline' | 'block' }) {
    return ApiService.fetchData({
      url: USER_ROUTES.CONNECTION_RESPOND,
      method: 'post',
      data: payload,
    })
  },

  removeConnection(payload: { targetUserId: string }) {
    return ApiService.fetchData({
      url: USER_ROUTES.CONNECTION_REMOVE,
      method: 'post',
      data: payload,
    })
  },


}