import Chart from 'react-apexcharts'
import { COLOR_1 } from '@/constants/chart.constant'
import { AmountTrendType } from '@/@types/app'

const BasicArea = ({ amountTrend }: { amountTrend?: AmountTrendType }) => {
    const data = [
        {
            name: 'PO Total Amount',
            data: amountTrend?.data || [],
        },
    ]

    return (
        <Chart
            options={{
                chart: {
                    zoom: {
                        enabled: false,
                    },
                },
                colors: [COLOR_1],
                fill: {
                    type: 'gradient',
                    gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.7,
                        opacityTo: 0.9,
                        stops: [0, 80, 100],
                    },
                },
                dataLabels: {
                    enabled: false,
                },
                stroke: {
                    curve: 'smooth',
                    width: 3,
                },
                labels: amountTrend?.labels || [],
                xaxis: {
                    type: 'datetime',
                },
                legend: {
                    horizontalAlign: 'left',
                },
            }}
            type='area'
            series={data}
            height={250}
        />
    )
}

export default BasicArea
