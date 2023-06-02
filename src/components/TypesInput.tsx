import * as React from "react";
import Select, {StylesConfig} from "react-select";
import chroma from 'chroma-js';
import stc from "string-to-color";
import {TypesData} from "./App";

interface TypesInputProps {
    types: TypesData[],
    selectedTypes: Array<string>
    handleSelectedTypesChange: (params: any) => any,
}

const colourStyles: StylesConfig<TypesData, true> = {
    control: (styles) => ({...styles, backgroundColor: 'white', boxShadow: 'none'}),
    option: (styles, {data, isDisabled, isFocused, isSelected}) => {
        const color = chroma.valid(data.color) ? chroma(data.color) : chroma(stc(data.color));
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
        const color = chroma.valid(data.color) ? chroma(data.color) : chroma(stc(data.color));
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
        getOptionLabel={(item: TypesData) => item.name}
        getOptionValue={(item: TypesData) => item.id.toString()}
        options={props.types}
        value={props.types.filter(item => props.selectedTypes.includes(item.id))}
        isClearable={false}
        backspaceRemovesValue={true}
        isSearchable={false}
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