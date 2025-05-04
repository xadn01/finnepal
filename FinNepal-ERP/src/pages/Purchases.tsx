import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { generatePDF } from '../utils/pdfGenerator';
import { generateExcel } from '../utils/excelGenerator';

interface BillItem {
  description: string;
  quantity: number;
  rate: number;
  vatRate: number;
  amount: number;
  vatAmount: number;
}

interface Bill {
  id: string;
  billNo: string;
  vendor: string;
  date: string;
  items: BillItem[];
  total: number;
  totalVat: number;
  status: 'draft' | 'paid' | 'unpaid';
  tenantId: string;
  createdAt: Date;
}

const Purchases = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState('');
  const [items, setItems] = useState<BillItem[]>([
    { description: '', quantity: 0, rate: 0, vatRate: 13, amount: 0, vatAmount: 0 }
  ]);

  const calculateAmounts = (quantity: number, rate: number, vatRate: number) => {
    const amount = quantity * rate;
    const vatAmount = amount * (vatRate / 100);
    return { amount, vatAmount };
  };

  const handleItemChange = (index: number, field: keyof BillItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };

    if (field === 'quantity' || field === 'rate' || field === 'vatRate') {
      const { amount, vatAmount } = calculateAmounts(
        field === 'quantity' ? Number(value) : newItems[index].quantity,
        field === 'rate' ? Number(value) : newItems[index].rate,
        field === 'vatRate' ? Number(value) : newItems[index].vatRate
      );
      newItems[index].amount = amount;
      newItems[index].vatAmount = vatAmount;
    }

    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 0, rate: 0, vatRate: 13, amount: 0, vatAmount: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.tenantId) return;

    const total = items.reduce((sum, item) => sum + item.amount, 0);
    const totalVat = items.reduce((sum, item) => sum + item.vatAmount, 0);

    try {
      const docRef = await addDoc(collection(db, 'bills'), {
        vendor,
        date,
        items,
        total,
        totalVat,
        status: 'draft',
        tenantId: user.tenantId,
        createdAt: new Date()
      });

      const newBill: Bill = {
        id: docRef.id,
        billNo: `BILL-${docRef.id.slice(0, 8).toUpperCase()}`,
        vendor,
        date,
        items,
        total,
        totalVat,
        status: 'draft',
        tenantId: user.tenantId,
        createdAt: new Date()
      };

      setBills([...bills, newBill]);

      setVendor('');
      setDate('');
      setItems([{ description: '', quantity: 0, rate: 0, vatRate: 13, amount: 0, vatAmount: 0 }]);
      setShowForm(false);
    } catch (error) {
      console.error('Error creating bill:', error);
    }
  };

  const fetchBills = async () => {
    if (!user || !user.tenantId) return;

    try {
      const q = query(collection(db, 'bills'), where('tenantId', '==', user.tenantId));
      const querySnapshot = await getDocs(q);
      const billsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        billNo: `BILL-${doc.id.slice(0, 8).toUpperCase()}`,
        ...doc.data()
      })) as Bill[];
      setBills(billsData);
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async (bill: Bill) => {
    const element = document.createElement('div');
    element.className = 'p-8 bg-white';
    element.innerHTML = `
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold">${t('purchases.bill')}</h1>
        <p class="text-gray-600">${bill.billNo}</p>
      </div>
      <div class="grid grid-cols-2 gap-4 mb-8">
        <div>
          <p class="font-semibold">${t('purchases.vendor')}:</p>
          <p>${bill.vendor}</p>
        </div>
        <div className="text-right">
          <p class="font-semibold">${t('purchases.date')}:</p>
          <p>${bill.date}</p>
        </div>
      </div>
      <table class="w-full mb-8">
        <thead>
          <tr>
            <th class="text-left py-2">${t('purchases.description')}</th>
            <th class="text-right py-2">${t('purchases.quantity')}</th>
            <th class="text-right py-2">${t('purchases.rate')}</th>
            <th class="text-right py-2">${t('purchases.vatRate')}</th>
            <th class="text-right py-2">${t('purchases.amount')}</th>
            <th class="text-right py-2">${t('purchases.vatAmount')}</th>
          </tr>
        </thead>
        <tbody>
          ${bill.items.map(item => `
            <tr>
              <td class="py-2">${item.description}</td>
              <td class="text-right py-2">${item.quantity}</td>
              <td class="text-right py-2">${item.rate.toFixed(2)}</td>
              <td class="text-right py-2">${item.vatRate}%</td>
              <td class="text-right py-2">${item.amount.toFixed(2)}</td>
              <td class="text-right py-2">${item.vatAmount.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" class="text-right font-semibold py-2">${t('purchases.total')}:</td>
            <td class="text-right font-semibold py-2">${bill.total.toFixed(2)}</td>
            <td class="text-right font-semibold py-2">${bill.totalVat.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      <div class="text-center text-sm text-gray-600">
        <p>${t('purchases.thankYou')}</p>
      </div>
    `;

    document.body.appendChild(element);
    await generatePDF(element, `bill-${bill.billNo}.pdf`);
    document.body.removeChild(element);
  };

  const handleExportExcel = () => {
    const exportData = bills.map(bill => ({
      [t('purchases.billNo')]: bill.id,
      [t('purchases.vendor')]: bill.vendor,
      [t('purchases.date')]: new Date(bill.date).toLocaleDateString(),
      [t('purchases.total')]: bill.total.toFixed(2),
      [t('purchases.vat')]: bill.totalVat.toFixed(2),
      [t('purchases.status')]: t(`purchases.${bill.status}`)
    }));

    generateExcel({
      filename: `purchase-bills-${new Date().toISOString().split('T')[0]}`,
      sheetName: t('purchases.title'),
      data: exportData,
      headers: [
        t('purchases.billNo'),
        t('purchases.vendor'),
        t('purchases.date'),
        t('purchases.total'),
        t('purchases.vat'),
        t('purchases.status')
      ]
    });
  };

  useEffect(() => {
    fetchBills();
  }, [user]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('purchases.title')}</h1>
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
            {showForm ? t('purchases.cancel') : t('purchases.newBill')}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('purchases.vendor')}
              </label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('purchases.date')}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="px-4 py-2">{t('purchases.description')}</th>
                  <th className="px-4 py-2">{t('purchases.quantity')}</th>
                  <th className="px-4 py-2">{t('purchases.rate')}</th>
                  <th className="px-4 py-2">{t('purchases.vatRate')}</th>
                  <th className="px-4 py-2">{t('purchases.amount')}</th>
                  <th className="px-4 py-2">{t('purchases.vatAmount')}</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 border rounded"
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                        className="w-full px-2 py-1 border rounded"
                        min="0"
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))}
                        className="w-full px-2 py-1 border rounded"
                        min="0"
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.vatRate}
                        onChange={(e) => handleItemChange(index, 'vatRate', Number(e.target.value))}
                        className="w-full px-2 py-1 border rounded"
                        min="0"
                        max="100"
                        required
                      />
                    </td>
                    <td className="px-4 py-2">{item.amount.toFixed(2)}</td>
                    <td className="px-4 py-2">{item.vatAmount.toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-between">
            <button
              type="button"
              onClick={addItem}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              {t('purchases.addItem')}
            </button>
            <button
              type="submit"
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              {t('purchases.saveBill')}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('purchases.billNo')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('purchases.vendor')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('purchases.date')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('purchases.total')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('purchases.vat')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('purchases.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('purchases.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bills.map((bill) => (
              <tr key={bill.id}>
                <td className="px-6 py-4 whitespace-nowrap">{bill.billNo}</td>
                <td className="px-6 py-4 whitespace-nowrap">{bill.vendor}</td>
                <td className="px-6 py-4 whitespace-nowrap">{bill.date}</td>
                <td className="px-6 py-4 whitespace-nowrap">{bill.total.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{bill.totalVat.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    bill.status === 'paid' ? 'bg-green-100 text-green-800' :
                    bill.status === 'unpaid' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {t(`purchases.${bill.status}`)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">
                    {t('purchases.view')}
                  </button>
                  <button 
                    onClick={() => handlePrint(bill)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    {t('purchases.print')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Purchases; 