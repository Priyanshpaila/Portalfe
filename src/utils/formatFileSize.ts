export default function formatFileSize(kb: number) {
    if (kb < 1024) {
        return `${kb} KB`
    } else {
        const mb = kb / 1024
        return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`
    }
}