export type OptionType = {
    label: string
    value: string | boolean | Date | number
}

export type ChargeType = {
    type: string
    description?: string
    amount: number
    gstRate: number
    gstAmount: number
}

export type ChargesType = {
    otherCharges: ChargeType
    packagingForwarding: ChargeType
}

export type AmountType = {
    basic: number
    taxable?: number
    otherCharges?: number
    discount: number
    igst?: number
    cgst?: number
    sgst?: number
    utgst?: number
    total: number
}

export type RFQItemType = {
    indentNumber: string
    itemDescription: string
    itemCode: string
    rfqMake: string
    rfqRemarks: string
    rfqTechSpec: string
    balanceQty?: number
    rfqQty: number
    unit: string
    hsnCode: string
    techSpec: string
}

export type RFQVendorType = {
    vendorCode: string
    name?: string
    contactPerson: { name: string; email: string }
    location: string
    status?: 0 | 1 | 2
    regretTimestamp?: Date | string
}

export type RFQAttachmentType = {
    file?: File | string
    description: string
    size: number
    status?: number
}

export type TermsAndConditionsType = { [type in string]: string }

export type RFQType = {
    // [x: string]: string
    _id?: string
    rfqNumber: string
    rfqDate: string | Date | null
    dueDate: string | Date | null
    dueDateRemarks?: string
    prevDueDates?: {
        dueDate: Date | string | null
        dueDateRemarks: string
    }[]
    status: 0 | 1
    remarks: string
    contactPersonName: string
    contactNumber: string
    contactEmail: string
    termsConditions: TermsAndConditionsType
    items?: RFQItemType[]
    vendors?: RFQVendorType[]
    createdBy?: string
    submittedBy?: string
    createdAt?: string
    submittedAt?: string
    attachments?: RFQAttachmentType[]

    file?: File[]
    tempTnC?: { key?: ''; value?: '' }
    quotations?: number
}

export type IndentItemType = {
    itemCode: string
    itemDescription: string
    techSpec?: string
    lineNumber: string
    hsnCode?: string
    make?: string
    qty: number
    unit?: string
    remark?: string
}

export type IndentType = {
    id: string
    indentNumber: string
    itemCode: string
    itemDescription: string
    company: string
    costCenter: string
    remark: string
    make: string
    techSpec: string
    unitOfMeasure: string
    documentNumber: string
    documentDate: string
    documentType: string
    lineNumber: string
    createdBy: string
    createdOn: string
    lastChangedOn: string
    requestedBy: string

    indentQty: number
    preRFQQty: number
    prePOQty: number
    balanceQty: number

    deletionIndicator: string
    creationIndicator: string
    controlIndicator: string
    documentCategory: string
    materialNumber: string
    storageLocation: string
    trackingNumber: string
    orderItemNumber: string
    packageNumber: string
    utcTimestamp: string
}

export type VendorType = {
    vendorCode: string
    countryKey: string
    name: string
    name1: string
    name2: string
    name3: string
    name4: string
    city: string
    district: string
    poBox: string
    poBoxPostalCode: string
    postalCode: string
    creationDate: string
    sortField: string
    streetHouseNumber: string
    panNumber: string
    msme: string
    gstin: string
    orgName1: string
    orgName2: string
    companyCode: string
    cityPostalCode: string
    street: string
    street2: string
    street3: string
    street4: string
    street5: string
    languageKey: string
    region: string
    contactPerson: {
        name: string
        email: string
        mobilePhoneIndicator: string
        fullPhoneNumber: string
        callerPhoneNumber: string
    }[]
}

export type QuotationItemType = {
    selected?: boolean
    indentNumber: string
    itemCode: string
    qty: number
    hsnCode: string
    make: string
    rate: number
    taxRate: number
    delivery: number
    remarks: string
    taxDetails: TaxChargeType[]

    discountType: 'percent' | 'amount'
    discountPercent: number | string
    discountAmount: number | string

    amount: Omit<AmountType, 'otherCharges'>
}

export type QuotationType = Pick<RFQType, 'rfqNumber' | 'attachments' | 'termsConditions' | 'contactEmail' | 'contactNumber' | 'contactPersonName' | 'file'> & {
    _id?: string
    validityDate: string | Date | null
    quotationNumber: string
    quotationDate: string | Date | null
    status?: 0 | 1
    creditDays: number
    freightType: string
    paymentMode: string
    remarks: string
    vendorCode: string
    vendorLocation: string
    amount: AmountType
    items: QuotationItemType[]
    charges?: ChargesType
}

export type CSVendor = {
    name: string
    vendorCode: string
    companyCode: string
    quotationNumber: string
    quotationDate: Date | string
    vendorLocation: string
    contactPersonName: string
    contactNumber: string
    contactEmail: string
    remarks: string
    freightType: string
    termsConditions: TermsAndConditionsType
    charges: ChargesType
    total: {
        basicAfterDiscount: number
        gst: number
        netAmount: number
    }
}

