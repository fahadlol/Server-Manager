import React, { useEffect, useState } from 'react';
import { collection, query, limit, orderBy, onSnapshot, where } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  Users, 
  Gavel, 
  Calendar, 
  MessageSquare, 
  TrendingUp, 
  Clock,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const { profile, isStaff, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    staffCount: 0,
    punishmentCount: 0,
    loaCount: 0,
    threadCount: 0
  });
  const [recentPunishments, setRecentPunishments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isStaff) {
      setLoading(false);
      return;
    }

    // Stats listeners
    const staffQuery = query(collection(db, 'users'), where('role', 'in', ['owner', 'admin', 'mod', 'helper']));
    const punishmentQuery = query(collection(db, 'punishments'), orderBy('timestamp', 'desc'), limit(5));
    const loaQuery = query(collection(db, 'loas'), where('status', '==', 'pending'));
    const threadQuery = query(collection(db, 'threads'), limit(10));

    const unsubStaff = onSnapshot(staffQuery, (snap) => {
      setStats(prev => ({ ...prev, staffCount: snap.size }));
    }, (err) => {
      console.error('Staff query error:', err);
    });

    const unsubPunishments = onSnapshot(punishmentQuery, (snap) => {
      setStats(prev => ({ ...prev, punishmentCount: snap.size }));
      setRecentPunishments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Punishments query error:', err);
      setLoading(false);
    });

    const unsubLoa = onSnapshot(loaQuery, (snap) => {
      setStats(prev => ({ ...prev, loaCount: snap.size }));
    }, (err) => {
      console.error('LOA query error:', err);
    });

    return () => {
      unsubStaff();
      unsubPunishments();
      unsubLoa();
    };
  }, [isStaff]);

  const statCards = [
    { name: 'Total Staff', value: stats.staffCount, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { name: 'Active Punishments', value: stats.punishmentCount, icon: Gavel, color: 'text-red-400', bg: 'bg-red-400/10' },
    { name: 'Pending LOAs', value: stats.loaCount, icon: Calendar, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { name: 'Active Threads', value: stats.threadCount, icon: MessageSquare, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  ];

  if (!isStaff) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold text-white">Welcome, {profile?.minecraftUsername || profile?.email?.split('@')[0]}</h2>
          <p className="text-slate-400">You are currently registered as a regular user.</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-12 rounded-3xl text-center space-y-6 max-w-2xl mx-auto mt-12">
          <div className="w-20 h-20 bg-cyan-600/20 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-10 h-10 text-cyan-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white">Awaiting Staff Assignment</h3>
            <p className="text-slate-400 leading-relaxed">
              To access staff management tools, punishments, and server rosters, an administrator must assign you a staff role. 
              Please contact your server owner or administrator to get started.
            </p>
          </div>
          <div className="pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full text-sm text-slate-300">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              Current Role: <span className="font-bold text-white uppercase ml-1">{profile?.role || 'User'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col gap-2"
      >
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">{profile?.minecraftUsername || profile?.email?.split('@')[0]}</span>
        </h2>
        <p className="text-slate-400 text-sm sm:text-lg font-medium">Here's a quick overview of your network's activity.</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="glass-panel p-6 rounded-[2rem] relative overflow-hidden group cursor-default"
          >
            <div className={cn("absolute -top-12 -right-12 w-32 h-32 blur-[80px] opacity-20 transition-all duration-500 group-hover:opacity-40 group-hover:scale-125", stat.bg)} />
            <div className="flex items-center justify-between mb-6">
              <div className={cn("p-4 rounded-2xl shadow-inner", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 rounded-full">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-500">+12%</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{stat.name}</p>
              <p className="text-4xl font-black text-white tabular-nums tracking-tighter">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 space-y-6"
        >
          <div className="flex items-center justify-between px-2">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-cyan-400" />
              </div>
              Recent Punishments
            </h3>
            <button className="text-sm text-cyan-400 hover:text-cyan-300 font-bold px-4 py-2 hover:bg-cyan-500/10 rounded-xl transition-all">
              View all activity
            </button>
          </div>

          <div className="glass-panel rounded-[2.5rem] overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/50 bg-slate-800/20">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Player</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Type</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Reason</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {recentPunishments.length > 0 ? recentPunishments.map((pun, i) => (
                    <motion.tr 
                      key={pun.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + (i * 0.05) }}
                      className="hover:bg-slate-800/20 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 shadow-lg">
                            {pun.playerUsername[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{pun.playerUsername}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                          pun.type === 'permban' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          pun.type === 'tempban' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                          pun.type === 'mute' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                          "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        )}>
                          {pun.type}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm text-slate-400 line-clamp-1 italic">"{pun.reason}"</p>
                      </td>
                      <td className="px-8 py-5 text-xs font-medium text-slate-500">
                        {pun.timestamp?.toDate ? formatDistanceToNow(pun.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                      </td>
                    </motion.tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 opacity-30">
                          <Gavel className="w-12 h-12" />
                          <p className="text-sm font-medium italic">No recent punishments found.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-8"
        >
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3 px-2">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              Network Health
            </h3>
            
            <div className="space-y-4">
              <div className="glass-panel p-8 rounded-[2.5rem] space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                      <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75" />
                    </div>
                    <span className="text-sm font-bold text-slate-200">API Gateway</span>
                  </div>
                  <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">STABLE</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                      <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75" />
                    </div>
                    <span className="text-sm font-bold text-slate-200">Discord Sync</span>
                  </div>
                  <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-slate-700 rounded-full" />
                    <span className="text-sm font-bold text-slate-400">Minecraft Plugin</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-500 bg-slate-800 px-2 py-1 rounded-md">IDLE</span>
                </div>
              </div>

              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-cyan-600/20 to-teal-600/20 border border-cyan-500/20 p-8 rounded-[2.5rem] relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-cyan-500/20 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700" />
                <div className="flex items-start gap-5 relative z-10">
                  <div className="p-3 bg-cyan-600/20 rounded-2xl shadow-xl">
                    <AlertTriangle className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-2">Integration Ready</h4>
                    <p className="text-sm text-slate-400 leading-relaxed font-medium">
                      Your API endpoints are ready for Discord and Minecraft integration. Visit the Admin Panel to generate access tokens.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
