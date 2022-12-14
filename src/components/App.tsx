import * as React from 'react'
import {useEffect} from 'react'
import {
    CategoryScale,
    Chart as ChartJS,
    ChartData, ChartDataset, DefaultDataPoint,
    LinearScale,
    LineElement,
    PointElement,
    TimeScale,
    Tooltip
} from 'chart.js'
import {Line} from 'react-chartjs-2'
import DateRangePicker from '@wojtekmaj/react-daterange-picker'
import 'chartjs-adapter-moment'
import axios from "axios"
import * as moment from 'moment'
import 'moment/locale/ru'

moment.locale('ru')

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    TimeScale
)

export const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        x: {
            type: 'time' as const,
            time: {
                tooltipFormat: 'MM.DD.YYYY',
                unit: 'day' as const,
                displayFormats: {
                    day: 'DD.MM'
                }
            }
        },
        y: {
            type: 'linear' as const,
            max: 10,
            min: 0
        }
    }
}

const types = [
    {
        slug: 'stress',
        name: 'Тревога',
        color: 'pink',
        colorHex: '#fc83c6'
    },
    {
        slug: 'mood',
        name: 'Настроение',
        color: 'blue',
        colorHex: '#60cee9'
    },
    {
        slug: 'productivity',
        name: 'Продуктивность',
        color: 'darkblue',
        colorHex: '#6186fb'
    }
]

const defaultShowDays: number = 7

const statisticUrl: string = "https://catsbutton.herokuapp.com/api/users/getUsersByDate"

interface preparedStatisticsData {
    date: Date,
    stress: string,
    productivity: string,
    mood: string
}

declare global {
    interface Window {
        Telegram:any;
    }
}

function App() {
    const [userId, setUserId] = React.useState<number | null>(null)
    const [dateRange, setDateRange] = React.useState<Array<string | Date>>([
        new Date(Date.now() - defaultShowDays * 24 * 60 * 60 * 1000),
        new Date()
    ])
    const [selectedTypes, setSelectedTypes] = React.useState<Array<string>>(types.map(item => item.slug))
    const [statistic, setStatistic] = React.useState<preparedStatisticsData[]>([])
    const [chartData, setChartData] = React.useState<ChartData<'line'> | null>(null)
    const [error, setError] = React.useState<string | null>(null)
    const [loading, setLoading] = React.useState<boolean>(false)

    useEffect(() => {
        defineUser()
    }, [])

    useEffect(() => {
        if (statistic.length) {
            setChartData(prepareChartData(statistic, selectedTypes))
        } else {
            setChartData(null)
        }
    }, [statistic, selectedTypes])

    const defineUser = (): void => {
        let userId = getUserFromTelegram()
        if (!userId) {
            userId = getUserFromUrl()
        }

        if (userId) {
            setUserId(userId)
        } else {
            setError('Пользователь не найден')
        }
    }

    const getUserFromUrl = (): number | null => {
        const search: string = window.location.search
        const params: any = new URLSearchParams(search)

        if (!params.get('user')) {
            return null
        }
        return parseInt(params.get('user'))
    }

    const getUserFromTelegram = (): number | null => {
        if (typeof window.Telegram === 'undefined') {
            return null
        }
       const tg = window.Telegram.WebApp;
        if (!tg.initDataUnsafe.user) {
            return null
        }
       return tg.initDataUnsafe.user.id || null
    }

    const handleDateChange = (range: Array<string | Date>): void => {
        setDateRange(range)
    }

    const handleTypeChange = (type: string): void => {
        const position = selectedTypes.indexOf(type)
        if (position === -1) {
            setSelectedTypes([...selectedTypes, type])
        } else {
            setSelectedTypes(selectedTypes.filter(item => item !== type))
        }
    }

    const handleSubmit = () => {
        setError(null)
        if (!dateRange[0] || !dateRange[1]) {
            setError('Выберите даты')
        } else if (!userId) {
            setError('Пользователь не найден')
        } else {
            getStatistic()
        }
    }

    const prepareStatisticData = (data: { message: Array<any> }): preparedStatisticsData[] => {
        return data.message.map((item: preparedStatisticsData) => {
            return {
                "date": new Date(item.date),
                "stress": item.stress,
                "productivity": item.productivity,
                "mood": item.mood
            }
        })
    }

    const datesArray = (start: Date | string, end: Date | string): Array<Date> => {
        if (typeof start === 'string') {
            start = new Date(start)
        }
        if (typeof end === 'string') {
            end = new Date(end)
        }
        let result = [], current = new Date(start)
        while (current <= end)
            result.push(current) && (current = new Date(current)) && current.setDate(current.getDate() + 1)
        return result
    }

    const prepareChartData = (statistic: preparedStatisticsData[], selectedTypes: Array<string>): ChartData<'line'> => {
        const labels = datesArray(dateRange[0], dateRange[1])
        const datasets: ChartDataset<'line'>[] = types
            .filter(type => selectedTypes.includes(type.slug))
            .map(type => {
                const item: ChartDataset<'line'> = {
                    label: type.name,
                    borderColor: type.colorHex,
                    backgroundColor: type.colorHex,
                    data: statistic as DefaultDataPoint<any>,
                    parsing: {
                        xAxisKey: 'date' as const,
                        yAxisKey: type.slug
                    }
                }
                
                return item
            })

        return {
            labels,
            datasets
        }
    }

    const getStatistic = (): void => {
        setLoading(true)
        axios.post(statisticUrl, {
            "user_id": userId,
            "data_from": dateRange[0],
            "date_to": dateRange[1],
        }).then(response => {
            if (response.data.message.length) {
                setStatistic(prepareStatisticData(response.data))
            } else {
                setError('Статистики за период нет')
            }
        }).catch(err => {
            setError('Ошибка загрузки статистики')
        }).finally(() => {
            setLoading(false)
        })
    }

    const renderDateInput = () => {
        return <>
            <label htmlFor="filters__date-input" className="filters__label">
                Период
            </label>
            <div className="filters__date-input-wrap">
                <DateRangePicker
                    className={"filters__input filters__date-input"}
                    calendarIcon={null}
                    clearIcon={null}
                    showLeadingZeros={true}
                    onChange={(range) => handleDateChange(range as unknown as Array<string | Date>)}
                    value={dateRange}
                />
                <div className="filters__date-submit">
                    <div className="filters__date-submit-icon" onClick={() => handleSubmit()}>
                    </div>
                </div>
            </div>
        </>
    }

    const renderTypes = () => {
        return types.map(type => {
            const isActive = selectedTypes.indexOf(type.slug) !== -1
            return <div
                key={type.slug}
                className={`filters__types-item filters__types-item_${type.color} ${isActive ? 'filters__types-item_active' : ''}`}
                onClick={() => handleTypeChange(type.slug)}
            >
                {type.name}
            </div>
        })
    }

    const renderChart = () => {
        if (loading) {
            return <div className="app__block chart_empty">Загрузка...</div>
        }

        if (error) {
            return <div className="app__block chart_empty">{error}</div>
        }

        if (chartData) {
            return <div className="app__block chart">
                <Line options={chartOptions} data={chartData}/>
            </div>
        }

        return <div className="app__block chart_empty">Здесь появится график</div>
    }

    return (
        <div className="app">
            <div className="app__block filters">
                <div className="filters__date">
                    {renderDateInput()}
                </div>
                <div className="filters__types">
                    {renderTypes()}
                </div>
            </div>
            {renderChart()}
        </div>
    )
}

export default App
