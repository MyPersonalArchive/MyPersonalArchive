export type WarrantyRequest = {
    country: string,
    type: string,
    months: number
}

export type WarrantyTypeResponse = {
    country: string,
    type: string,
    months: number,
    daysLeft: number
}

export type WarrantyResponse = {
    id: number,
    country: string,
    types: Warranty[]
}

export type Warranty = {
    type: string,
    months: number
}