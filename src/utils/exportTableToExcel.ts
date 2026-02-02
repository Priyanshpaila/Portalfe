import { TableDataType } from '@/components/app/CustomDataTable'
import ApiService from '@/services/ApiService'
import { ColumnDef } from '@tanstack/react-table'
import * as XLSX from 'xlsx'

const defaultFileName = 'table.xlsx'

function exportExcel(data: unknown[][], fileName: string = defaultFileName) {
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    XLSX.writeFile(workbook, fileName)
}

function tableToArray(table: HTMLTableElement, ignoreColIndexes: number[] = []): (string | number | null)[][] {
    const rows: (string | number | null)[][] = []
    const rowSpans: { [key: number]: { col: number; val: string | number | null; left: number }[] } = {}

    const trs = Array.from(table.querySelectorAll('tr'))

    trs.forEach((tr, rowIndex) => {
        const cells = Array.from(tr.children) as HTMLTableCellElement[]
        const row: (string | number | null)[] = []

        // Handle carried-over rowspans first
        if (rowSpans[rowIndex]) {
            rowSpans[rowIndex].forEach((span) => {
                row.push(span.val)
                if (span.left > 1) {
                    if (!rowSpans[rowIndex + 1]) rowSpans[rowIndex + 1] = []
                    rowSpans[rowIndex + 1].push({ col: span.col, val: span.val, left: span.left - 1 })
                }
            })
        }

        cells.forEach((cell, cellIdx) => {
            if (ignoreColIndexes.includes(cellIdx)) return
            const colSpan = cell.colSpan || 1
            const rowSpan = cell.rowSpan || 1
            const text = cell.innerText.trim()

            // Insert this cell value
            row.push(text)

            // Fill extra columns from colspan
            for (let i = 1; i < colSpan; i++) {
                row.push(null)
            }

            // If rowspan, carry value downwards
            if (rowSpan > 1) {
                for (let r = 1; r < rowSpan; r++) {
                    if (!rowSpans[rowIndex + r]) rowSpans[rowIndex + r] = []
                    rowSpans[rowIndex + r].push({ col: row.length - colSpan, val: text, left: 1 })
                }
            }
        })

        rows.push(row)
    })

    return rows
}

export function exportTableToExcel(
    sheetRef: React.RefObject<HTMLDivElement | null>,
    params: {
        fileName?: string
        ignoreColIndexes?: number[]
    } = {},
) {
    const { fileName, ignoreColIndexes } = params
    if (!sheetRef.current) return console.error('Table not found')
    const table = sheetRef.current?.querySelector('table') as HTMLTableElement | null
    if (!table) return console.error('Table not found')

    const data = tableToArray(table, ignoreColIndexes)
    exportExcel(data, fileName)
}

export async function fetchToExportExcel<T>(fetchApi: string, filters: TableDataType['filters'], cols: ColumnDef<T>[], transfromValues: (value: T) => T) {
    const response = await ApiService.fetchData<{ data: T[] }>({
        method: 'post',
        url: fetchApi,
        data: {
            filters,
            shouldFetchAll: true,
        },
    })

    const [headers, keys] = cols.reduce<string[][]>(
        (arr, i) =>
            !i.accessorKey
                ? arr
                : [
                      [...arr[0], i.header],
                      [...arr[1], i.accessorKey],
                  ],
        [[], []],
    )

    const rows = response.data.data.map((i) => {
        const updatedValue = transfromValues(i)
        return keys.map((k) => updatedValue[k as keyof T] || '')
    })

    exportExcel([headers, ...rows])
}
