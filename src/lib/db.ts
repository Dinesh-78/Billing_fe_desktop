export interface DbApi {
  categories: {
    getAll: () => Promise<import('../types').Category[]>;
    create: (data: object) => Promise<import('../types').Category>;
    update: (id: number, data: object) => Promise<import('../types').Category | null>;
    delete: (id: number) => Promise<boolean>;
  };
  products: {
    getAll: () => Promise<(import('../types').Product & { category_name: string })[]>;
    getById: (id: number) => Promise<(import('../types').Product & { category_name: string }) | undefined>;
    create: (data: object) => Promise<import('../types').Product>;
    update: (id: number, data: object) => Promise<import('../types').Product | null>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
    getLowStock: () => Promise<import('../types').Product[]>;
  };
  customers: {
    getAll: () => Promise<import('../types').Customer[]>;
    create: (data: object) => Promise<import('../types').Customer>;
    update: (id: number, data: object) => Promise<import('../types').Customer | null>;
  };
  orders: {
    getAll: () => Promise<import('../types').Order[]>;
    create: (data: object) => Promise<import('../types').Order>;
    getById: (id: number) => Promise<(import('../types').Order & { items: import('../types').OrderItem[] }) | undefined>;
  };
  printInvoiceToPdf?: (data: { order: object; store: Record<string, string>; billNumber: string }) => Promise<string>;
  store: {
    getSettings: () => Promise<Record<string, string>>;
    updateSetting: (key: string, value: string) => Promise<void>;
  };
  taxes: {
    getAll: () => Promise<import('../types').Tax[]>;
    create: (data: object) => Promise<import('../types').Tax>;
    update: (id: number, data: object) => Promise<import('../types').Tax | null>;
    delete: (id: number) => Promise<void>;
  };
}

export const db = window.db;
