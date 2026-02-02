import { ChargesType } from '@/@types/app'

export const getIndentID = (values: { indentNumber?: string; itemCode?: string }) => values.indentNumber + ':' + values.itemCode

export const divisons = [{ label: 'RR Group', value: 'RR Group' }]

export const companies = [
    { plantCode: '2001', alias: 'MILL', companyName: 'R.R.ISPAT (A UNIT OF GPIL) MILL DIVISION' },
    { plantCode: '2002', alias: 'TLT', companyName: 'R.R.ISPAT (A UNIT OF GPIL) TLT DIVISION' },
    { plantCode: '2003', alias: 'SOLAR', companyName: 'R.R.ISPAT (A UNIT OF GPIL) SOLAR DIVISION' },
    { plantCode: '2004', alias: 'RAILWAY', companyName: 'R.R.ISPAT (A UNIT OF GPIL) RAILWAY DIVISION' },
    { plantCode: '2005', alias: 'HMP', companyName: 'R.R.ISPAT (A UNIT OF GPIL) HIGHMAST DIVISION' },
    { plantCode: '2006', alias: 'PM', companyName: 'R.R.ISPAT (A UNIT OF GPIL) PIPE MILL DIVISION' },
    { plantCode: '2007', alias: 'CT', companyName: 'R.R.ISPAT (A UNIT OF GPIL) CABLE TRAY DIVISION' },
    { plantCode: '2008', alias: 'EE', companyName: 'R.R.ISPAT (A UNIT OF GPIL) ELECT. ENG. DIVISION' },
    { plantCode: '2009', alias: 'GALVA', companyName: 'R.R.ISPAT (A UNIT OF GPIL) GALVA DIVISION' },
    { plantCode: '2010', alias: 'COMMON', companyName: 'R.R.ISPAT (A UNIT OF GPIL) COMMON DIVISION' },
]

export const termsConditionsOptions = [
    { value: 'payment-term', label: 'PAYMENT TERM' },
    { value: 'freight-delivery-term', label: 'FREIGHT (DELIVERY TERM)' },
    { value: 'warranty', label: 'WARRANTY' },
    { value: 'gurranty', label: 'GURRANTY' },
    { value: 'commissioning', label: 'COMMISSIONING' },
    { value: 'inspection', label: 'INSPECTION' },
    { value: 'packaging-forwarding', label: 'PACKAGING & FORWARDING' },
    { value: 'loading-unloading-charges', label: 'LOADING & UNLOADING CHARGES' },
    { value: 'ld-clause', label: 'LD CLAUSE' },
    { value: 'performance-guarantee', label: 'PERFORMANCE GUARANTEE' },
    { value: 'insurance', label: 'INSURANCE' },
    { value: 'documentation', label: 'DOCUMENTATION' },
]

export const CHARGE_TYPES: { label: string; value: keyof ChargesType }[] = [
    { label: 'OTHER CHARGES', value: 'otherCharges' },
    { label: 'PACKING & FORWARDING', value: 'packagingForwarding' },
]

export const refDocumentTypes = [
    { label: 'Quotation', value: 'quotation' },
    { label: 'Purchase Request', value: 'purchaseRequest' },
]

export const chargeNames = [
    { value: 'CGST @0%', label: 'CGST @0%' },
    { value: 'CGST @1.5%', label: 'CGST @1.5%' },
    { value: 'CGST @2.5%', label: 'CGST @2.5%' },
    { value: 'CGST @6%', label: 'CGST @6%' },
    { value: 'CGST @9%', label: 'CGST @9%' },
    { value: 'CGST @14%', label: 'CGST @14%' },

    { value: 'SGST @0%', label: 'SGST @0%' },
    { value: 'SGST @1.5%', label: 'SGST @1.5%' },
    { value: 'SGST @2.5%', label: 'SGST @2.5%' },
    { value: 'SGST @6%', label: 'SGST @6%' },
    { value: 'SGST @9%', label: 'SGST @9%' },
    { value: 'SGST @14%', label: 'SGST @14%' },

    { value: 'DISC', label: 'DISC' },

    { value: 'IGST @0%', label: 'IGST @0%' },
    { value: 'IGST @3%', label: 'IGST @3%' },
    { value: 'IGST @5%', label: 'IGST @5%' },
    { value: 'IGST @12%', label: 'IGST @12%' },
    { value: 'IGST @18', label: 'IGST @18' },
    { value: 'IGST @28', label: 'IGST @28' },

    { value: 'UTGST @0%', label: 'UTGST @0%' },
    { value: 'UTGST @2.5%', label: 'UTGST @2.5%' },
    { value: 'UTGST @6%', label: 'UTGST @6%' },
    { value: 'UTGST @9%', label: 'UTGST @9%' },
    { value: 'UTGST @14%', label: 'UTGST @14%' },
]

export const chargeTypes = [{ value: 'exclusive', label: 'Exclusive' }]
export const chargeNatures = [
    { value: 'percent', label: 'Percentage' },
    { value: 'amount', label: 'Amount' },
    { value: 'onUnit', label: 'On Unit' },
]
export const chargeOnOptions = [
    { value: 'base', label: 'Base' },
    { value: 'item', label: 'On Item' },
]
