import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/auth-context';
import toast from 'react-hot-toast';
import { 
  LayoutDashboard, 
  Clock, 
  History, 
  BarChart3, 
  Settings, 
  LogOut 
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Chấm công', path: '/attendance', icon: Clock },
    { name: 'Lịch sử', path: '/history', icon: History },
    { name: 'Thống kê', path: '/statistics', icon: BarChart3 },
    { name: 'Cài đặt', path: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Không thể đăng xuất.');
    }
  };

  return (
    <div className="min-h-screen bg-brandBg-light dark:bg-brandBg-dark text-brandText-primaryLight dark:text-brandText-primaryDark flex flex-col md:flex-row transition-colors duration-300">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-brandCard-dark border-r border-gray-100 dark:border-gray-900/50 fixed h-screen z-20">
        {/* Logo */}
        <div className="h-20 flex items-center px-8 border-b border-gray-50 dark:border-gray-900/30">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <span className="text-2xl">🕒</span>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
              Work Log
            </span>
          </Link>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link key={item.path} to={item.path}>
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all relative overflow-hidden group ${
                    isActive 
                      ? 'text-primary bg-primary-soft' 
                      : 'text-brandText-secondaryLight dark:text-brandText-secondaryDark hover:bg-gray-50 dark:hover:bg-gray-900/40 hover:text-gray-950 dark:hover:text-gray-100'
                  }`}
                >
                  {/* Left indicator bar */}
                  {isActive && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full"
                    />
                  )}
                  
                  <Icon size={18} className={`transition-colors duration-200 ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500'}`} />
                  <span>{item.name}</span>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-gray-50 dark:border-gray-900/30 flex flex-col gap-3">
          {user && (
            <div className="flex items-center gap-3 px-2 py-1.5">
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.email}`} 
                alt="Avatar" 
                className="w-10 h-10 rounded-2xl object-cover ring-2 ring-primary/10"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100">
                  {user.displayName}
                </p>
                <p className="text-xs text-brandText-secondaryLight dark:text-brandText-secondaryDark truncate">
                  {user.email}
                </p>
              </div>
            </div>
          )}
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-danger hover:bg-danger-soft transition-all w-full text-left"
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-brandCard-dark border-t border-gray-100 dark:border-gray-900/40 z-30 flex items-center justify-around px-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link key={item.path} to={item.path} className="flex-1 flex justify-center py-1">
              <motion.div
                whileTap={{ scale: 0.92 }}
                className={`flex flex-col items-center gap-0.5 relative py-1 px-3 rounded-xl ${
                  isActive 
                    ? 'text-primary font-semibold' 
                    : 'text-brandText-secondaryLight dark:text-brandText-secondaryDark'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-primary' : 'text-gray-400 dark:text-gray-500'} />
                <span className="text-[10px] tracking-wide">{item.name}</span>
                {isActive && (
                  <motion.div 
                    layoutId="active-dot" 
                    className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full" 
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 min-h-screen pb-20 md:pb-6 overflow-x-hidden">
        <div className="max-w-[1200px] mx-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
