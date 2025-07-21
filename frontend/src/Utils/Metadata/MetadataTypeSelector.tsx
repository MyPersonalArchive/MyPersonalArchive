import { ICommand, MetadataType } from "./types";


type MetadataTypeSelectorProps = {
    selectedMetadataTypes: Set<string>
    allMetadataTypes: MetadataType[]
    dispatch: (command: ICommand) => void
}

export const MetadataTypeSelector = ({selectedMetadataTypes, allMetadataTypes, dispatch,}: MetadataTypeSelectorProps) => {
    return (
        <>
            Include metadata for
            &nbsp;
            {
                allMetadataTypes
                    .filter(({ path }) => typeof path === "string")
                    .map(({ displayName, path }) => (
                        <label key={displayName}>
                            <input
                                type="checkbox"
                                id={displayName}
                                checked={selectedMetadataTypes.has(path as string)}
                                onChange={() => {
                                    dispatch({ action: "TOGGLE_METADATA_TYPE", type: path })
                                }}
                            />
                            &nbsp;&nbsp;{displayName}&nbsp;&nbsp;
                        </label>
                    ))
            }
        </>
    )
}