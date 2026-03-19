import { app, BrowserWindow, ipcMain, shell, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DatabaseService } from './database';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | null = null;
let db: DatabaseService;

function createWindow() {
  const isDev = process.env.VITE_DEV_SERVER_URL != null;
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    titleBarStyle: 'default',
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL!);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Grant microphone permission so SpeechRecognition works in the renderer
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    if (permission === 'media') return true;
    return false;
  });
}

async function initApp() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'billing.db');
  db = new DatabaseService(dbPath);
  db.initialize();

  registerIpcHandlers();
}

function registerIpcHandlers() {
  // Categories
  ipcMain.handle('db:categories:getAll', () => db.getCategories());
  ipcMain.handle('db:categories:create', (_, data) => db.createCategory(data));
  ipcMain.handle('db:categories:update', (_, id, data) => db.updateCategory(id, data));
  ipcMain.handle('db:categories:delete', (_, id) => db.deleteCategory(id));

  // Products
  ipcMain.handle('db:products:getAll', () => db.getProducts());
  ipcMain.handle('db:products:getById', (_, id) => db.getProductById(id));
  ipcMain.handle('db:products:create', (_, data) => db.createProduct(data));
  ipcMain.handle('db:products:update', (_, id, data) => db.updateProduct(id, data));
  ipcMain.handle('db:products:delete', (_, id) => db.deleteProduct(id));
  ipcMain.handle('db:products:getLowStock', () => db.getLowStockProducts());

  // Customers
  ipcMain.handle('db:customers:getAll', () => db.getCustomers());
  ipcMain.handle('db:customers:create', (_, data) => db.createCustomer(data));
  ipcMain.handle('db:customers:update', (_, id, data) => db.updateCustomer(id, data));

  // Orders
  ipcMain.handle('db:orders:getAll', () => db.getOrders());
  ipcMain.handle('db:orders:create', (_, data) => db.createOrder(data));
  ipcMain.handle('db:orders:getById', (_, id) => db.getOrderById(id));

  ipcMain.handle('db:store:getSettings', () => db.getStoreSettings());
  ipcMain.handle('db:store:updateSetting', (_, key, value) => db.updateStoreSetting(key, value));

  // Taxes
  ipcMain.handle('db:taxes:getAll', () => db.getTaxes());
  ipcMain.handle('db:taxes:create', (_, data) => db.createTax(data));
  ipcMain.handle('db:taxes:update', (_, id, data) => db.updateTax(id, data));
  ipcMain.handle('db:taxes:delete', (_, id) => db.deleteTax(id));

  ipcMain.handle('print:invoiceToPdf', async (_, data: { order: object; store: Record<string, string>; billNumber: string }) => {
    const html = buildInvoiceHtml(data);
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false },
    });
    await printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    await new Promise((r) => setTimeout(r, 300));
    const saveDir = app.getPath('documents');
    const safeName = `Invoice_${(data.billNumber || 'VL').replace(/[^\w-]/g, '_')}_${Date.now()}.pdf`;
    const pdfPath = path.join(saveDir, safeName);
    const pdfBuffer = await printWindow.webContents.printToPDF({
      printBackground: true,
    });
    printWindow.close();
    if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
    fs.writeFileSync(pdfPath, pdfBuffer);
    await shell.openPath(pdfPath);
    return pdfPath;
  });
}