export type CSType = {
    _id?: string
    csNumber: string
    csType: string
    csDate?: string
    csValidity?: string
    csRemarks: string
    rfqNumber: string
    rfqDate: Date | string | null
    authorizedBy?: string
    authorizedAt?: string | Date | null
    status?: number
    vendors: CSVendor[]
    items: {
        indentNumber: string
        itemCode: string
        itemDescription: string
        qty: number
        unit: string
        poStatus?: 0 | 1
        vendors: {
            vendorCode: string
            poQty?: number
            lastPoRate: string
            lastPoNo: string
            lastPoDate: string
            lastPoVendor: string
            make: string
            rate: number
            basicAmount: number
            discount: number
            basicAfterDiscount: number
            rateAfterDiscount: number
            taxRate: number
            taxDetails: TaxChargeType[]
            amount: QuotationItemType['amount']
        }[]
        leastValues: {
            basicAfterDiscount: { value: number; vendorCode: string }
            rateAfterDiscount: { value: number; vendorCode: string }
        }
    }[]
    leastValues: {
        basicAfterDiscount: { value: number; vendorCode: string }
        netAmount: { value: number; vendorCode: string }
    }
    selection?: {
        vendorCode: string
        quotationNumber: string
        quotationDate: Date | string | null
        indentNumber?: string
        itemCode?: string
        qty?: number
    }[]
}

export type POItem = {
    selected?: boolean
    taxRate?: number
    indentNumber: string
    itemCode: string
    itemDescription: string
    hsnCode: string
    make: string
    techSpec: string
    qty: number | string
    originalQty?: number | string
    unit: string
    rate: number | string
    csNumber?: string
    csDate?: Date | string | null
    schedule: Date | string | null
    tolerance?: {
        basis?: string
        positive?: number | string
        negative?: number | string
    }
    // schedule: ItemScheduleType[]
    taxDetails?: TaxChargeType[]

    amount: Omit<AmountType, 'otherCharges'>
    remarks: string
}

export type POType = Pick<RFQType, 'attachments' | 'termsConditions' | 'tempTnC' | 'file'> & {
    _id?: string
    poNumber: string
    poDate: Date | string | null
    sapPONumber: string

    amendNumber: number
    amendRemarks?: string
    amendHistory?: {
        amendedBy: string
        amendedAt: string
    }

    company: string
    division: string
    purchaseType: string
    refDocumentType: string

    authorizedBy?: string
    authorizedAt?: string | Date | null

    refDocumentNumber?: string
    refCSNumber?: string
    refCSDate?: string | Date | null

    vendorCode: string
    vendorName: string
    vendorLocation: string
    contactPersonName: string
    serialNumber: string
    validityDate: Date | string | null
    departmentName: string
    remarks: string
    partyRefNumber?: string
    partyRefDate?: Date | string | null

    items: POItem[]
    taxDetails: TaxChargeType[]

    shippingAccount: {
        paymentMode: string
        freightType: string
        freightRate: string
        freightAmount: string
        priority: string
        fromLocation: string
        toLocation: string
        shippingAddress: string
        defineTransportationRoute: string
    }

    amount: AmountType

    paymentTerms: {
        paymentType: string
        baseDateType: string
        payOn: string
        payValuePercent: number
        payValueAmount: number
        days: number
        remarks: string
    }[]
    readyForAuthorization: boolean
    _readyForAuthorization?: boolean

    charges?: ChargesType

    authorize: {
        user: string
        assignOn: Date | string | null
        changedOn: Date | string | null
        approvalStatus: 0 | 1 | 2
        comment: string
    }[]

    vendorContacts?: OptionType[]
}

export type TaxChargeType = {
    chargeName: string
    chargeType: string
    nature: string
    chargeOn: string
    chargeValue: number | string
    chargeAmount: number
    status: number
    taxField: string
}

export type UserType = {
    _id?: string
    vendorCode?: string
    email?: string
    password?: string
    passwordStatus?: string
    name: string
    username: string
    status: number
    role?: string
    digitalSignature?: File | string
}

export type RoleType = {
    _id?: string
    name: string
    status: number
    permissions: string[]
}

export type NegotiationItemType = Pick<CSType['items'][0]['vendors'][0], 'rate' | 'basicAfterDiscount' | 'make'> &
    Omit<CSType['items'][0], 'poStatus' | 'vendors'> & {
        rfqMake?: string
        discountAmount: number
        discountPercent: number

        negotiationOn?: (keyof NegotiationItemType)[]
        selected: boolean
        savings: number
    }

export type NegotiationType = {
    _id?: string
    status?: 0 | 1
    savedBy?: string
    savedAt?: string
    savedByUser?: string
    submittedAt?: string
    submittedBy?: string
    submittedByUser?: string
    rfqNumber?: string
    items?: NegotiationItemType[]
    charges?: { [K in keyof ChargesType]?: number }
    termsConditions?: TermsAndConditionsType
    savings?: {
        items?: number
        charges?: number
        total?: number
    }
}

export type StatsType = {
    pendingRFQs: number
    initialRFQs: number
    pendingQuotations: number
    submittedQuotations?: number
    outstandingQuotations: number
    unapprovedPOs: number
    totalPOs: number
    pendingIndents: number
    expiringIndents: number
}

export type MonthlyTrendType = { labels: string[]; data: ApexAxisChartSeries }
export type AmountTrendType = { labels: string[]; data: number[] }
export type TodayVs30DaysType = Record<
    'rfq' | 'quotation' | 'po' | 'poTotal',
    {
        today: number
        last30Days: number
    }
>
