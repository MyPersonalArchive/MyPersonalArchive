import { MetadataType } from "../../Utils/Metadata/types"
import DescriptionMetadataType from "./DescriptionMetadataType"
import EmailMetadataType from "./EmailMetadataType"
import ExpiryMetadataComponent from "./ExpiryMetadataType"
import ReceiptMetadataComponent from "./ReceiptMetadataType"
import TravelDocumentMetadataType from "./TravelDocumentMetadataType"


export const allMetadataTypes: Array<MetadataType> = [
	ReceiptMetadataComponent,
	ExpiryMetadataComponent,
	DescriptionMetadataType,
	EmailMetadataType,
	TravelDocumentMetadataType
]


