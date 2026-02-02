export default function objectToFormData(obj: object, form = new FormData(), namespace = '') {
    if (obj == null) return form

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'undefined' || value === null) continue

        const formKey = namespace ? `${namespace}[${key}]` : key

        if (value instanceof Date) {
            form.append(formKey, value.toISOString())
        } else if (value instanceof File) {
            form.append(formKey, value)
        } else if (Array.isArray(value)) {
            value.forEach((element) => {
                const arrayKey = `${formKey}`
                if (element instanceof File) {
                    form.append(arrayKey, element)
                } else if (element instanceof Date) {
                    form.append(arrayKey, element.toISOString())
                } else if (typeof element === 'object' && element !== null) {
                    objectToFormData(element, form, arrayKey)
                } else {
                    form.append(arrayKey, element)
                }
            })
        } else if (typeof value === 'object') {
            objectToFormData(value, form, formKey)
        } else {
            form.append(formKey, value)
        }
    }

    return form
}
