import { useState } from 'react'
import SignInForm from './SignInForm'
import VendorRegisterDialog from './VendorRegisterDialog'

const SignIn = () => {
    const [openVendorRegister, setOpenVendorRegister] = useState(false)

    return (
        <>
            <div className=' text-center mb-8'>
                <h3 className='mb-1'>Welcome back!</h3>
                <p>Please enter your credentials to sign in!</p>
            </div>

            <SignInForm disableSubmit={false} />

            {/* ✅ Register as Vendor link */}
            <div className='mt-4 text-center text-sm'>
                <span className='opacity-70'>New here? </span>
                <button
                    type='button'
                    onClick={() => setOpenVendorRegister(true)}
                    className='font-medium text-blue-600 hover:text-blue-700 hover:underline'>
                    Register as vendor
                </button>
            </div>

            {/* ✅ Vendor Register Modal */}
            <VendorRegisterDialog open={openVendorRegister} onClose={() => setOpenVendorRegister(false)} />
        </>
    )
}

export default SignIn
