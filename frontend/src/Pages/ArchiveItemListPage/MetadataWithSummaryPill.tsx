import { MetadataType } from "../../Utils/Metadata/types"


type Props = {
	metadataType: MetadataType
	metadata: any
	className?: string
}
export const MetadataWithSummaryPill = ({ metadataType, metadata, className }: Props) => {
	const summary = metadataType?.summarize(metadata[metadataType.path])
	return (
		<span className={`pill metadatatype ${className ?? ""}`}>
			{metadataType?.displayName ?? metadataType.path}
			{summary &&
				<span className="inner pill highlight">
					{summary}
				</span>
			}
		</span>
	)
}