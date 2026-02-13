import axios from 'axios'
import appConfig from '@/configs/app.config'
import { TOKEN_TYPE, REQUEST_HEADER_AUTH_KEY } from '@/constants/api.constant'
import { PERSIST_STORE_NAME } from '@/constants/app.constant'
import deepParseJson from '@/utils/deepParseJson'
import store, { signOutSuccess } from '../store'

const unauthorizedCode = [401]

const BaseService = axios.create({
    timeout: 60000,
    baseURL: appConfig.apiPrefix,
})

BaseService.interceptors.request.use(
    (config) => {
        // ensure headers object exists
        config.headers = config.headers || {}

        const rawPersistData = localStorage.getItem(PERSIST_STORE_NAME)
        const persistData = deepParseJson(rawPersistData) || {}

        // this should work for your "admin" persist too if deepParseJson deep-parses strings
        // but keep it safe with optional chaining
        let accessToken = (persistData as any).auth.session.token

        if (!accessToken) {
            const { auth } = store.getState()
            accessToken = auth?.session?.token
        }

        if (accessToken) {
            config.headers[REQUEST_HEADER_AUTH_KEY] = `${TOKEN_TYPE}${accessToken}`
        }

        return config
    },
    (error) => Promise.reject(error),
)

BaseService.interceptors.response.use(
    (response) => response,
    (error) => {
        const { response } = error

        // ✅ subscription expired / required
        if (response?.status === 402 && response?.data?.code === 'SUBSCRIPTION_REQUIRED') {
            // fire a global event that UI can listen to (no redux changes needed)
            window.dispatchEvent(
                new CustomEvent('subscription-required', { detail: response.data }),
            )
        }

        // ✅ auth expired
        if (response && unauthorizedCode.includes(response.status)) {
            store.dispatch(signOutSuccess())
        }

        return Promise.reject(error)
    },
)

export default BaseService