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
import 'chartjs-adapter-moment'
import axios from "axios"
import * as moment from 'moment'
import 'moment/locale/ru'
import stc from 'string-to-color'
import Chart from './Chart'
import DateInput from './DateInput'
import TypesInput, {TypesData} from './TypesInput'

moment.locale('ru')

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    TimeScale
)

const defaultShowDays: number = 7

const statisticUrl: string = "https://catsbutton.herokuapp.com/api/statements/"

interface UserStatmentsObjectData {
    [key: string]: UserStatmentsData[]
}

interface UserStatmentsData {
    name: string,
    type_id: number,
    estimation: number
}

interface StatisticsData {
    date: Date,
    type_id: number,
    estimation: number
}

interface VisibilitySettingsData {
    property_status: boolean,
    variable_id: number
}

interface StatementTypesData {
    type_id: number,
    name: string,
    color: string,
    is_binary: boolean
}

interface responseData {
    user_id: number,
    visibility_settings: VisibilitySettingsData[],
    date_from: string,
    date_to: string,
    user_statments: UserStatmentsObjectData,
    statement_types: StatementTypesData[]
}

declare global {
    interface Window {
        Telegram: any;
    }
}

function App() {
    const [userId, setUserId] = React.useState<number | null>(null)
    const [dateRange, setDateRange] = React.useState<Array<string | Date>>([
        new Date(Date.now() - defaultShowDays * 24 * 60 * 60 * 1000),
        new Date()
    ])
    const [types, setTypes] = React.useState<TypesData[]>([])
    const [selectedTypes, setSelectedTypes] = React.useState<Array<number>>([])
    const [statistic, setStatistic] = React.useState<StatisticsData[]>([])
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

    const prepareChartData = (statistic: StatisticsData[], selectedTypes: Array<number>): ChartData<'line'> => {
        const labels = datesArray(dateRange[0], dateRange[1])
        const datasets: ChartDataset<'line'>[] = types
            .filter(type => selectedTypes.includes(type.id))
            .map(type => {
                let data = statistic.filter(item => item['type_id'] === type.id) as DefaultDataPoint<any>
                if (type.is_binary) {
                    data = data.map(item => {
                        if (typeof item.estimation === 'number') {
                            item.estimation = item.estimation > 0 ? 'да' : 'нет'
                        }
                        return item
                    })
                }
                const item: ChartDataset<'line'> = {
                    yAxisID: type.is_binary ? `binary` : 'y',
                    label: type.name,
                    borderColor: type.color,
                    backgroundColor: type.color,
                    tension: 0.4,
                    data: data,
                    parsing: {
                        xAxisKey: 'date' as const,
                        yAxisKey: 'estimation' as const
                    },
                }
                return item
            })

        return {
            labels,
            datasets
        }
    }

    const prepareTypes = (statementTypes: StatementTypesData[], visibilitySettings: VisibilitySettingsData[]): TypesData[] => {
        const typesToShow = visibilitySettings
            .filter(item => item['property_status'])
            .map(item => item.variable_id)

        return statementTypes
            .filter(item => typesToShow.includes(item['type_id']))
            .map(item => {
                return {
                    id: item['type_id'],
                    name: item['name'],
                    color: item.color || stc(item['name'] + ' pink!'),
                    is_binary: 'is_binary' in item && item['is_binary']
                }
            })
    }

    const prepareStatistics = (userStatements: UserStatmentsObjectData): StatisticsData[] => {
        const result: StatisticsData[] = []
        Object.entries(userStatements).forEach((entry) => {
            const [date, value] = entry;
            value.forEach(item => {
                result.push({
                    date: new Date(date),
                    type_id: item.type_id,
                    estimation: item.estimation
                })
            })
        })

        return result
    }

    const setStatisticFromResponse = (response: responseData) => {
        setTypes(prepareTypes(response.statement_types, response.visibility_settings))
        setSelectedTypes(types.map(item => item.id))
        setStatistic(prepareStatistics(response.user_statments))
    }

    const getStatistic = (): void => {
        //const fakeDataJson = '{"user_id": 352348067, "visibility_settings": [{"variable_id": 1, "property_status": true},{"variable_id": 4, "property_status": true},{"variable_id": 3, "property_status": true}], "date_from": "2022-01-13", "date_to": "2023-12-08", "user_statments": {"2022-11-14": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2022-11-15": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2022-11-16": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}], "2022-11-17": [{"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-09": [{"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-10": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 6}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 0}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-11": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}], "2023-01-12": [{"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-13": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 0}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 6}], "2023-01-14": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 5}], "2023-01-15": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 6}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 6}], "2023-01-16": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 8}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-17": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 6}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-18": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 6}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}], "2023-01-19": [{"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-20": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-21": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 6}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 0}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 6}], "2023-01-22": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 0}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 6}], "2023-01-23": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-24": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 6}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 0}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 6}], "2023-01-25": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 8}], "2023-01-26": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-27": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 8}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 0}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-28": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}], "2023-01-29": [{"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-30": [{"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 6}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 6}], "2023-01-31": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-02-01": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 6}], "2023-02-02": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 8}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 0}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 8}], "2023-02-03": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 8}], "2023-02-04": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 8}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-02-05": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}], "2023-02-06": [{"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}], "2023-02-07": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 6}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 8}], "2023-02-08": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 8}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 0}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 8}], "2023-02-09": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 6}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 0}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-02-10": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 0}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-02-11": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 6}], "2023-02-12": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 0}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-02-13": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-02-14": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 6}], "2023-02-15": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-02-16": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-02-17": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 0}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-02-18": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}], "2023-02-19": [{"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 0}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}]}, "statement_types": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "color": "#FFD873"}, {"type_id": 2, "name": "\u041b\u0438\u0431\u0438\u0434\u043e", "color": "#FF60A8"}, {"type_id": 3, "is_binary": true, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "color": "#00B1BB"}, {"type_id": 4, "is_binary": true, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "color": "#FE5667"}, {"type_id": 5, "name": "\u042f\u0441\u043d\u043e\u0441\u0442\u044c \u0441\u043e\u0437\u043d\u0430\u043d\u0438\u044f", "color": "#40A6EB"}, {"type_id": 6, "name": "\u042d\u043d\u0435\u0440\u0433\u0438\u044f", "color": "#5FCA77"}, {"type_id": 7, "name": "\u041f\u043b\u0430\u043a\u0441\u0438\u0432\u043e\u0441\u0442\u044c", "color": "#6184FE"}, {"type_id": 8, "name": "\u0410\u0433\u0440\u0435\u0441\u0441\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "color": "#FF7049"}, {"type_id": 9, "name": "\u041e\u0431\u0449\u0435\u0435 \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435", "color": "#F2D4CC"}]}'
        // const fakeDataJson = '{"user_id": 352348067, "visibility_settings": [{"variable_id": 1, "property_status": true}, {"variable_id": 2, "property_status": true}, {"variable_id": 3, "property_status": true}, {"variable_id": 4, "property_status": true}, {"variable_id": 5, "property_status": true}, {"variable_id": 6, "property_status": true}, {"variable_id": 7, "property_status": true}, {"variable_id": 8, "property_status": true}, {"variable_id": 9, "property_status": true}], "date_from": "2022-12-31T23:00:00.000Z", "date_to": "2023-01-31T22:59:59.999Z", "user_statments": {"2023-01-09": [{"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-10": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 6}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 2}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-11": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}], "2023-01-12": [{"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-13": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 6}], "2023-01-14": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 5}], "2023-01-15": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 6}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 6}], "2023-01-16": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 8}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-17": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 6}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-18": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 6}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}], "2023-01-19": [{"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-20": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-21": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 6}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 2}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 6}], "2023-01-22": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 2}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 6}], "2023-01-23": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-24": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 6}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 6}], "2023-01-25": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 8}], "2023-01-26": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-27": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 8}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 2}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-28": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}], "2023-01-29": [{"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}], "2023-01-30": [{"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 6}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 6}], "2023-01-31": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "estimation": 7}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "estimation": 1}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "estimation": 7}]}, "statement_types": [{"type_id": 1, "name": "\u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435", "color": "#FFD873"}, {"type_id": 2, "name": "\u041b\u0438\u0431\u0438\u0434\u043e", "color": "#FF60A8"}, {"type_id": 3, "name": "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "color": "#00B1BB"}, {"type_id": 4, "name": "\u0422\u0440\u0435\u0432\u043e\u0433\u0430", "color": "#FE5667"}, {"type_id": 5, "name": "\u042f\u0441\u043d\u043e\u0441\u0442\u044c \u0441\u043e\u0437\u043d\u0430\u043d\u0438\u044f", "color": "#40A6EB"}, {"type_id": 6, "name": "\u042d\u043d\u0435\u0440\u0433\u0438\u044f", "color": "#5FCA77"}, {"type_id": 7, "name": "\u041f\u043b\u0430\u043a\u0441\u0438\u0432\u043e\u0441\u0442\u044c", "color": "#6184FE"}, {"type_id": 8, "name": "\u0410\u0433\u0440\u0435\u0441\u0441\u0438\u0432\u043d\u043e\u0441\u0442\u044c", "color": "#FF7049"}, {"type_id": 9, "name": "\u041e\u0431\u0449\u0435\u0435 \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435", "color": "#F2D4CC"}]}\n'
        // const fakeData = JSON.parse(fakeDataJson)
        //
        // fakeData.user_statments = Object.keys(fakeData.user_statments)
        //     .filter((key) => {
        //         const date = new Date(key)
        //         return date >= new Date(dateRange[0]) && date <= new Date(dateRange[1])
        //     })
        //     .reduce((cur, key) => {
        //         return Object.assign(cur, {[key]: fakeData.user_statments[key]})
        //     }, {});

        setLoading(true)
        axios.get(statisticUrl + userId, {
            params: {
                "date_from": dateRange[0],
                "date_to": dateRange[1]
            }
        }).then(response => {
            console.log(111,response.data)
            if (response.data.length) {
                setStatisticFromResponse(response.data)
            } else {
                setError('Статистики за период нет')
            }
        }).catch(err => {
            //setStatisticFromResponse(fakeData)
            setError('Ошибка загрузки статистики')
        }).finally(() => {
            setLoading(false)
        })
    }

    const handleSelectedTypesChange = (value: ReadonlyArray<TypesData>) => {
        setSelectedTypes(value.map(item => item.id));
    };

    return (
        <div className="app">
            <div className="app__block filters">
                <div className="filters__date">
                    <DateInput
                        dateRange={dateRange}
                        handleDateChange={handleDateChange}
                        handleSubmit={handleSubmit}
                    />
                </div>
                <div className="filters__types">
                    <TypesInput
                        types={types}
                        selectedTypes={selectedTypes}
                        handleSelectedTypesChange={handleSelectedTypesChange}
                    />
                </div>
            </div>
            <Chart
                loading={loading}
                error={error}
                chartData={chartData}
            />
        </div>
    )
}

export default App
