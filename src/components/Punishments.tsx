import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gavel, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Shield, 
  AlertTriangle, 
  X,
  Calendar,
  FileText,
  Link as LinkIcon
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../context/AuthContext';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '../lib/utils';

interface Punishment {
  id: string;
  serverId: string;
  playerUsername: string;
  staffUid: string;
  type: 'warn' | 'mute' | 'tempban' | 'permban';
  reason: string;
  timestamp: any;
  proofUrl?: string;
  active?: boolean;
  expiresAt?: any;
}

export default function Punishments() {
  const { profile, isStaff, isAdmin } = useAuth();
  const [punishments, setPunishments] = useState<Punishment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    playerUsername: '',
    type: 'warn',
    reason: '',
    proofUrl: '',
    duration: '', // for temp punishments
  });

  useEffect(() => {
    const q = query(collection(db, 'punishments'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setPunishments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Punishment)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'punishments'));

    return () => unsubscribe();
  }, []);

  const handleLogPunishment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.playerUsername || !formData.reason) return;

    try {
      await addDoc(collection(db, 'punishments'), {
        ...formData,
        serverId: 'global', // Default for now
        staffUid: profile?.uid,
        staffName: profile?.minecraftUsername || profile?.email,
        timestamp: serverTimestamp(),
        active: true,
      });
      setIsModalOpen(false);
      setFormData({ playerUsername: '', type: 'warn', reason: '', proofUrl: '', duration: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'punishments');
    }
  };

  const filteredPunishments = punishments.filter(p => {
    const matchesSearch = p.playerUsername.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || p.type === filterType;
    
    // Permission check for visibility
    const canSee = 
      isAdmin || 
      (profile?.role === 'mod' && ['warn', 'mute', 'tempban', 'permban'].includes(p.type)) ||
      (profile?.role === 'helper' && ['warn', 'mute'].includes(p.type));

    return matchesSearch && matchesType && canSee;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Punishment Logs</h2>
          <p className="text-slate-400 text-sm sm:text-base">Track and manage player punishments across all servers.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative group flex-1 min-w-0 sm:min-w-[240px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 text-white pl-12 pr-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-sm sm:text-base"
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-5 h-5" />
            <span>Log Punishment</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-slate-900/50 border border-slate-800 p-1 rounded-2xl w-fit overflow-x-auto no-scrollbar">
        {['all', 'warn', 'mute', 'tempban', 'permban'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={cn(
              "px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
              filterType === type 
                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20" 
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
            )}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/30">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Player</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Staff</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredPunishments.length > 0 ? filteredPunishments.map((pun, i) => (
                <motion.tr
                  key={pun.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="hover:bg-slate-800/30 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                        <img src={`https://mc-heads.net/avatar/${pun.playerUsername}/32`} alt={pun.playerUsername} className="w-full h-full rounded-lg" />
                      </div>
                      <span className="text-sm font-medium text-slate-200">{pun.playerUsername}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      pun.type === 'permban' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                      pun.type === 'tempban' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                      pun.type === 'mute' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                      "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    )}>
                      {pun.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Shield className="w-3 h-3" />
                      {(pun as any).staffName || 'System'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-400 line-clamp-1 max-w-xs">{pun.reason}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-300">{pun.timestamp?.toDate ? formatDistanceToNow(pun.timestamp.toDate(), { addSuffix: true }) : 'Just now'}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">{pun.timestamp?.toDate ? format(pun.timestamp.toDate(), 'MMM d, yyyy HH:mm') : ''}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {pun.proofUrl && (
                        <a href={pun.proofUrl} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-xl transition-all">
                          <LinkIcon className="w-4 h-4" />
                        </a>
                      )}
                      <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all">
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-500">
                      <div className="p-4 bg-slate-800/50 rounded-full">
                        <Gavel className="w-12 h-12 opacity-20" />
                      </div>
                      <p className="italic">No punishments found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-8 relative shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-600/20 rounded-xl">
                    <Gavel className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Log Punishment</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleLogPunishment} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">Player Username</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={formData.playerUsername}
                        onChange={(e) => setFormData({ ...formData, playerUsername: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 text-white pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                        placeholder="e.g. Notch"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">Punishment Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all appearance-none"
                    >
                      <option value="warn">Warn</option>
                      <option value="mute">Mute</option>
                      <option value="tempban">Temp Ban</option>
                      <option value="permban">Perm Ban</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 ml-1">Reason</label>
                  <textarea
                    required
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={3}
                    className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-none"
                    placeholder="Describe the violation..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 ml-1">Proof URL (Optional)</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="url"
                      value={formData.proofUrl}
                      onChange={(e) => setFormData({ ...formData, proofUrl: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                      placeholder="https://imgur.com/..."
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                >
                  <Gavel className="w-5 h-5" />
                  <span>Confirm Punishment</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
