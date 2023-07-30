import * as React from 'react'
import {useEffect} from 'react'
import {
    CategoryScale,
    Chart as ChartJS,
    ChartData,
    ChartDataset,
    DefaultDataPoint,
    LinearScale,
    LineElement,
    PointElement,
    TimeScale,
    Tooltip
} from 'chart.js'
import 'chartjs-adapter-moment'
import axios from "axios"
import moment from 'moment'
import 'moment/locale/ru'
import stc from 'string-to-color'
import Chart from './Chart'
import DateInput from './DateInput'
import slug from 'slug'
import TypesFilter from "./TypesFilter";

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

interface UserStatmentsObjectData {
    [key: string]: UserStatmentsData[]
}

interface UserStatmentsData {
    name: string,
    type_id: string,
    estimation: number
}

interface UserCustomStatmentsObjectData {
    [key: string]: UserCustomStatmentsData[]
}

interface UserCustomStatmentsData {
    name: string,
    costume_state_id: number,
    estimation: number
}

interface UserBinaryStatmentsObjectData {
    [key: string]: UserBinaryStatmentsData[]
}

interface UserBinaryStatmentsData {
    name: string,
    type_id: number,
    answer: boolean
}

interface StatisticsData {
    date: Date,
    type_id: string,
    estimation: number
}

interface NotesData {
    [key: string]: string[];
}

interface StatementTypesData {
    type_id: string,
    name: string,
    color: string,
    axis_type: string
}

interface NotesObjectData {
    [key: string]: Object[]
}

export interface TypesData {
    axis_type: string;
    id: string,
    name: string,
    color: string,
    show_line: boolean
}

declare global {
    interface Window {
        Telegram: any;
    }
}

const typeColors: { [key: string]: string } = {
    'Тревога': '#FE5667',
    'Настроение': '#FFE090',
    'Продуктивность': '#00B1BB',
    'Ясность сознания': '#40A6EB',
    'Агрессивность': '#FF9649',
    'Плаксивость': '#6F8FFE',
    'Либидо': '#FF60A8',
    'Энергия': '#5FCA77',
    'Общее состояние': '#D0F3A3'
}

const customTypesColors: string[] = [
    '#F7A2D5',
    '#CAB2D6',
    '#A6CEE3',
    '#FF828F',
    '#4ED0B9'
]

const binaryTypesColors: string[] = [
    '#EDCEF2',
    '#ACAFFF',
    '#82C3FF',
    '#FFD2C8',
    '#CDEBA7'
]

