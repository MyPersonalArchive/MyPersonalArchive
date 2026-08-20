import { MetadataType } from "../../Utils/Metadata/types"
import EmailMetadataType from "./EmailMetadataType"
import ReceiptMetadataComponent from "./ReceiptMetadataType"
import TravelDocumentMetadataType from "./TravelDocumentMetadataType"


export const allMetadataTypes: Array<MetadataType> = [
	ReceiptMetadataComponent,
	EmailMetadataType,
	TravelDocumentMetadataType
]


