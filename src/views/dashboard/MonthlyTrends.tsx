import Chart from 'react-apexcharts'
import { COLORS } from '@/constants/chart.constant'
import { MonthlyTrendType } from '@/@types/app'

type MonthlyTrendsProps = {
    monthlyTrend?: MonthlyTrendType
}

const MonthlyTrends = ({ monthlyTrend }: MonthlyTrendsProps) => {
    return (
        <Chart
            options={{
                plotOptions: {
                    bar: {
                        horizontal: false,
                        columnWidth: '55%',
                        borderRadius: 2,
                    },
                },
                colors: COLORS,
                dataLabels: {
                    enabled: false,
                },
                stroke: {
                    show: true,
                    width: 2,
                    colors: ['transparent'],
                },
                xaxis: {
                    categories: monthlyTrend?.labels || [],
                },
                fill: {
                    opacity: 1,
                },
            }}
            series={monthlyTrend?.data || []}
            height={250}
            type='bar'
        />
    )
}

export default MonthlyTrends
