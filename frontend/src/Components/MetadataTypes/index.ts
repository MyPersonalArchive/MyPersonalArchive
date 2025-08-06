import { MetadataType } from '../../Utils/Metadata/types'
import DescriptionMetadataType from './DescriptionMetadataType'
import ExpiryMetadataComponent from './ExpiryMetadataType'
import ReceiptMetadataComponent from './ReceiptMetadataType'


export const allMetadataTypes: Array<MetadataType> = [
    ReceiptMetadataComponent,
    ExpiryMetadataComponent,
    DescriptionMetadataType
]


