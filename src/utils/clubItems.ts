import { QuotationItemType } from '@/@types/app'
import { handleItemAmount } from './amountCalculation'

export const clubItems = (items: QuotationItemType[]) => {
    const _items: { [key: string]: QuotationItemType } = {}
    const qtyMap = []
    for (const item of items) {
        if (_items?.[item.itemCode]) _items[item.itemCode].qty += item.qty
        else _items[item.itemCode] = item

        qtyMap.push({
            indentNumber: item.indentNumber,
            itemCode: item.itemCode,
            qty: item.qty,
        })
    }

    return {
        items: Object.values(_items)?.map((i) => handleItemAmount(i, true)),
        qtyMap,
    }
}

export const deClubItems = (items: QuotationItemType[], qtyMap: Pick<QuotationItemType, 'indentNumber' | 'itemCode' | 'qty'>[]) => {
    const itemMap: { [itemCode: string]: QuotationItemType } = {}
    for (const item of items) itemMap[item.itemCode] = item

    const _items: QuotationItemType[] = qtyMap
        .map((i) =>
            itemMap[i.itemCode]
                ? handleItemAmount(
                      {
                          ...itemMap[i.itemCode],
                          indentNumber: i.indentNumber,
                          qty: i.qty,
                      },
                      true,
                  )
                : null,
        )
        .filter(Boolean)

    return _items
}
