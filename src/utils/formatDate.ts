export const formatDate = (dateStr: string | undefined | Date |  null) => {
    if (typeof dateStr === 'string' && dateStr?.includes('/') && dateStr.length === 10) return dateStr
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return [date.getDate(), date.getMonth() + 1, date.getFullYear()].map((i) => i?.toString()?.padStart(2, '0')).join('/')
}

export const formatDateTime = (dateStr: string | undefined | null) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const formatedDate = formatDate(dateStr)
    const time = [date.getHours() % 12, date.getMinutes()].map((i) => i?.toString()?.padStart(2, '0')).join(':')
    const timeSuffix = date.getHours() >= 12 ? 'PM' : 'AM'

    return `${formatedDate}, ${time} ${timeSuffix}`
}

export function formatTimeDifference(startTime?: string, endTime?: string) {
    if (!startTime || !endTime) return null
    const ms = Math.abs(new Date(endTime).getTime() - new Date(startTime).getTime())

    const units = [
        { label: 'D', value: 86400000 },
        { label: 'H', value: 3600000 },
        { label: 'M', value: 60000 },
        { label: 'S', value: 1000 },
    ]

    let remaining = ms
    const result = []

    for (const unit of units) {
        const count = Math.floor(remaining / unit.value)
        if (count > 0) {
            result.push(`${count} ${unit.label}`)
            remaining %= unit.value
        }
        if (result.length === 2) break // Limit to max 2 units
    }

    return result.length > 0 ? result.join(' ') : '0 S'
}
