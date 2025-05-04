import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'ne' : 'en');
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            {t('common.dashboard')}
          </h2>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleLanguage}
            className="flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <span>{i18n.language === 'en' ? '🇳🇵' : '🇬🇧'}</span>
            <span>{i18n.language === 'en' ? 'नेपाली' : 'English'}</span>
          </button>
          
          <div className="relative">
            <button
              className="flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <span className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
                {user?.email?.[0].toUpperCase()}
              </span>
              <span>{user?.email}</span>
            </button>
            
            <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white py-1 shadow-lg">
              <button
                onClick={logout}
                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                {t('common.logout')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 