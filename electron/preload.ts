import { contextBridge, ipcRenderer } from 'electron';

const api = {
  categories: {
    getAll: () => ipcRenderer.invoke('db:categories:getAll'),
    create: (data: object) => ipcRenderer.invoke('db:categories:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('db:categories:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('db:categories:delete', id),
  },
  products: {
    getAll: () => ipcRenderer.invoke('db:products:getAll'),
    getById: (id: number) => ipcRenderer.invoke('db:products:getById', id),
    create: (data: object) => ipcRenderer.invoke('db:products:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('db:products:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('db:products:delete', id),
    getLowStock: () => ipcRenderer.invoke('db:products:getLowStock'),
  },
  customers: {
    getAll: () => ipcRenderer.invoke('db:customers:getAll'),
    create: (data: object) => ipcRenderer.invoke('db:customers:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('db:customers:update', id, data),
  },
  orders: {
    getAll: () => ipcRenderer.invoke('db:orders:getAll'),
    create: (data: object) => ipcRenderer.invoke('db:orders:create', data),
    getById: (id: number) => ipcRenderer.invoke('db:orders:getById', id),
  },
  store: {
    getSettings: () => ipcRenderer.invoke('db:store:getSettings'),
    updateSetting: (key: string, value: string) => ipcRenderer.invoke('db:store:updateSetting', key, value),
  },
  printInvoiceToPdf: (data: { order: object; store: Record<string, string>; billNumber: string }) =>
    ipcRenderer.invoke('print:invoiceToPdf', data),
  taxes: {
    getAll: () => ipcRenderer.invoke('db:taxes:getAll'),
    create: (data: object) => ipcRenderer.invoke('db:taxes:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('db:taxes:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('db:taxes:delete', id),
  },
};

contextBridge.exposeInMainWorld('db', api);

export type DbApi = typeof api;
