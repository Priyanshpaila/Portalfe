import React, { useState, useCallback, useEffect } from 'react'
import { Select, SelectProps } from '@/components/ui'
import ApiService from '@/services/ApiService'
import { OptionType } from '@/@types/app'
import _ from 'lodash'

type DebouncedSelectProps = Omit<SelectProps<OptionType, false>, 'value'> & {
    url: string
    customHandler?: ((value: OptionType | { [key: string]: string }) => OptionType) | undefined
    value: string
}

export default function DebouncedSelect({ url, customHandler, value, ...props }: DebouncedSelectProps) {
    const [loading, setLoading] = useState(false)
    const [options, setOptions] = useState<OptionType[]>([])
    const [inputValue, setInputValue] = useState('')
    const [selection, setSelection] = useState<OptionType | null>()

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleFetch = useCallback(
        _.debounce(async (params: { search?: string; value?: string }) => {
            if (!params?.value && (!params?.search || params?.search?.length < 3)) return

            setLoading(true)
            try {
                const response = await ApiService.fetchData<OptionType[]>({
                    method: 'get',
                    url,
                    params: params,
                })

                if (response.data) {
                    setOptions(customHandler ? response.data.map((value) => customHandler(value)) : response.data)
                }
            } catch (error) {
                console.error('Error fetching options:', error)
            } finally {
                setLoading(false)
            }
        }, 500),
        [url, customHandler],
    )

    const _value = selection?.value === value ? selection : options.find((i) => i.value === value)

    useEffect(() => {
        if (!value) setSelection(null)
    }, [value])

    useEffect(() => {
        if (!_value && inputValue) handleFetch({ value })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [_value])

    const onInputChange = (val: string) => {
        setInputValue(val)
        handleFetch({ search: val })
    }

    return (
        <Select
            {...props}
            {...{
                options,
                inputValue,
                onInputChange,
            }}
            value={_value || null}
            placeholder='Type to search'
            noOptionsMessage={() => <>{loading ? 'Loading...' : inputValue?.length > 3 ? 'No options' : 'Type something to search'}</>}
            isLoading={loading}
            onChange={(val, actionMeta) => {
                setSelection(val as OptionType)
                props?.onChange?.(val as OptionType, actionMeta)
            }}
        />
    )
}
