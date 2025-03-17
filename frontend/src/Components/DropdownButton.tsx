import { useEffect, useRef, useState } from "react";
import "./DropdownButton.scss";
import { IconDefinition } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";

export type DropdownButtonProps = {
    options: {name: string, callback: () => void, icon: IconDefinition}[]
    disabled?: boolean
}

export const DropdownButton = ({ options, disabled }: DropdownButtonProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownMenuRef = useRef<HTMLUListElement>(null)
    const dropdownToggleRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        const handleDocumentClick = (event: any) => {
            if (
                dropdownMenuRef.current &&
                !dropdownMenuRef.current.contains(event.target) &&
                !dropdownToggleRef.current?.contains(event.target) // Use optional chaining operator
            ) {
              handleClose()
            }
          }
      
          document.addEventListener("click", handleDocumentClick)
      
          return () => {
            document.removeEventListener("click", handleDocumentClick)
          }
      }, [])

    const handleToggle = () => {
      setIsOpen(!isOpen)
    }

    const handleClose = () => {
        setIsOpen(false)
      }

    const onCallback = (callback: () => void) => {
        setIsOpen(false)
        callback()
    }
  
    return (
      <div className="dropdown">
        <button className="dropdown-button" 
        disabled={disabled}
        ref={dropdownToggleRef}
        onClick={handleToggle}>
          <FontAwesomeIcon icon={faChevronDown} size="1x" />
        </button>
        
        {isOpen && (
          <ul className="dropdown-menu dropdown-menu-right"
          ref={dropdownMenuRef}>
            {options.map((option, index) => (
            <li key={index} onClick={() => onCallback(option.callback)}>
              <span style={{marginRight: "10px"}}><FontAwesomeIcon icon={option.icon} size="1x" /></span>
              {option.name}
            </li>
          ))}
          </ul>
        )}
      </div>
    )
  }