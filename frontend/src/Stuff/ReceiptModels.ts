import { IReceiptTag } from "./CategoryModels"
import { WarrantyRequest, WarrantyTypeResponse } from "./WarrantyModels"

export interface IResponseReceipt {
    receiptId: number
    createdByUser: string
    created: Date
    name: string
    amount: number
    currency: string
    tags: IReceiptTag[]
    companies: IReceiptTag[]
    fileName: string
    originalDate: Date
    warranty: WarrantyTypeResponse
    markedAs?: IReceiptMarkedAs[]
}

export type IReceiptMarkedAs = {
    type: ReceiptMarkAsType
    date: Date
}

export interface ISearchResponseReceipt {
    availableItems: number
    receipts: IResponseReceipt[]
}

export interface IPostReceipt {
    createdByUser: string
    name: string
    amount: number
    currency: string
    tags: IReceiptTag[]
    companies: IReceiptTag[]
    receiptData: string
    fileName: string,
    originalDate: Date
    warranty?: WarrantyRequest
}

export interface IUpdateReceipt {
    receiptId: number
    name: string
    amount: number
    currency: string
    tags: IReceiptTag[]
    companies: IReceiptTag[]
    receiptData?: string
    fileName: string
    originalDate: Date
    removeData: boolean
    updateData: boolean
    warranty?: WarrantyRequest
}

export type IReceiptDataResponse = {
    fileName: string
    data: string
}

export type ISearchReceipt = {
    count?: number
    page?: number
    freeSearch?: string
    companyTags?: IReceiptTag[]
    tags?: IReceiptTag[]
}

export type IReceiptCountModel = {
    count: number
}


export enum ReceiptMarkAsType {
    Sold = 1,
    Scrapped = 2,
    ReturnedToVendor = 3
}

export type IMarkReceiptAs = {
    receiptId: number
    type: ReceiptMarkAsType
    date?: Date
}

export type IMarkReceiptAsResponse = {
    receiptId: number
    marks: IReceiptMarkedAs[]
}