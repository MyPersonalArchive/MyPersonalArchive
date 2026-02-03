export type DropFn<TIndex, TData> = (fromIndex: TIndex, toIndex: TIndex, data?: TData) => void

export type DispatchFn = (action: any) => void

export type ConvertDragDataToPayloadFn<TData, TIndex> = (data: TData, index: TIndex) => string | any

export type ConvertDropPayloadToActionFn<TIndex, TPayload> = (fromIndex: TIndex, toIndex: TIndex, data: TPayload) => any

export type MimeTypeConverter<TData, TIndex, TPayload> = {
    mimeType: string
    convertDragDataToPayload?: ConvertDragDataToPayloadFn<TData, TIndex>
    convertDropPayloadToAction?: ConvertDropPayloadToActionFn<TIndex, TPayload>
}

export type MimeTypeConverterArray<TData, TIndex> = Array<MimeTypeConverter<TData, TIndex, any>>
