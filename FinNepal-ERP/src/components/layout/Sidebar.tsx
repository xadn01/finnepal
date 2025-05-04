import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

const navigationItems = [
  { path: '/dashboard', icon: '🔐', label: 'dashboard' },
  { path: '/sales', icon: '📄', label: 'sales' },
  { path: '/purchases', icon: '📥', label: 'purchases' },
  { path: '/accounting', icon: '📘', label: 'accounting' },
  { path: '/bank', icon: '🏦', label: 'bank' },
  { path: '/reports', icon: '📊', label: 'reports' },
  { path: '/inventory', icon: '🧾', label: 'inventory' },
  { path: '/ird', icon: '🇳🇵', label: 'ird' },
  { path: '/settings', icon: '⚙️', label: 'settings' },
];

const adminItems = [
  { path: '/users', icon: '👥', label: 'users' },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg">
      <div className="flex h-16 items-center justify-center border-b">
        <h1 className="text-xl font-bold text-primary">FinNepal ERP</h1>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center space-x-3 rounded-lg p-3 transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{t(`common.${item.label}`)}</span>
              </Link>
            </li>
          ))}
          
          {isAdmin && (
            <>
              <li className="mt-4 border-t pt-2">
                <span className="px-3 text-sm font-semibold text-gray-500">
                  {t('common.admin')}
                </span>
              </li>
              {adminItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center space-x-3 rounded-lg p-3 transition-colors ${
                      location.pathname === item.path
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{t(`common.${item.label}`)}</span>
                  </Link>
                </li>
              ))}
            </>
          )}
        </ul>
      </nav>
    </div>
  );
} 