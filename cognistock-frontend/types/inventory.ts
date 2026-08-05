export interface Product {
  id: string;
  sku: string;
  name: string;
  stockQuantity: number;
  reorderThreshold: number;
  price: number;
}

export interface ForecastPoint {
  date: string;
  actual: number | null;
  predicted: number | null;
}

export interface Supplier {
  id: string;
  name: string;
  deliveryDays: number;
  pricePerUnit: number;
}