import { MetadataType } from "../../Utils/Metadata/types"
import { MetadataControlPath } from "../../Utils/Metadata/metadataControlReducer"
import { MetadataElement } from "../../Utils/Metadata/MetadataElement"
import { ICommand, ReducerIdentifier } from "../../Utils/Metadata/types"


type MetadataSectionProps = {
	metadataType: MetadataType
	metadata: Record<string, any>
	dispatch: (path: ReducerIdentifier) => (command: ICommand) => void
	initiallyOpen?: boolean
}
export const MetadataSection = ({ metadataType, metadata, dispatch, initiallyOpen }: MetadataSectionProps) => {
	const summary = (metadataType.path in metadata) ? metadataType.summarize(metadata[metadataType.path as string]) : ""
	return (
		<div
			key={metadataType.path.toString()}
			className="collapse collapse-arrow bg-base-100 border border-base-300 has-[.delete-receipt:hover]:bg-red-100 max-sm:rounded-none max-sm:border-x-0 max-sm:border-b-0 last:border-b"
		>
			<input type="checkbox" defaultChecked={initiallyOpen} />
			<div className="collapse-title font-semibold">
				{(metadataType.path in metadata)
					? <span className="pill metadatatype">
						{metadataType.displayName}

						{summary &&
							<span className="inner pill highlight">
								{summary}
							</span>
						}
					</span>
					: <span className="pl-2">{metadataType.displayName}</span>
				}
			</div>
			<div className="collapse-content text-sm px-0">
				{!(metadataType.path in metadata)
					? <button
						type="button"
						className="btn btn-outline btn-primary mx-4"
						onClick={() => { dispatch(MetadataControlPath)({ action: "TOGGLE_METADATA_TYPE", type: metadataType.path }) }}
					>
						Create {metadataType.displayName} data
					</button>
					: <>
						<MetadataElement
							metadataType={metadataType}
							metadata={metadata}
							dispatch={dispatch(metadataType.path)}
						/>
						<button
							type="button"
							className="btn btn-outline btn-error mx-4 delete-receipt mt-4"
							onClick={() => { dispatch(MetadataControlPath)({ action: "TOGGLE_METADATA_TYPE", type: metadataType.path }) }}
						>
							Remove {metadataType.displayName} data
						</button>
					</>
				}
			</div>
		</div>
	)
}