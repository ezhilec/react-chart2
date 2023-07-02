import * as React from "react";
import {TypesData} from "./App";
import {useRef, useState} from "react";

interface TypesFilterProps {
    types: TypesData[],
    selectedTypes: Array<string>
    handleSelectedTypesChange: (params: any) => any,
}

function TypesFilter(props: TypesFilterProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isScrolling, setIsScrolling] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollX, setScrollX] = useState(0);
    const [scrollXLastMove, setScrollXLastMove] = useState(0);

    const onMouseDown = (e: any) => {
        if (ref.current) {
            setIsScrolling(true);
            setStartX(e.pageX - ref.current.offsetLeft);
            setScrollX(ref.current.scrollLeft);
            setScrollXLastMove(ref.current.scrollLeft);
        }
    };

    const onMouseLeave = () => {
        setIsScrolling(false);
        if (ref.current) {
            setScrollXLastMove(Math.abs(scrollXLastMove - ref.current.scrollLeft));
        }
    };

    const onMouseUp = () => {
        setIsScrolling(false);
        if (ref.current) {
            setScrollXLastMove(Math.abs(scrollXLastMove - ref.current.scrollLeft));
        }
    };

    const onMouseMove = (e: any) => {
        if (isScrolling && ref.current) {
            e.preventDefault()
            const x = e.pageX - ref.current.offsetLeft;
            const fastCoefficient = 1;
            const walk = (x - startX) * fastCoefficient;
            ref.current.scrollLeft = scrollX - walk;
        }
    };

    if (!props.types.length) {
        return <div></div>
    }

    const handleTypeChange = (type: TypesData): void => {
        if (scrollXLastMove > 10) {
            return
        }
        if (props.selectedTypes.indexOf(type.id) === -1) {
            props.handleSelectedTypesChange([...props.selectedTypes, type.id])
        } else {
            props.handleSelectedTypesChange(props.selectedTypes.filter(item => item !== type.id))
        }
    }

    const items = props.types.map(type => {
        const isActive = props.selectedTypes.indexOf(type.id) !== -1
        return <div
            key={type.id}
            className={`filters__types-filter-item ${isActive ? 'filters__types-filter-item_active' : ''}`}
            style={{
                color: type.color,
            }}
            onClick={() => handleTypeChange(type)}
        >
            <span>{type.name}</span>
        </div>
    })

    return <div className={`filters__types-filter-scroll ${isScrolling ? 'filters__types-filter-scroll_active' : ''}`}
                ref={ref}
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                onMouseMove={onMouseMove}
                onMouseLeave={onMouseLeave}
                onTouchStart={onMouseDown}
                onTouchEnd={onMouseUp}
                onTouchMove={onMouseMove}
                onTouchCancel={onMouseLeave}
        >
        <div className={'filters__types-filter-wrapper'}>
            {items}
        </div>
    </div>
}

export default TypesFilter