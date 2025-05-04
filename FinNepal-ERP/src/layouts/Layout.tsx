import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';

export default function Layout() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'ne' : 'en');
  };

  return (
    <div className="min-h-screen bg-base-100">
      <Navbar user={user} theme={theme} onThemeToggle={toggleTheme} onLanguageToggle={toggleLanguage} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
} 