function buildInvoiceHtml(data: { order: any; store: Record<string, string>; billNumber: string }): string {
  const { order, store, billNumber } = data;
  const items = order.items || [];
  const cgstTotal = items.reduce((s: number, i: any) => s + (i.gst_amount || i.subtotal * (i.gst_rate || 0) / 100) / 2, 0);
  const sgstTotal = items.reduce((s: number, i: any) => s + (i.gst_amount || i.subtotal * (i.gst_rate || 0) / 100) / 2, 0);
  const totQty = items.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
  const fmt = (n: number) => (n ?? 0).toFixed(2);
  const fmtDate = (d: string) => {
    if (!d) return '';
    const [y, m, dd] = d.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(dd).padStart(2, '0')}/${months[(m || 1) - 1]}/${y}`;
  };
  const words = (n: number) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const chunk = (num: number) => {
      let s = '';
      if (num >= 100) { s += ones[Math.floor(num / 100)] + ' Hundred '; num %= 100; }
      if (num >= 20) { s += tens[Math.floor(num / 10)] + ' '; num %= 10; }
      else if (num >= 10) { s += teens[num - 10] + ' '; return s.trim(); }
      if (num > 0) s += ones[num] + ' ';
      return s.trim();
    };
    let int = Math.floor(n);
    let result = '';
    if (int >= 10000000) { result += chunk(Math.floor(int / 10000000)) + ' Crore '; int %= 10000000; }
    if (int >= 100000) { result += chunk(Math.floor(int / 100000)) + ' Lakh '; int %= 100000; }
    if (int >= 1000) { result += chunk(Math.floor(int / 1000)) + ' Thousand '; int %= 1000; }
    result += chunk(int) || 'Zero';
    return result + ' Only';
  };

  const rows = items.map((i: any) => `
    <tr><td>${(i.product_name || '').replace(/</g, '&lt;')}</td><td>${i.hsn_code || '-'}</td><td style="text-align:right">${i.quantity}<br><small>${i.gst_rate || 0}%</small></td><td style="text-align:right">${fmt(i.unit_price)}${(i.mrp && i.mrp > 0) ? '<br><small>' + fmt(i.mrp) + '</small>' : ''}</td><td style="text-align:right">${fmt(i.total || i.subtotal + (i.gst_amount || 0))}</td></tr>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;font-size:12px;color:#000;max-width:210mm;margin:0 auto;padding:16px}
    table{width:100%;border-collapse:collapse}
    th,td{border-bottom:1px solid #333;padding:6px}
    th{text-align:left}
    .text-right{text-align:right}
    .bold{font-weight:bold}
  </style></head><body>
    <h1 style="text-align:center;font-size:18px">TAX INVOICE</h1>
    <h2 style="text-align:center;font-size:16px">${(store.name || 'Store Name').replace(/</g, '&lt;')}</h2>
    <p style="text-align:center;margin:2px 0">${(store.address || '').replace(/</g, '&lt;')}</p>
    <p style="text-align:center;margin:2px 0">${(store.phone || '').replace(/</g, '&lt;')}</p>
    <p style="text-align:center;margin:4px 0">GSTIN: ${(store.gstin || '').replace(/</g, '&lt;')} | FSSAI No: ${(store.fssai || '').replace(/</g, '&lt;')}</p>
    <div style="border-bottom:1px solid #000;padding-bottom:8px;margin-bottom:12px">
      <strong>CASH BILL</strong> <span style="margin-left:16px">${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
    </div>
    <div style="margin-bottom:12px;display:flex;justify-content:space-between">
      <span>Bill No: ${(billNumber || '').replace(/</g, '&lt;')}</span>
      <span>Date: ${fmtDate(order.purchase_date)}</span>
      <span>Name: ${(order.customer_name || '').replace(/</g, '&lt;')}</span>
    </div>
    <table>
      <thead><tr><th>Particulars</th><th>HSN</th><th style="text-align:right">Qty/GST%</th><th style="text-align:right">Rate/Mrp</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="text-align:right;margin:8px 0">Tot Qty: ${fmt(totQty)} &nbsp; T.Pcs: 0.00</p>
    <p style="text-align:right;margin:4px 0">Total Amt: ${fmt(order.total_amount)}</p>
    <p style="text-align:right;margin:4px 0">CGST Amt: ${fmt(cgstTotal)} &nbsp; SGST Amt: ${fmt(sgstTotal)}</p>
    <p style="text-align:right;margin:8px 0;font-weight:bold">Net Amount: ₹${fmt(order.total_amount)}</p>
    <p style="margin:24px 0">Rupees ${words(order.total_amount || 0)}</p>
    <p style="margin-top:48px">Authorised Signature.</p>
  </body></html>`;
}

app.whenReady().then(initApp).then(createWindow);

app.on('window-all-closed', () => {
  if (typeof db !== 'undefined') db.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
