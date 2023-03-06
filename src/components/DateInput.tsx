import * as React from "react";
import DateRangePicker from "@wojtekmaj/react-daterange-picker";

interface DateInputProps {
    dateRange: Array<string | Date>,
    handleDateChange: (params: Array<string | Date>) => void,
    handleSubmit: () => void

}

function DateInput(props: DateInputProps) {
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
                format={"dd.MM.y"}
                onChange={(range) => props.handleDateChange(range as unknown as Array<string | Date>)}
                value={props.dateRange}
            />
            <div className="filters__date-submit">
                <div className="filters__date-submit-icon" onClick={() => props.handleSubmit()}>
                </div>
            </div>
        </div>
    </>
}

export default DateInput