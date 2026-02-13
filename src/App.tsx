import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { PersistGate } from 'redux-persist/integration/react'
import store, { persistor } from './store'
import Theme from '@/components/template/Theme'
import Layout from '@/components/layouts'
import mockServer from './mock'
import appConfig from '@/configs/app.config'
import './locales'

// ✅ add this
import SubscriptionGate from '@/components/subscription/SubscriptionGate'

const environment = process.env.NODE_ENV

if (environment !== 'production' && appConfig.enableMock) {
    mockServer({ environment })
}

function App() {
    return (
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <BrowserRouter>
                    <Theme>
                        {/* ✅ login -> subscription layer -> main app */}
                        <SubscriptionGate>
                            <Layout />
                        </SubscriptionGate>
                    </Theme>
                </BrowserRouter>
            </PersistGate>
        </Provider>
    )
}

export default App