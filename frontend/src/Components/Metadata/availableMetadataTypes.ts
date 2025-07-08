import ReceiptMetadataComponent from './MetadataTypes/ReceiptMetadataType'
import { MetadataType } from './metadataTypesReducer'
import ExpiryMetadataComponent from './MetadataTypes/ExpiryMetadataType'


export const availableMetadataTypes: Array<MetadataType> = [
    ReceiptMetadataComponent,
    ExpiryMetadataComponent
]


