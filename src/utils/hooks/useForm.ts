import { useState, useEffect } from 'react'
import { showAlert, showError } from '@/utils/hoc/showAlert'
import ApiService from '@/services/ApiService'
import { FormikHelpers } from 'formik'
import { AxiosError } from 'axios'

type OptionType = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [x: string]: any
}

type OptionsStateType = { [key: string]: OptionType[] }

type UseFormProps<T> = {
    id: string | undefined
    initialValues: T
    endpoints: { fetch: string; submit: string }
    additionalData?: {
        url: string
        key: string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        customHandler?: (value: any) => OptionType
    }[]
    constantData?: OptionsStateType
    onSuccess?: () => void
}

const useForm = <T>({ id, initialValues, endpoints, additionalData = [], constantData = {}, onSuccess }: UseFormProps<T>) => {
    const [formValues, setFormValues] = useState<T>(initialValues)
    const [loading, setLoading] = useState<boolean>(false)
    const [options, setOptions] = useState<OptionsStateType>({})

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const responses = await Promise.all(
                    additionalData.map((i) =>
                        ApiService.fetchData<OptionType[]>({
                            method: 'GET',
                            url: i.url,
                        }),
                    ),
                )

                const _options = additionalData.reduce(
                    (obj, i, idx) => ({
                        ...obj,
                        [i.key]: i.customHandler ? responses[idx].data?.map(i.customHandler) : responses[idx].data,
                    }),
                    {},
                )

                setOptions({
                    ...constantData,
                    ..._options,
                })
            } catch (error) {
                console.error(error)
            }
            setLoading(false)
        }

        if (additionalData?.[0]) fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!id || id === 'create') return setFormValues(initialValues)
        const fetchData = async () => {
            setLoading(true)
            try {
                const response = await ApiService.fetchData<T>({
                    method: 'GET',
                    url: `${endpoints.fetch}/${id}`,
                })

                setFormValues(response.data)
            } catch (error) {
                console.error(error)
            }
            setLoading(false)
        }

        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    const handleSubmit = async (values: T, formikHelpers: FormikHelpers<T>) => {
        setLoading(true)
        try {
            await ApiService.fetchData({
                method: id === 'create' ? 'POST' : 'PUT',
                url: `${endpoints.submit}${id === 'create' ? '' : `/${id}`}`,
                data: values,
            })

            if (id === 'create') {
                setFormValues(initialValues)
                formikHelpers.setValues(initialValues)
            }
            showAlert('Successfully submitted the form.')
            onSuccess?.()
        } catch (error) {
            const _error = error as AxiosError<{ message: string }>
            if (_error.status !== 500) showError(_error?.response?.data?.message)
        }
        setLoading(false)
    }

    return {
        loading,
        options,
        formValues,
        setFormValues,
        handleSubmit,
    }
}

export default useForm
