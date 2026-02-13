let loadingPromise: Promise<boolean> | null = null

export default function loadRazorpay(): Promise<boolean> {
    if (loadingPromise) return loadingPromise

    loadingPromise = new Promise((resolve) => {
        // already loaded
        if ((window as any).Razorpay) return resolve(true)

        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.body.appendChild(script)
    })

    return loadingPromise
}