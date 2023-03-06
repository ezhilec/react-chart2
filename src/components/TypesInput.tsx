import * as React from "react";
import Select, {StylesConfig} from "react-select";
import chroma from 'chroma-js';

export interface TypesData {
    is_binary: boolean;
    id: number,
    name: string,
    color: string
}

interface TypesInputProps {
    types: TypesData[],
    selectedTypes: Array<number>
    handleSelectedTypesChange: (params: any) => any,

}

const colourStyles: StylesConfig<TypesData, true> = {
    control: (styles) => ({...styles, backgroundColor: 'white'}),
    option: (styles, {data, isDisabled, isFocused, isSelected}) => {
        const color = chroma(data.color);
        return {
            ...styles,
            backgroundColor: isDisabled
                ? undefined
                : isSelected
                    ? data.color
                    : isFocused
                        ? color.alpha(0.1).css()
                        : undefined,
            color: isDisabled
                ? '#ccc'
                : isSelected
                    ? chroma.contrast(color, 'white') > 2
                        ? 'white'
                        : 'black'
                    : data.color,
            cursor: isDisabled ? 'not-allowed' : 'default',

            ':active': {
                ...styles[':active'],
                backgroundColor: !isDisabled
                    ? isSelected
                        ? data.color
                        : color.alpha(0.3).css()
                    : undefined,
            },
        };
    },
    multiValue: (styles, {data}) => {
        const color = chroma(data.color);
        return {
            ...styles,
            backgroundColor: color.alpha(0.1).css(),
            borderColor: color.css(),
        };
    },
    multiValueLabel: (styles, {data}) => ({
        ...styles,
        color: data.color,
    }),
    multiValueRemove: (styles, {data}) => ({
        ...styles,
        color: data.color,
        ':hover': {
            backgroundColor: data.color,
            color: 'white',
        },
    }),
}

function TypesInput(props: TypesInputProps) {
    if (!props.types.length) {
        return <div></div>
    }

    return <Select
        isMulti={true}
        onChange={props.handleSelectedTypesChange}
        getOptionLabel={(vehicle: TypesData) => vehicle.name}
        getOptionValue={(vehicle: TypesData) => vehicle.id.toString()}
        options={props.types}
        value={props.types.filter(item => props.selectedTypes.includes(item.id))}
        isClearable={false}
        backspaceRemovesValue={true}
        styles={colourStyles}
        classNames={{
            control: () => 'filters__input filters__types',
            multiValue: () => 'filters__types-item'
        }}
        placeholder='Что показать?'
        noOptionsMessage={() => 'Пусто'}
    />
}

export default TypesInput