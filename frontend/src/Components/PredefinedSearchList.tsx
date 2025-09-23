import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useMemo, useState } from "react";
import { useApiClient } from "../Utils/useApiClient";
import { useNavigate } from "react-router-dom";
import { createQueryString } from "../Utils/createQueryString";
import { faTag } from "@fortawesome/free-solid-svg-icons";
import "../assets/labelList.css"
import { PredefinedSearch, predefinedSearchesAtom } from "../Utils/Atoms";
import { useAtom, useAtomValue } from "jotai";



export type Orientation = "vertical" | "horizontal";

type PredefinedSearchListProps = {
    orientation: Orientation
    maxVisible: number
}

export const PredefinedSearchList = ({ orientation, maxVisible }: PredefinedSearchListProps) => {
    const [maxVisibleItems, setMaxVisibleItems] = useState(maxVisible)
    const navigate = useNavigate()

    const predefinedSearches = useAtomValue(predefinedSearchesAtom)
    
      const selectSearch = (search: PredefinedSearch) => {
          navigate({
              search: createQueryString({ 
                title: search.title, 
                tags: search.tags.map(tag => tag.trim()),
                metadataTypes: search.metadataTypes 
            }, { skipEmptyStrings: true })
          })
      }

      const displayed = predefinedSearches.length > maxVisibleItems
    ? predefinedSearches.slice(0, maxVisibleItems)
    : predefinedSearches

    return (
        <>
            <div
                className={`label-list ${orientation}`}
                role="list"
                aria-orientation={orientation === "vertical" ? "vertical" : "horizontal"}
                >
                {displayed.map((search, idx) => (
                    <div className="item" key={search.id}>
                        <div
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
    
                {predefinedSearches.length > maxVisibleItems && (
                    <button className="item collapsed" 
                    onClick={() => setMaxVisibleItems(predefinedSearches.length)}
                    aria-hidden>+{predefinedSearches.length - maxVisibleItems} more</button>
                )}
            </div>
        </>
    )
}