function numberInWords(price: number | string): string {
    const sglDigit = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'],
        dblDigit = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'],
        tensPlace = ['', 'Ten', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

    const handle_tens = (dgt: number, prevDgt: number): string => {
        return dgt === 0 ? '' : ' ' + (dgt === 1 ? dblDigit[prevDgt] : tensPlace[dgt])
    }

    const handle_utlc = (dgt: number, nxtDgt: number, denom: string): string => {
        return (dgt !== 0 && nxtDgt !== 1 ? ' ' + sglDigit[dgt] : '') + (nxtDgt !== 0 || dgt > 0 ? ' ' + denom : '')
    }

    let str = ''
    const words: string[] = []
    const priceStr = price.toString()

    if (isNaN(parseInt(priceStr))) {
        str = ''
    } else if (parseInt(priceStr) > 0 && priceStr.length <= 10) {
        for (let digitIdx = priceStr.length - 1; digitIdx >= 0; digitIdx--) {
            const digit = Number(priceStr[digitIdx])
            const nxtDigit = digitIdx > 0 ? Number(priceStr[digitIdx - 1]) : 0
            switch (priceStr.length - digitIdx - 1) {
                case 0:
                    words.push(handle_utlc(digit, nxtDigit, ''))
                    break
                case 1:
                    words.push(handle_tens(digit, Number(priceStr[digitIdx + 1])))
                    break
                case 2:
                    words.push(
                        digit !== 0
                            ? ' ' + sglDigit[digit] + ' Hundred' + (Number(priceStr[digitIdx + 1]) !== 0 && Number(priceStr[digitIdx + 2]) !== 0 ? ' and' : '')
                            : '',
                    )
                    break
                case 3:
                    words.push(handle_utlc(digit, nxtDigit, 'Thousand'))
                    break
                case 4:
                    words.push(handle_tens(digit, Number(priceStr[digitIdx + 1])))
                    break
                case 5:
                    words.push(handle_utlc(digit, nxtDigit, 'Lakh'))
                    break
                case 6:
                    words.push(handle_tens(digit, Number(priceStr[digitIdx + 1])))
                    break
                case 7:
                    words.push(handle_utlc(digit, nxtDigit, 'Crore'))
                    break
                case 8:
                    words.push(handle_tens(digit, Number(priceStr[digitIdx + 1])))
                    break
                case 9:
                    words.push(
                        digit !== 0
                            ? ' ' +
                                  sglDigit[digit] +
                                  ' Hundred' +
                                  (Number(priceStr[digitIdx + 1]) !== 0 || Number(priceStr[digitIdx + 2]) !== 0 ? ' and' : ' Crore')
                            : '',
                    )
                    break
            }
        }
        str = words.reverse().join('')
    } else {
        str = ''
    }
    return str.trim()
}

export const amountInWords = (num: string | number) => {
    if (!num) return
    const splittedNum = num.toString().split('.')
    const nonDecimal = splittedNum[0]
    const decimal = splittedNum[1] || '0'

    return numberInWords(nonDecimal) + ' Rupees' + (decimal && Number(decimal) > 0 ? ' and ' + numberInWords(decimal) + ' Paise' : '')
}
