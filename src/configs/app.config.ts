export type AppConfig = {
    apiPrefix: string
    authenticatedEntryPath: string
    unAuthenticatedEntryPath: string
    tourPath: string
    locale: string
    enableMock: boolean
}

const appConfig: AppConfig = {
    apiPrefix: window.location.hostname.includes('localhost') ? 'http://192.168.13.74:7849/api' : 'https://purchasebe.yuvaq.com/api',
    authenticatedEntryPath: '/dashboard',
    unAuthenticatedEntryPath: '/sign-in',
    tourPath: '/',
    locale: 'en',
    enableMock: false,
}

export default appConfig
