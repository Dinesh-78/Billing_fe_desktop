import { Product } from ".";

export interface BillingItem {
  product: Product & { category_name?: string };
  quantity: number;
  unit: string;
  rate: number;
}

export interface AdditionalCharge {
  chargeName: string;
  rate: number;
  value: number;
}