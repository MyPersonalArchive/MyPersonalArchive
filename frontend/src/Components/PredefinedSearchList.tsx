import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useMemo, useState } from "react";
import { useApiClient } from "../Utils/useApiClient";
import { useNavigate } from "react-router-dom";
import { createQueryString } from "../Utils/createQueryString";
import { faTag } from "@fortawesome/free-solid-svg-icons";
import "../assets/labelList.css"

type PredefinedSearch = {
    id: number
    name: string
    title: string
    metadataTypes: string[]
    tags: string[]
}

export type Orientation = "vertical" | "horizontal";

type PredefinedSearchListProps = {
    orientation: Orientation
    maxVisible: number
}

export const PredefinedSearchList = ({ orientation, maxVisible }: PredefinedSearchListProps) => {
    const [items, setItems] = useState<PredefinedSearch[]>([])
    const [maxVisibleItems, setMaxVisibleItems] = useState(maxVisible)
    const apiClient = useApiClient()
    const navigate = useNavigate()

    const getPredefinedSearches = () => {
        return [
            {
                id: 0,
                name: "Kvittering",
                title: "",
                tags: [],
                metadataTypes: ["receipt"]
            },
            {
                id: 1,
                name: "Markus skole",
                title: "",
                tags: ["Markus", "Skole"],
                metadataTypes: []
            },
            {
                id: 2,
                name: "Barnevernet",
                title: "",
                tags: ["Barnevern"],
                metadataTypes: []
            }
        ]
    }

      const selectSearch = (search: PredefinedSearch) => {
          navigate({
              search: createQueryString({ 
                title: search.title, 
                tags: search.tags.map(tag => tag.trim()),
                metadataTypes: search.metadataTypes 
            }, { skipEmptyStrings: true })
          })
      }

    useEffect(() => {
        setItems(getPredefinedSearches())
    }, [])

      const displayed = items.length > maxVisibleItems
    ? items.slice(0, maxVisibleItems)
    : items

    return (
        <>
            <div
                className={`label-list ${orientation}`}
                role="list"
                aria-orientation={orientation === "vertical" ? "vertical" : "horizontal"}
                >
                {displayed.map((search, idx) => (
                    <div className="item">
                        <div
                            key={search.id}
                            role="listitem"
                            tabIndex={0}
                            // draggable
                            onClick={() => selectSearch(search)}
                            // title={search.name}
                            >
                            <FontAwesomeIcon icon={faTag} className="mr-1" color="gray"/>
                            <span className="text">{search.name}</span>
                        </div>
                    </div>
                    
                ))}
    
                {items.length > maxVisibleItems && (
                    <button className="item collapsed" 
                    onClick={() => setMaxVisibleItems(items.length)}
                    aria-hidden>+{items.length - maxVisibleItems} more</button>
                )}
            </div>
        </>
    )
}