function App() {
    const [userId, setUserId] = React.useState<number | null>(null)
    const [dateRange, setDateRange] = React.useState<Array<string | Date>>([
        new Date(Date.now() - defaultShowDays * 24 * 60 * 60 * 1000),
        new Date()
    ])
    const [types, setTypes] = React.useState<TypesData[]>([])
    const [selectedTypes, setSelectedTypes] = React.useState<Array<string>>([])
    const [statistic, setStatistic] = React.useState<StatisticsData[]>([])
    const [notes, setNotes] = React.useState<NotesData>({})
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

    const prepareChartData = (statistic: StatisticsData[], selectedTypes: Array<string>): ChartData<'line'> => {
        const labels = datesArray(dateRange[0], dateRange[1])
        const datasets: ChartDataset<'line'>[] = types
            .filter(type => selectedTypes.includes(type.id))
            .map(type => {
                let data = statistic.filter(item => item['type_id'] === type.id) as DefaultDataPoint<any>
                const item: ChartDataset<'line'> = {
                    yAxisID: type.axis_type,
                    label: type.name,
                    borderColor: type.color,
                    backgroundColor: type.color,
                    tension: 0.4,
                    borderWidth: 2,
                    fill: false,
                    data: data,
                    pointBackgroundColor: (context) => {
                        const index: number = context.dataIndex
                        const value: any = context.dataset.data[index]
                        return type.axis_type.startsWith('binary') && value?.estimation === 0
                            ? '#ffffff'
                            : type.color
                    },
                    showLine: type.show_line,
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

    const prepareStatementsTypes = (statementTypes: StatementTypesData[]): TypesData[] => {
        return statementTypes
            .map(item => {
                return {
                    id: 'basic_' + item['type_id'],
                    name: item['name'],
                    color: typeColors[item['name']] || item.color || stc(item['name'] + ' pink!'),
                    axis_type: 'y',
                    show_line: true
                }
            })
    }

    const prepareCustomStatementsTypes = (statementTypes: string[]): TypesData[] => {
        return statementTypes
            .filter(item => item)
            .map((item, index) => {
                return {
                    id: 'custom_' + slug(item),
                    name: item,
                    color: customTypesColors[index] || stc(slug(item) + ' foo'),
                    axis_type: 'y',
                    show_line: true
                }
            })
    }

    const prepareBinaryStatementsTypes = (statementTypes: string[]): TypesData[] => {
        return statementTypes
            .filter(item => item)
            .map((item, index) => {
                return {
                    id: 'binary_' + slug(item),
                    name: item,
                    color: binaryTypesColors[index] || stc(slug(item) + ' bar'),
                    axis_type: 'binary_' + slug(item),
                    show_line: false
                }
            })
    }

    const prepareNotes = (notes: NotesObjectData): NotesData => {
        const result: NotesData = {}
        Object.entries(notes).forEach((entry) => {
            const [date, value] = entry;
            const dateStr: string = moment(date).format('YYYY-MM-DD')
            result[dateStr] = value.map((item: any) => item.note)
        })
        return result
    }

    const prepareStatistics = (userStatements: UserStatmentsObjectData): StatisticsData[] => {
        const result: StatisticsData[] = []
        Object.entries(userStatements).forEach((entry) => {
            const [date, value] = entry;
            value.filter(item => item.name).forEach(item => {
                result.push({
                    date: new Date(new Date(date).setHours(0,0,0,0)),
                    type_id: 'basic_' + item.type_id,
                    estimation: item.estimation
                })
            })
        })

        return result
    }

    const prepareCustomStatistics = (userStatements: UserCustomStatmentsObjectData): StatisticsData[] => {
        const result: StatisticsData[] = []
        Object.entries(userStatements).forEach((entry) => {
            const [date, value] = entry;
            value.filter(item => item.name).forEach(item => {
                result.push({
                    date: new Date(new Date(date).setHours(0,0,0,0)),
                    type_id: 'custom_' + slug(item.name),
                    estimation: item.estimation
                })
            })
        })

        return result
    }

    const prepareBinaryStatistics = (userStatements: UserBinaryStatmentsObjectData): StatisticsData[] => {
        const result: StatisticsData[] = []
        Object.entries(userStatements).forEach((entry) => {
            const [date, value] = entry;
            value.filter(item => item.name).forEach(item => {
                result.push({
                    date: new Date(new Date(date).setHours(0,0,0,0)),
                    type_id: 'binary_' + slug(item.name),
                    estimation: item.answer ? 1 : 0
                })
            })
        })

        return result
    }

    const prepareNoteStatistics = (notes: NotesObjectData): StatisticsData[] => {
        const result: StatisticsData[] = []
        Object.entries(notes).forEach((entry) => {
            const [date, value] = entry;
            result.push({
                date: new Date(new Date(date).setHours(0,0,0,0)),
                type_id: 'note',
                estimation: value.length,
            })
        })
        return result
    }

    const getStatistic = (): void => {
        setLoading(true)

        let urls: string[] = [
            "https://catsbutton.herokuapp.com/api/statements/",
            "https://catsbutton.herokuapp.com/api/costume-statements/",
            "https://catsbutton.herokuapp.com/api/binary-answers/",
            "https://catsbutton.herokuapp.com/api/dairy-notes/",
        ]

        axios.all(urls.map((endpoint) => axios.get(endpoint + userId, {
            params: {
                "date_from": moment(dateRange[0]).format('YYYY-MM-D'),
                "date_to": moment(dateRange[1]).format('YYYY-MM-D')
            }
        })))
            .then(axios.spread((statements, customStatements, binaryStatements, dairyNotes) => {

                let statementsTypes: TypesData[] = [];
                let userStatments: StatisticsData[] = [];

                if (Object.keys(statements.data).length) {
                    statementsTypes = statementsTypes.concat(prepareStatementsTypes(statements.data.statement_types))
                    userStatments = userStatments.concat(prepareStatistics(statements.data.user_statments))
                }

                if (Object.keys(customStatements.data).length) {
                    statementsTypes = statementsTypes.concat(prepareCustomStatementsTypes(customStatements.data.costume_statements_names))
                    userStatments = userStatments.concat(prepareCustomStatistics(customStatements.data.user_costume_statments))
                }

                if (Object.keys(binaryStatements.data).length) {
                    statementsTypes = statementsTypes.concat(prepareBinaryStatementsTypes(binaryStatements.data.binary_answer_names))
                    userStatments = userStatments.concat(prepareBinaryStatistics(binaryStatements.data.binary_answer))
                }

                if (Object.keys(dairyNotes.data).length) {
                    setNotes(prepareNotes(dairyNotes.data.notes))
                    statementsTypes = statementsTypes.concat([
                        {
                            id: 'note',
                            name: 'Заметки',
                            color: '#71aaeb',
                            axis_type: 'notes',
                            show_line: false
                        }
                    ])
                    userStatments = userStatments.concat(prepareNoteStatistics(dairyNotes.data.notes))
                }

                if (userStatments.length) {
                    const existingStatementTypes = statementsTypes
                        .filter(type => userStatments.map(statement => statement.type_id).includes(type.id))

                    setTypes(existingStatementTypes)
                    if (!selectedTypes.length) {
                        setSelectedTypes(existingStatementTypes.map(item => item.id))
                    }
                    setStatistic(userStatments)
                } else {
                    setError('Статистики за период нет')
                }
            }))
            .catch(err => {
                console.log('Error:', err)
                setError('Ошибка загрузки статистики')
            }).finally(() => {
            setLoading(false)
        })
    }

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
                <div className="filters__types-filter">
                    <TypesFilter
                        types={types}
                        selectedTypes={selectedTypes}
                        handleSelectedTypesChange={setSelectedTypes}
                    />
                </div>
            </div>
            <Chart
                loading={loading}
                error={error}
                chartData={chartData}
                notes={notes}
            />
        </div>
    )
}

export default App
