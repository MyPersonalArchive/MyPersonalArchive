// Dropdown.tsx
import React, { useState, useEffect, useRef } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCaretDown } from "@fortawesome/free-solid-svg-icons"

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
		}

		document.addEventListener("mousedown", handleClickOutside)

		return () => {
			document.removeEventListener("mousedown", handleClickOutside)
		}
	}, [])

	const toggleDropdown = () => setIsOpen(!isOpen)

	return (
		<div className="relative" ref={dropdownRef}>
			<button onClick={toggleDropdown}>
				{header}
				<FontAwesomeIcon icon={faCaretDown} className="text-current/50 ml-1" />
			</button>
			{isOpen &&
				<div className="absolute bg-gray-50 shadow-lg border-l border-b border-r border-gray-200 rounded-b mt-3">
					{items.map((item, index) => {
						switch (item.type) {
							case "link":
								return <a className="text-black py-2 px-4 block w-full border-none hover:bg-gray-200 transition-colors duration-300 cursor-pointer"
									href={item.link}
									key={index}
									onClick={() => setIsOpen(false)}
								>
									{item.label}
								</a>

							case "button":
								return <button className="text-black py-2 px-4 block w-full border-none hover:bg-gray-200 transition-colors duration-300 cursor-pointer"
									key={index}
									onClick={() => { item.onClick(); setIsOpen(false) }}
								>
									{item.label}
								</button>

							case "inactive":
								return <div className="text-gray-400 py-2 px-4 block w-full border-none"
									key={index}
								>
									{item.label}
								</div>

							case "seperator":
								return <div className="horizontal-line" key={index}></div>
						}
					})}
				</div>
			}
		</div>
	)
}
