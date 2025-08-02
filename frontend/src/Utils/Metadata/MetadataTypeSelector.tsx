import { ICommand, MetadataType } from "./types";


type MetadataTypeSelectorProps = {
    selectedMetadataTypes: Set<string>
    allMetadataTypes: MetadataType[]
    dispatch: (command: ICommand) => void
}

export const MetadataTypeSelector = ({selectedMetadataTypes, allMetadataTypes, dispatch,}: MetadataTypeSelectorProps) => {
    return (
        <div className="flex flex-row gap-2 my-2">
            Include metadata for
            &nbsp;
            {
                allMetadataTypes
                    .filter(({ path }) => typeof path === "string")
                    .map(({ displayName, path }) => (
                        <label key={displayName} >
                            <input
                            className="mr-2.5"
                                type="checkbox"
                                id={displayName}
                                checked={selectedMetadataTypes.has(path as string)}
                                onChange={() => {
                                    dispatch({ action: "TOGGLE_METADATA_TYPE", type: path })
                                }}
                            />
                            {displayName}
                        </label>
                    ))
            }
        </div>
    )
}