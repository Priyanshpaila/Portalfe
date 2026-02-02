export const freightTypes = ['TOPAY', 'FOR', 'FOR As Actual'].map((i) => ({ value: i, label: i }))
export const freightRates = ['Fixed', 'Per Unit', 'Per Trip'].map((i) => ({ value: i, label: i }))
export const paymentModes = ['Cash', 'DDFT', 'NEFT', 'RTGS', 'CHEQUE', 'LC'].map((i) => ({ value: i, label: i }))
export const priorities = ['Urgent', 'Medium', 'Low'].map((i) => ({ value: i, label: i }))
export const csTypes = [
    { label: 'Item Wise', value: 'item_wise' },
    { label: 'Over All', value: 'over_all' },
]