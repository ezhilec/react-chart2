import {Line} from "react-chartjs-2";
import * as React from "react";
import {ChartData} from "chart.js";

interface ChartProps {
    loading: boolean,
    error: string | null,
    chartData: ChartData<'line'> | null

}

function Chart(props: ChartProps) {

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'time' as const,
                border:{
                    display:false
                },
                time: {
                    tooltipFormat: 'DD.MM.YYYY',
                    unit: 'day' as const,
                    displayFormats: {
                        day: 'DD.MM'
                    }
                }
            },
            y: {
                type: 'linear' as const,
                min: 0,
                max: 10,
                offset: true,
                border:{
                    display: false
                },
                position: 'left' as const,
                stack: 'stack',
                stackWeight: 10,
                ticks: {
                    stepSize: 1,
                    autoSkip: false,
                },
            },
            binary: {
                type: 'category' as const,
                labels: ['да', 'нет'],
                position: 'left' as const,
                border:{
                    display:false
                },
                offset: true,
                stack: 'stack',
                stackWeight: 3,
                ticks: {
                    stepSize: 1,
                    autoSkip: false,
                }
            },
        },
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
    }

    // if (props.chartData?.datasets.some(item => item.yAxisID === "binary")) {
    //     chartOptions.scales.binary = {
    //         type: 'category' as const,
    //         labels: ['да', 'нет'],
    //         position: 'left' as const,
    //         border:{
    //             display:false
    //         },
    //         offset: true,
    //         stack: 'stack',
    //         stackWeight: 3,
    //         ticks: {
    //             stepSize: 1,
    //             autoSkip: false,
    //         }
    //     }
    // }

    if (props.loading) {
        return <div className="app__block chart_empty">Загрузка...</div>
    }

    if (props.error) {
        return <div className="app__block chart_empty">{props.error}</div>
    }

    if (props.chartData) {
        return <div className="app__block chart">
            <Line options={chartOptions} data={props.chartData}/>
        </div>
    }

    return <div className="app__block chart_empty">Здесь появится график</div>
}

export default Chart