export interface DimensionsMM {
  l: number
  w: number
  h: number | number[]
}

export interface PalletDimensionsCM {
  l: number
  w: number
  h: number
}



export interface PriceTier {
  name: string
  withoutTax: number
  withTax: number
}

export interface PalletPriceTier {
  maxQty: number
  withoutTax: number
  withTax: number
}

export interface Product {
  itemNo: string
  name: string
  internalDimensionsMM: DimensionsMM
  qualityCardboard: string
  palletDimensionsCM: PalletDimensionsCM
  prices: PriceTier[]
  weightPieceGr: number
  weightPalletKg: number
  amountQtyInPcs: number
  palletPcs: number
}
