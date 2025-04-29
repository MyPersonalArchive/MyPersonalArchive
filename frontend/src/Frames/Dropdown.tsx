// Dropdown.tsx
import React, { useState, useEffect, useRef } from 'react'
import './Dropdown.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCaretDown } from '@fortawesome/free-solid-svg-icons'

type DropdownLink = {
    type: "link"
    label: React.ReactNode
    link: string
}
type DropdownButton = {
    type: "button"
    label: string
    onClick: () => void
}
type InactiveElement = {
    type: "inactive"
    label: string
}
type DropdownSeperator = {
    type: "seperator"
}

export type DropdownItem = DropdownLink | DropdownButton | InactiveElement | DropdownSeperator

type DropdownProps = {
    header: React.ReactNode
    items: DropdownItem[]
}

export const Dropdown = ({ header, items }: DropdownProps) => {
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Handle clicks outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        };

        document.addEventListener("mousedown", handleClickOutside)

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        };
    }, []);

    const toggleDropdown = () => setIsOpen(!isOpen)

    return (
        <div className="dropdown" ref={dropdownRef}>
            <button className="dropdown-button" onClick={toggleDropdown}>
                {header}
                <span className="spacer-1ex" />
                <FontAwesomeIcon icon={faCaretDown} className="dimmed" />
            </button>
            {isOpen &&
                <div className="dropdown-content">
                    {items.map((item, index) => {
                        switch (item.type) {
                            case "link":
                                return <a className="active dropdown-item"  href={item.link} key={index} onClick={() => setIsOpen(false)}>{item.label}</a>

                            case "button":
                                return <button className="active dropdown-item" key={index} onClick={() => { item.onClick(); setIsOpen(false) }}>
                                    {item.label}
                                </button>

                            case "inactive":
                                return <div className="dropdown-item" key={index}>{item.label}</div>

                            case "seperator":
                                return <div className="horizontal-line" key={index}></div>
                        }
                    })}
                </div>
            }
        </div>
    )
}
