import {Line} from "react-chartjs-2";
import * as React from "react";
import {useEffect, useRef, useState} from "react";
import {ChartData, TooltipItem} from "chart.js";
import moment from "moment";
import slug from "slug";

interface ChartProps {
    loading: boolean,
    error: string | null,
    chartData: ChartData<'line'> | null,
    notes: { [key: string]: string[] }
}

function Chart(props: ChartProps) {

    const chartMinHeight = 200
    const scaleHeight = 27
    const [chartHeight, setChartHeight] = useState(chartMinHeight)

    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                    day: 'DD.MM',
                }
            },
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
            weight: 100
        }
    }

    if (props.chartData && props.chartData.datasets.some(item => item.yAxisID?.startsWith('binary'))) {
        const binaryLabels: string[] = props.chartData.datasets
            .filter(item => item.yAxisID?.startsWith('binary'))
            .map(item => item.label as string)
        const uniqueBinaryLabels: string[] = Array.from(new Set(binaryLabels));

        uniqueBinaryLabels.forEach((label: string, index: number) => {
            const customLabel = `# ${binaryLabels.length - index}`
            scales['binary_' + slug(label)] = {
                type: 'category' as const,
                labels: [customLabel],
                position: 'left' as const,
                border: {
                    display: false
                },
                offset: true,
                stack: 'stack',
                stackWeight: 1,
                weight: 200 + index
            }
        })
    }

    if (props.chartData && props.chartData.datasets.some(item => item.yAxisID === 'notes')) {
        scales.notes = {
            type: 'category' as const,
            labels: ['✏️'],
            position: 'left' as const,
            border: {
                display: false
            },
            offset: true,
            stack: 'stack',
            stackWeight: 1,
            weight: 300
        }
    }

    const chartOptions = {
        responsive: true,
        plugins: {
            tooltip: {
                events: ["click"],
                enabled: true,
                mode: "x" as const,
                intersect: false,
                callbacks: {
                    label: function (context: any) {
                        let value = context.raw.estimation
                        if (context.raw.type_id.startsWith('binary')) {
                            value = value ? 'да' : 'нет'
                        }

                        return context.raw.estimation !== null
                            ? context.dataset.label + ': ' + value
                            : '';
                    }
                },
                external: (context: any) => {
                    const tooltip = context.tooltip as TooltipItem<'line'>;
                    const position = chartRef.current?.canvas.getBoundingClientRect();

                    if (!position || !tooltip) {
                        hideExtraTooltip();
                        return;
                    }

                    showExtraTooltip(tooltip);
                },

            }
        },
        maintainAspectRatio: false,
        scales,
    }

    const yGridCount = (scales: { [x: string]: any; }) => {
        let count = 0
        Object.keys(scales).forEach((scale) => {
            if (scale === 'y') {
                count += 10
            } else if (scale === 'x') {
                return
            } else {
                count++
            }
        })

        return count
    }

    useEffect(() => {
        setChartHeight(Math.max(chartMinHeight, yGridCount(scales) * scaleHeight))
    }, [props.chartData, scaleHeight, scales])

    const chartRef = useRef<any>(null);
    const tooltipRef = useRef<any>(null);

    const showExtraTooltip = (tooltip: any) => {
        const tooltipEl = tooltipRef.current;

        if (!tooltipEl || !tooltip || !tooltip.title) return;

        const date = tooltip.title[0]
        const dateKey = moment(date, 'DD.MM.YYYY').format('YYYY-MM-DD')

        tooltipEl.innerHTML = ''

        if (props.notes[dateKey]) {
            tooltipEl.innerHTML += `<h3>Заметки за ${date}</h3>`
            props.notes[dateKey].forEach(item => {
                tooltipEl.innerHTML += `<p>${item}</p>`
            })
        }
    };

    const hideExtraTooltip = () => {
        const tooltipEl = tooltipRef.current;

        if (!tooltipEl) return;

        tooltipEl.style.opacity = '0';
    };

    if (props.loading) {
        return <div className="app__block chart_empty">Загрузка...</div>
    }

    if (props.error) {
        return <div className="app__block chart_empty">{props.error}</div>
    }

    if (props.chartData) {
        return <>
            <div className="app__block chart" style={{height: chartHeight}}>
                <Line
                    options={chartOptions}
                    data={props.chartData}
                    ref={chartRef}
                />
            </div>
            <div ref={tooltipRef} className="custom-tooltip"/>
        </>
    }

    return <div className="app__block chart_empty">Здесь появится график</div>
}

export default Chart
