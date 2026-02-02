export function formatIndianAmount(amount?: number) {
    if (typeof amount !== 'number' || isNaN(amount)) return '0.00'

    const rounded = Math.round(amount / 10) * 10

    let value = rounded
    let suffix = ''

    if (rounded >= 1e7) {
        value = rounded / 1e7
        suffix = ' Cr'
    } else if (rounded >= 1e5) {
        value = rounded / 1e5
        suffix = ' L'
    } else if (rounded >= 1e3) {
        value = rounded / 1e3
        suffix = ' K'
    }

    return value.toFixed(2) + suffix
}
