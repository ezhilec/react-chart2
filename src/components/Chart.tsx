import {
    Line,
    getElementAtEvent,
} from "react-chartjs-2";
import * as React from "react";
import {ChartData, ScatterDataPoint} from "chart.js";
import {MouseEvent, useRef} from "react";
import type {InteractionItem} from 'chart.js';
import moment from "moment";

interface ChartProps {
    loading: boolean,
    error: string | null,
    chartData: ChartData<'line'> | null,
    setSelectedDate: Function
}

function Chart(props: ChartProps) {

    const scales: { [key: string]: any } = {
        x: {
            type: 'time' as const,
            border: {
                display: false
            },
            time: {
                tooltipFormat: 'DD.MM.YYYY',
                unit: 'day' as const,
                displayFormats: {
                    day: 'DD.MM'
                }
            }
        }
    }

    if (props.chartData && props.chartData.datasets.some(item => item.yAxisID === 'y')) {
        scales.y = {
            type: 'linear' as const,
            min: 0,
            max: 10,
            offset: true,
            border: {
                display: false
            },
            position: 'left' as const,
            stack: 'stack',
            stackWeight: 10,
            ticks: {
                stepSize: 1,
                autoSkip: false,
            },
        }
    }

    if (props.chartData && props.chartData.datasets.some(item => item.yAxisID === 'binary')) {
        scales.binary = {
            type: 'category' as const,
            labels: ['да', 'нет'],
            position: 'left' as const,
            border: {
                display: false
            },
            offset: true,
            stack: 'stack',
            stackWeight: 3,
            ticks: {
                stepSize: 1,
                autoSkip: false,
            }
        }
    }

    if (props.chartData && props.chartData.datasets.some(item => item.yAxisID === 'notes')) {
        scales.notes = {
            type: 'category' as const,
            labels: ['заметки'],
            position: 'left' as const,
            border: {
                display: false
            },
            offset: true,
            stack: 'stack',
            stackWeight: 2,
        }
    }

    const chartOptions = {
        responsive: true,
        plugins: {
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        return context.raw.estimation || '';
                    }
                }
            }
        },
        maintainAspectRatio: false,
        scales,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
    }

    const printElementAtEvent = (element: InteractionItem[]) => {
        if (!element.length) return;
        const {datasetIndex, index} = element[0];
        const clickedDate: ScatterDataPoint | number | null | undefined = props.chartData?.datasets[datasetIndex]?.data[index];
        if (typeof clickedDate !== 'number' && clickedDate) {
            // @ts-ignore
            props.setSelectedDate(clickedDate ? moment(clickedDate["date"]).format('YYYY-MM-DD') : null)
        }
    };

    const chartRef = useRef<any>(null);

    const onClick = (event: MouseEvent<HTMLCanvasElement>) => {
        const {current: chart} = chartRef;

        if (!chart) {
            return;
        }

        printElementAtEvent(getElementAtEvent(chart, event));
    };

    if (props.loading) {
        return <div className="app__block chart_empty">Загрузка...</div>
    }

    if (props.error) {
        return <div className="app__block chart_empty">{props.error}</div>
    }

    if (props.chartData) {
        return <div className="app__block chart">
            <Line
                options={chartOptions}
                data={props.chartData}
                ref={chartRef}
                onClick={onClick}
            />
        </div>
    }

    return <div className="app__block chart_empty">Здесь появится график</div>
}

export default Chart