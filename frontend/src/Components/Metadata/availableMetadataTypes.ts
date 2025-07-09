import { MetadataType } from './metadataTypesReducer'
import ExpiryMetadataComponent from './MetadataTypes/ExpiryMetadataType'
import ReceiptMetadataComponent from './MetadataTypes/ReceiptMetadataType'


export const availableMetadataTypes: Array<MetadataType> = [
    ReceiptMetadataComponent,
    ExpiryMetadataComponent
]


