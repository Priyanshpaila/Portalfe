import { chargeNatures } from './data'

const getInitialItemCharge = (currItem, taxable: number) => {
    if (!currItem.taxRate) return []
    const taxDetails = []
    const taxFields = ['cgst', 'sgst']

    for (const taxField of taxFields) {
        const tax = {
            chargeName: `${taxField} @${currItem.taxRate / taxFields.length}%`,
            chargeType: '',
            nature: 'percent',
            chargeOn: 'item',
            chargeValue: +(currItem.taxRate / taxFields.length).toFixed(2),
            chargeAmount: +((taxable / 100) * (currItem.taxRate / taxFields.length)).toFixed(2),
            taxField: taxField,
            status: 1,
        }

        taxDetails.push(tax)
    }

    return taxDetails
}

export const handleItemAmount = (currItem, shouldDivideTaxRate = false) => {
    const basic = currItem.rate * currItem.qty

    if (currItem.discountType === 'percent') currItem.discountAmount = +((basic / 100) * +currItem.discountPercent).toFixed(2)
    else if (currItem.discountType === 'amount') currItem.discountPercent = +((+currItem.discountAmount / basic) * 100).toFixed(2)

    const discount = +currItem.discountAmount || 0
    const taxable = basic - discount

    const amount = {
        basic: +basic.toFixed(2),
        taxable: +taxable.toFixed(2),
        discount: +discount.toFixed(2),
        igst: 0,
        cgst: 0,
        sgst: 0,
        utgst: 0,
        total: taxable,
    }

    const taxDetails = (currItem.taxDetails?.[0] && !shouldDivideTaxRate ? currItem.taxDetails : getInitialItemCharge(currItem, taxable))?.map((tax) => {
        if (!tax.status) {
            tax.chargeAmount = 0
            return tax
        }

        if (tax.nature === 'percent') {
            tax.chargeAmount = +((taxable / 100) * +tax.chargeValue).toFixed(2)
        } else if (tax.nature === 'amount') {
            tax.chargeAmount = +tax.chargeValue
        } else if (tax.nature === 'discount') {
            const discountValue = +((taxable / 100) * +tax.chargeValue).toFixed(2)
            amount.discount += discountValue
            tax.chargeAmount = -discountValue
        } else {
            tax.chargeAmount = +tax.chargeValue
        }

        if (tax.nature === 'discount') {
            amount.total -= Math.abs(tax.chargeAmount)
        } else {
            amount[tax.taxField] += tax.chargeAmount
            amount.total += tax.chargeAmount
        }

        return tax
    })

    amount.total = +amount.total.toFixed(2)

    return {
        ...currItem,
        taxDetails,
        amount,
    }
}

export const handleAmountCalculation = (values) => {
    const amount = {
        basic: 0,
        discount: 0,
        otherCharges: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        utgst: 0,
        total: 0,
    }

    let totalQty = 0

    if (values.items?.[0])
        for (const item of values.items) {
            totalQty += item.qty
            amount.basic += item.amount.basic
            amount.discount += +item.amount.discount || 0
            amount.total += item.amount.total
            if (item.amount.igst) amount.igst += item.amount.igst
            if (item.amount.cgst) amount.cgst += item.amount.cgst
            if (item.amount.sgst) amount.sgst += item.amount.sgst
        }

    amount.basic = +amount.basic.toFixed(2)
    amount.discount = +amount.discount.toFixed(2)
    if (amount.igst) amount.igst = +amount.igst.toFixed(2)
    else {
        amount.cgst = +amount.cgst.toFixed(2)
        amount.sgst = +amount.sgst.toFixed(2)
    }

    if (values.charges && typeof values.charges === 'object') {
        const gstRate = Math.max(...(values.items?.map((i: { taxRate: number }) => +i.taxRate || 0) || [])) || 0
        Object.entries(values.charges).forEach(([key, chargeObj]) => {
            const charge = chargeObj as { amount: number; gstRate?: number; gstAmount?: number }
            if (!charge?.amount) return

            charge.gstRate = gstRate
            charge.gstAmount = +(charge.amount * (gstRate / 100)).toFixed(2)
            amount.otherCharges += charge.amount + charge.gstAmount
            amount.total += charge.amount + charge.gstAmount
        })
    }

    for (const tax of values.taxDetails || []) {
        tax.chargeAmount =
            tax.nature === chargeNatures[0].value
                ? +(((amount.basic - amount.discount) / 100) * +tax.chargeValue).toFixed(2)
                : tax.nature === chargeNatures[2].value
                  ? totalQty * tax.chargeValue
                  : tax.chargeValue

        amount[tax.taxField] += tax.chargeAmount
        amount.total += tax.chargeAmount
    }

    amount.otherCharges = +amount.otherCharges.toFixed(2)
    amount.total = +amount.total.toFixed(2)

    return { ...values, amount }
}
