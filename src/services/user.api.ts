// src/services/user.api.ts
import ApiService from '@/services/ApiService'
import { USER_ROUTES } from './user.routes'

export const UserApi = {
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
      // only set this if your ApiService doesn’t auto-handle FormData
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}