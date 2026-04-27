import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Alert from '@/components/ui/Alert'
import PasswordInput from '@/components/shared/PasswordInput'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import useAuth from '@/utils/hooks/useAuth'
import { Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import type { CommonProps } from '@/@types/common'

interface SignInFormProps extends CommonProps {
    disableSubmit?: boolean
    forgotPasswordUrl?: string
    signUpUrl?: string
}

type SignInFormSchema = {
    username: string
    password: string
}

const validationSchema = Yup.object().shape({
    username: Yup.string().required('Please enter your user name'),
    password: Yup.string().required('Please enter your password'),
})

const SignInForm = (props: SignInFormProps) => {
    const { disableSubmit = false, className, forgotPasswordUrl } = props

    const [message, setMessage] = useTimeOutMessage()
    const { signIn } = useAuth()

    const onSignIn = async (values: SignInFormSchema, setSubmitting: (isSubmitting: boolean) => void) => {
        const { username, password } = values
        setSubmitting(true)

        const result = await signIn({ username, password })

        if (result?.status === 'failed') {
            setMessage(result.message)
        }

        setSubmitting(false)
    }

    return (
        <div className={className}>
            {message && (
                <Alert showIcon className='mb-5 rounded-2xl border border-red-200 bg-red-50/90 shadow-sm' type='danger'>
                    <>{message}</>
                </Alert>
            )}

            <Formik
                initialValues={{
                    username: '',
                    password: '',
                }}
                validationSchema={validationSchema}
                onSubmit={(values, { setSubmitting }) => {
                    if (!disableSubmit) {
                        onSignIn(values, setSubmitting)
                    } else {
                        setSubmitting(false)
                    }
                }}>
                {({ touched, errors, isSubmitting }) => (
                    <Form>
                        <FormContainer className='space-y-5'>
                            <FormItem
                                label='User Name'
                                labelClass='!mb-2 text-sm font-semibold text-slate-700'
                                invalid={(errors.username && touched.username) as boolean}
                                errorMessage={errors.username}>
                                <Field
                                    type='text'
                                    autoComplete='off'
                                    name='username'
                                    placeholder='Enter your user name'
                                    component={Input}
                                    
                                />
                            </FormItem>

                            <FormItem
                                label='Password'
                                labelClass='!mb-2 text-sm font-semibold text-slate-700'
                                invalid={(errors.password && touched.password) as boolean}
                                errorMessage={errors.password}>
                                <Field
                                    autoComplete='off'
                                    name='password'
                                    placeholder='Enter your password'
                                    component={PasswordInput}
                                    
                                />
                            </FormItem>



                            <div className='pt-2 mt-10'>
                                <Button
                                    block
                                    loading={isSubmitting}
                                    variant='solid'
                                    type='submit'
                                    className='!h-12 !rounded-2xl !bg-slate-950 text-sm font-semibold shadow-[0_14px_35px_rgba(15,23,42,0.16)] transition-all duration-200 hover:!bg-black'>
                                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                                </Button>
                            </div>
                        </FormContainer>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default SignInForm