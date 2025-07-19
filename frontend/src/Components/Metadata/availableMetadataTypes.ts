import { MetadataType } from './metadataTypesReducer'
import ExpiryMetadataComponent from './MetadataTypes/ExpiryMetadataType'
import ReceiptMetadataComponent from './MetadataTypes/ReceiptMetadataType'


export const allMetadataTypes: Array<MetadataType> = [
    ReceiptMetadataComponent,
    ExpiryMetadataComponent
]


