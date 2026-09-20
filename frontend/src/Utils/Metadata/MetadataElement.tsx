import React from "react"
import { ICommand, MetadataType } from "./types"


type Props = {
    metadataType: MetadataType
    metadata: Record<string, any>
    dispatch: (command: ICommand) => void
}
export const MetadataElement = ({ metadataType, metadata, dispatch }: Props) => {
	return (
		React.createElement(metadataType.component, { state: metadata[metadataType.path as string], dispatch })
	)
}