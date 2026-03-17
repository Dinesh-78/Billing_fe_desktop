export interface Category {
  id: number;
  name: string;
  image_path: string | null;
  country_code: string;
  state_code: string;
  cgst_rate: number;
  sgst_rate: number;
  created_at: string;
}

export interface Product {
  id: number;
  product_code: string;
  name: string;
  image_path: string | null;
  purchase_price: number;
  hsn_code: string;
  stock: number;
  category_id: number;
  low_stock_threshold: number;
  selling_price: number;
  mrp: number;
  gst_rate: number;
  created_at: string;
  updated_at: string;
  category_name?: string;
}

export interface Customer {
  id: number;
  name: string;
  phone_number: string;
  total_purchases: number;
  created_at: string;
}

export interface OrderItem {
  product_id: number;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  subtotal: number;
  gst_amount: number;
  total: number;
  hsn_code?: string;
  mrp?: number;
}

export interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  customer_id: number | null;
  purchase_date: string;
  total_amount: number;
  created_at: string;
  items?: OrderItem[];
}

export interface Tax {
  id: number;
  country_code: string;
  state_code: string;
  cgst_rate: number;
  sgst_rate: number;
  created_at: string;
}

declare global {
  interface Window {
    db: import('../lib/db').DbApi;
  }
}
