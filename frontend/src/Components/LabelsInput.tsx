import { useState } from "react"
import { DialogContent, DialogFooter, DialogHeader, ModalDialog } from "./ModelDialog"
import { useApiClient } from "../Utils/useApiClient"
import { LabelItem } from "./LabelList"

 type LabelsInputProps = {
    labels: LabelItem[]
    currentLabel?: string
    onChange: (label: string) => void
}

export const LabelsInput = ({ labels, currentLabel, onChange }: LabelsInputProps) => {
    const [isLabelCreateOpen, setIsLabelCreateOpen] = useState(false)
    const [labelName, setLabelName] = useState<string>("")
    const apiClient = useApiClient()

    const createLabel = () => {
        apiClient.post<LabelItem>("/api/label/create", {
            title: labelName
        })
        setIsLabelCreateOpen(false)
    }

    return (
        <div>
            <select onChange={e => onChange(e.target.value)}>
                <option value="">-- Select a label --</option>
                {labels.map(label => (
                    <option key={label.id} defaultValue={currentLabel} selected={label.title == currentLabel}>{label.title}</option>
                ))}
            </select>
            <button className="btn ml-2" onClick={(e) => { e.preventDefault(); setIsLabelCreateOpen(true) }}>+</button>
            {isLabelCreateOpen &&
                <ModalDialog onClose={() => { setIsLabelCreateOpen(false) } }>
                <DialogHeader>
                    <div>
                        Create a new label
                    </div>
                </DialogHeader>
                <DialogContent>
                    <div className="flex flex-col gap-2">
                    <span>Label name</span>
                    <input className="input" type="text" onChange={e => setLabelName(e.target.value)}/>
                    </div>
                </DialogContent>
                <DialogFooter>
                    <div className="flex flex-row gap-2">
                        <button className="btn" onClick={() => { setIsLabelCreateOpen(false) }}>Cancel</button>
                        <button className="btn" onClick={createLabel}>Create</button>
                    </div>
                </DialogFooter>
                </ModalDialog>
            }
        </div>
    )
}