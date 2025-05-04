import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { generatePDF } from '../utils/pdfGenerator';
import { generateExcel } from '../utils/excelGenerator';

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Invoice {
  id: string;
  customerName: string;
  date: string;
  items: InvoiceItem[];
  totalAmount: number;
  status: 'draft' | 'paid' | 'unpaid';
  tenantId: string;
  createdAt: Date;
}

export default function Sales() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, rate: 0, amount: 0 }
  ]);

  const calculateAmount = (quantity: number, rate: number) => {
    return quantity * rate;
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
      amount: field === 'quantity' || field === 'rate'
        ? calculateAmount(
            field === 'quantity' ? Number(value) : newItems[index].quantity,
            field === 'rate' ? Number(value) : newItems[index].rate
          )
        : newItems[index].amount
    };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      
      const invoiceData = {
        customerName,
        date,
        items,
        totalAmount,
        status: 'draft' as const,
        tenantId: user?.uid,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'invoices'), invoiceData);
      
      // Reset form
      setCustomerName('');
      setDate(new Date().toISOString().split('T')[0]);
      setItems([{ description: '', quantity: 1, rate: 0, amount: 0 }]);
      setShowForm(false);
      
      // Refresh invoices list
      fetchInvoices();
    } catch (error) {
      console.error('Error creating invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    if (!user?.uid) return;

    try {
      const q = query(
        collection(db, 'invoices'),
        where('tenantId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const fetchedInvoices = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invoice[];
      setInvoices(fetchedInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const handlePrint = async (invoice: Invoice) => {
    const element = document.createElement('div');
    element.className = 'p-8 bg-white';
    element.innerHTML = `
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold">${t('sales.invoice')}</h1>
        <p class="text-gray-600">${invoice.id}</p>
      </div>
      <div class="grid grid-cols-2 gap-4 mb-8">
        <div>
          <p class="font-semibold">${t('sales.customer')}:</p>
          <p>${invoice.customerName}</p>
        </div>
        <div className="text-right">
          <p class="font-semibold">${t('sales.date')}:</p>
          <p>${new Date(invoice.date).toLocaleDateString()}</p>
        </div>
      </div>
      <table class="w-full mb-8">
        <thead>
          <tr>
            <th class="text-left py-2">${t('sales.description')}</th>
            <th class="text-right py-2">${t('sales.quantity')}</th>
            <th class="text-right py-2">${t('sales.rate')}</th>
            <th class="text-right py-2">${t('sales.amount')}</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map(item => `
            <tr>
              <td class="py-2">${item.description}</td>
              <td class="text-right py-2">${item.quantity}</td>
              <td class="text-right py-2">${item.rate.toFixed(2)}</td>
              <td class="text-right py-2">${item.amount.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="text-right font-semibold py-2">${t('sales.total')}:</td>
            <td class="text-right font-semibold py-2">${invoice.totalAmount.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      <div class="text-center text-sm text-gray-600">
        <p>${t('sales.thankYou')}</p>
      </div>
    `;

    document.body.appendChild(element);
    await generatePDF(element, `invoice-${invoice.id}.pdf`);
    document.body.removeChild(element);
  };

  const handleExportExcel = () => {
    const exportData = invoices.map(invoice => ({
      [t('sales.invoiceNo')]: invoice.id,
      [t('sales.customer')]: invoice.customerName,
      [t('sales.date')]: new Date(invoice.date).toLocaleDateString(),
      [t('sales.total')]: invoice.totalAmount.toFixed(2),
      [t('sales.status')]: t(`sales.${invoice.status}`)
    }));

    generateExcel({
      filename: `sales-invoices-${new Date().toISOString().split('T')[0]}`,
      sheetName: t('sales.title'),
      data: exportData,
      headers: [
        t('sales.invoiceNo'),
        t('sales.customer'),
        t('sales.date'),
        t('sales.total'),
        t('sales.status')
      ]
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('sales.title')}</h1>
        <div className="flex space-x-4">
          <button
            onClick={handleExportExcel}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            {t('accounting.export')} Excel
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            {showForm ? t('sales.cancel') : t('sales.newInvoice')}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card bg-white p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('sales.customer')}
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('sales.date')}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                required
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('sales.description')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('sales.quantity')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('sales.rate')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('sales.amount')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('sales.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                        required
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                        min="1"
                        required
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                        min="0"
                        required
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        ❌
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={addItem}
              className="btn btn-outline"
            >
              {t('sales.addItem')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner"></span>
              ) : (
                t('sales.saveInvoice')
              )}
            </button>
          </div>
        </form>
      )}

      <div className="card bg-white p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('sales.invoiceNo')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('sales.customer')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('sales.date')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('sales.total')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('sales.status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('sales.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {invoice.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {invoice.customerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(invoice.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    रु {invoice.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                      invoice.status === 'unpaid' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {t(`sales.${invoice.status}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button 
                      onClick={() => handlePrint(invoice)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      {t('sales.print')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 