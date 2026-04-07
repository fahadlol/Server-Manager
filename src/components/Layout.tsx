import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Server, 
  Users, 
  Gavel, 
  Calendar, 
  MessageSquare, 
  Settings, 
  User, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Check,
  Trash2,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, limit } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { useAuth, OperationType, handleFirestoreError } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { cn } from '../lib/utils';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: any;
  link?: string;
}

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Servers', path: '/servers', icon: Server },
  { name: 'Staff Roster', path: '/staff', icon: Users },
  { name: 'Punishments', path: '/punishments', icon: Gavel },
  { name: 'LOA', path: '/loa', icon: Calendar },
  { name: 'Threads', path: '/threads', icon: MessageSquare },
  { name: 'Admin Panel', path: '/admin', icon: Settings, adminOnly: true },
];

export default function Layout() {
  const { profile, isAdmin } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'notifications'));

    return () => unsubscribe();
  }, [profile?.uid]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `notifications/${id}`);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await markAsRead(n.id);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 280 : 80,
          x: isMobileMenuOpen ? 0 : (window.innerWidth < 1024 ? -280 : 0)
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800/50 bg-slate-900/80 backdrop-blur-2xl lg:relative lg:translate-x-0 transition-transform duration-300",
          !isMobileMenuOpen && "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
          <AnimatePresence mode="wait">
            {(isSidebarOpen || isMobileMenuOpen) ? (
              <motion.div
                key="logo-full"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-3 font-bold text-xl text-white"
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center">
                  S
                </div>
                <span>Staff Manager</span>
              </motion.div>
            ) : (
              <motion.div
                key="logo-small"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center mx-auto"
              >
                S
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive 
                    ? "bg-cyan-600/10 text-cyan-400 border border-cyan-600/20 shadow-[0_0_20px_rgba(8,145,178,0.1)]" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-cyan-400" : "group-hover:scale-110 transition-transform")} />
                {(isSidebarOpen || isMobileMenuOpen) && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="font-medium"
                  >
                    {item.name}
                  </motion.span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 hidden lg:block">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-4 w-full px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-xl transition-all"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 mx-auto" />}
            {isSidebarOpen && <span className="font-medium">Collapse</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-16 flex items-center justify-between px-4 sm:px-8 bg-slate-900/80 backdrop-blur-2xl border-b border-slate-800/50 shrink-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-white truncate max-w-[150px] sm:max-w-none">
              {navItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-6">
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-400 hover:text-white transition-colors hover:bg-slate-800 rounded-xl"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-cyan-500 text-white text-[10px] font-bold rounded-full border-2 border-slate-900 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
                      <h3 className="font-bold text-white">Notifications</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {notifications.length > 0 ? (
                        <div className="divide-y divide-slate-800">
                          {notifications.map((n) => (
                            <div 
                              key={n.id}
                              className={cn(
                                "p-4 flex gap-4 hover:bg-slate-800/50 transition-colors group relative",
                                !n.read && "bg-cyan-500/5"
                              )}
                            >
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                n.type === 'info' && "bg-blue-500/10 text-blue-400",
                                n.type === 'success' && "bg-emerald-500/10 text-emerald-400",
                                n.type === 'warning' && "bg-amber-500/10 text-amber-400",
                                n.type === 'error' && "bg-red-500/10 text-red-400"
                              )}>
                                {n.type === 'info' && <Info className="w-5 h-5" />}
                                {n.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                                {n.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                                {n.type === 'error' && <AlertCircle className="w-5 h-5" />}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className={cn("text-sm font-bold truncate", n.read ? "text-slate-300" : "text-white")}>
                                    {n.title}
                                  </p>
                                  <span className="text-[10px] text-slate-500 whitespace-nowrap pt-0.5">
                                    {n.createdAt?.toDate ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                                  {n.message}
                                </p>
                                
                                <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!n.read && (
                                    <button 
                                      onClick={() => markAsRead(n.id)}
                                      className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                                    >
                                      <Check className="w-3 h-3" />
                                      Mark read
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => deleteNotification(n.id)}
                                    className="text-[10px] font-bold text-slate-500 hover:text-red-400 flex items-center gap-1"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                  </button>
                                </div>
                              </div>
                              
                              {!n.read && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500" />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-12 text-center">
                          <Bell className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                          <p className="text-slate-500 text-sm">No notifications yet</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 sm:pl-6 sm:border-l sm:border-slate-800">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-white truncate max-w-[120px]">{profile?.email}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">{profile?.role}</p>
              </div>
              <Link to="/profile" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 hover:border-cyan-500 transition-all">
                <User className="w-5 h-5" />
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
