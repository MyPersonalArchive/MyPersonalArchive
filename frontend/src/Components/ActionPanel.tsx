import { UnallocatedBlob } from "../Utils/Atoms"
import { Selection, SelectCheckbox } from "../Pages/useSelection"

type ActionPanelProps = React.PropsWithChildren & {
    blob: UnallocatedBlob
    selection: Selection<number>
}
export const ActionPanel = ({ blob, selection, children }: ActionPanelProps) => {
    return (
        <div style={{ display: "flex", flexDirection: "column", padding: "0 10px", justifyContent: "space-between", height: "100%" }}>
            <SelectCheckbox selection={selection} item={blob.id} />
            <div>
                {children}
            </div>
        </div>
    )
}
