import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

const monthlyData = [
  { month: 'Jan', income: 4000, expenses: 2400 },
  { month: 'Feb', income: 3000, expenses: 1398 },
  { month: 'Mar', income: 2000, expenses: 9800 },
  { month: 'Apr', income: 2780, expenses: 3908 },
  { month: 'May', income: 1890, expenses: 4800 },
  { month: 'Jun', income: 2390, expenses: 3800 },
];

const expenseData = [
  { name: 'Rent', value: 4000 },
  { name: 'Salaries', value: 3000 },
  { name: 'Utilities', value: 2000 },
  { name: 'Supplies', value: 1000 },
];

export default function Dashboard() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('dashboard.welcome')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">{t('dashboard.revenue')}</div>
            <div className="stat-value text-primary">₹25,000</div>
            <div className="stat-desc">+20% from last month</div>
          </div>
        </div>
        
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">{t('dashboard.expenses')}</div>
            <div className="stat-value text-secondary">₹15,000</div>
            <div className="stat-desc">+10% from last month</div>
          </div>
        </div>
        
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">{t('dashboard.profit')}</div>
            <div className="stat-value text-accent">₹10,000</div>
            <div className="stat-desc">+30% from last month</div>
          </div>
        </div>
        
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">{t('dashboard.cashFlow')}</div>
            <div className="stat-value text-info">₹5,000</div>
            <div className="stat-desc">+5% from last month</div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">{t('dashboard.monthlySummary')}</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="income" fill="#8884d8" />
                <Bar dataKey="expenses" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">{t('dashboard.incomeVsExpenses')}</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#2E8B57" />
                <Line type="monotone" dataKey="expenses" stroke="#EF4444" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">{t('dashboard.expenseCategories')}</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={expenseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#3B82F6" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card bg-white p-6">
        <h3 className="text-lg font-semibold mb-4">{t('dashboard.tasks')}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-warning/10 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-warning">⚠️</span>
              <span>{t('dashboard.vatFilingDue')}</span>
            </div>
            <span className="text-sm text-gray-500">Due in 5 days</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-info/10 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-info">💡</span>
              <span>{t('dashboard.invoiceReminder')}</span>
            </div>
            <span className="text-sm text-gray-500">2 unpaid invoices</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-success/10 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-success">🔄</span>
              <span>{t('dashboard.irdSync')}</span>
            </div>
            <span className="text-sm text-gray-500">Last synced: 2 hours ago</span>
          </div>
        </div>
      </div>
    </div>
  );
} 