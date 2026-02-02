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
    const { disableSubmit = false, className } = props

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
                <Alert showIcon className='mb-4' type='danger'>
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
                        <FormContainer>
                            <FormItem label='User Name' invalid={(errors.username && touched.username) as boolean} errorMessage={errors.username}>
                                <Field type='text' autoComplete='off' name='username' placeholder='User Name' component={Input} />
                            </FormItem>
                            <FormItem label='Password' invalid={(errors.password && touched.password) as boolean} errorMessage={errors.password}>
                                <Field autoComplete='off' name='password' placeholder='Password' component={PasswordInput} />
                            </FormItem>
                            <Button block loading={isSubmitting} variant='solid' type='submit'>
                                {isSubmitting ? 'Signing in...' : 'Sign In'}
                            </Button>
                        </FormContainer>
                    </Form>
                )}
            </Formik>
        </div>
    )
}

export default SignInForm
