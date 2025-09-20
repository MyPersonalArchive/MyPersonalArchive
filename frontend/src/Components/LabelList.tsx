import React, { useEffect, useRef, useState } from "react";
import { useApiClient } from "../Utils/useApiClient";
import { useNavigate } from "react-router-dom";
import { createQueryString } from "../Utils/createQueryString";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTag } from "@fortawesome/free-solid-svg-icons";
import { Dropdown } from "../Frames/Dropdown";
import { useAtomValue } from "jotai";
import { labelsAtom } from "../Utils/Atoms";
import "../assets/labelList.css"

export type LabelItem = {
  id: number
  title: string
}

export type Orientation = "vertical" | "horizontal";

type Props = {
    orientation?: Orientation
    maxVisible: number
}

export default function LabelList({
  orientation = "vertical",
  maxVisible,
}: Props) {
    
  const [items, setItems] = useState<LabelItem[]>([])
  const [maxVisibleItems, setMaxVisibleItems] = useState(maxVisible)
  const dragIndexRef = useRef<number | null>(null)
  const apiClient = useApiClient()
  const navigate = useNavigate()

  const allLabels = useAtomValue(labelsAtom)

  useEffect(() => {
    setItems(allLabels)
  }, [allLabels])



  const startDrag = (e: React.DragEvent, index: number) =>{
    dragIndexRef.current = index
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", items[index].id.toString()); // for Firefox
    (e.currentTarget as HTMLElement).classList.add("dragging")
  }

  const endDrag = (e: React.DragEvent) => {
    dragIndexRef.current = null;
    (e.currentTarget as HTMLElement).classList.remove("dragging")
  }

  const dragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    (e.currentTarget as HTMLElement).classList.add("drag-over");
  }

  const dragLeave = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove("drag-over");
  }

  const drop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove("drag-over");

    let fromIndex = dragIndexRef.current;
    if (fromIndex == null) {
      const id = e.dataTransfer.getData("text/plain");
      fromIndex = items.findIndex(i => i.id.toString() === id);
      if (fromIndex === -1) return;
    }
    if (fromIndex === toIndex) return;

    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);

    // After removal, decide insertion index in the new array:
    // If the moved item came before the target, the target's index already
    // refers to the correct place in the shortened array, so insert at toIndex.
    // Clamp to the array length to allow dropping onto the last item.
    const insertAt = Math.min(Math.max(0, toIndex), next.length);
    next.splice(insertAt, 0, moved);

    setItems(next);
    dragIndexRef.current = null;
}

  const selectLabel = (label: LabelItem) => {
      navigate({
          search: createQueryString({ label: label.title }, { skipEmptyStrings: true })
      })
  }

  const editLabel = (label: LabelItem) => {
      
  }

  const deleteLabel = (label: LabelItem) => {
      apiClient.delete("/api/label/delete", {
        title: label.title
      })
  }

  const displayed = items.length > maxVisibleItems
    ? items.slice(0, maxVisibleItems)
    : items

  return (
    <div>
        <div className="flex flex-row">
            <div>Labels</div>
        </div>
        <div
            className={`label-list ${orientation}`}
            role="list"
            aria-orientation={orientation === "vertical" ? "vertical" : "horizontal"}
            >
            {displayed.map((label, idx) => (
              <div className="item">
                <div
                    key={label.id}
                    role="listitem"
                    tabIndex={0}
                    draggable
                    onDragStart={(e) => startDrag(e, idx)}
                    onDragEnd={endDrag}
                    onDragOver={dragOver}
                    onDragLeave={dragLeave}
                    onDrop={(e) => drop(e, idx)}
                    onClick={() => selectLabel(label)}
                    title={label.title}
                    aria-label={label.title}
                    >
                    <FontAwesomeIcon icon={faTag} className="mr-1" color="gray"/>
                    <span className="text">{label.title}</span>
                    
                </div>
                    <Dropdown
                          header={<>
                              
                          </>}
                          items={[
                              { type: "button", label: "Edit", onClick: () => editLabel(label) },
                              { type: "button", label: "Delete", onClick: () => deleteLabel(label) },
                          ]}
                      />
                </div>
            ))}

            {items.length > maxVisibleItems && (
                <button className="item collapsed" 
                onClick={() => setMaxVisibleItems(items.length)}
                aria-hidden>+{items.length - maxVisibleItems} more</button>
            )}
        </div>
    </div>
    
  );
}
