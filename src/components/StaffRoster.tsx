import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  UserPlus, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Mail,
  MessageSquare,
  Hash,
  StickyNote,
  X
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../context/AuthContext';
import { sendNotification } from '../lib/notifications';
import { cn } from '../lib/utils';
import StaffNotes from './StaffNotes';

interface StaffMember {
  uid: string;
  email: string;
  minecraftUsername?: string;
  minecraftUuid?: string;
  discordUsername?: string;
  role: 'owner' | 'admin' | 'mod' | 'helper' | 'user';
  status?: 'active' | 'inactive' | 'loa';
}

const roleConfig = {
  owner: { label: 'Owner', icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
  admin: { label: 'Admin', icon: ShieldCheck, color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/20' },
  mod: { label: 'Moderator', icon: Shield, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  helper: { label: 'Helper', icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  user: { label: 'User', icon: Shield, color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20' },
};

export default function StaffRoster() {
  const { profile, isAdmin } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', 'in', ['owner', 'admin', 'mod', 'helper']));
    const unsubscribe = onSnapshot(q, (snap) => {
      setStaff(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as StaffMember)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    return () => unsubscribe();
  }, []);

  const handlePromote = async (member: StaffMember) => {
    let nextRole: StaffMember['role'] = member.role;
    if (member.role === 'helper') nextRole = 'mod';
    else if (member.role === 'mod') nextRole = 'admin';
    
    if (nextRole === member.role) return;

    try {
      await updateDoc(doc(db, 'users', member.uid), { role: nextRole });
      await sendNotification(
        member.uid,
        'Promotion!',
        `Congratulations! You have been promoted to ${nextRole.toUpperCase()}.`,
        'success',
        '/profile'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${member.uid}`);
    }
  };

  const handleDemote = async (member: StaffMember) => {
    let nextRole: StaffMember['role'] = member.role;
    if (member.role === 'admin') nextRole = 'mod';
    else if (member.role === 'mod') nextRole = 'helper';
    else if (member.role === 'helper') nextRole = 'user';

    try {
      await updateDoc(doc(db, 'users', member.uid), { role: nextRole });
      await sendNotification(
        member.uid,
        'Role Update',
        `Your role has been updated to ${nextRole.toUpperCase()}.`,
        nextRole === 'user' ? 'error' : 'warning',
        '/profile'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${member.uid}`);
    }
  };

  const handleRemove = async (uid: string) => {
    if (!window.confirm('Are you sure you want to remove this staff member? Their role will be reset to User.')) return;
    try {
      await updateDoc(doc(db, 'users', uid), { role: 'user' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const filteredStaff = staff.filter(m => {
    const matchesSearch = 
      m.email.toLowerCase().includes(search.toLowerCase()) || 
      m.minecraftUsername?.toLowerCase().includes(search.toLowerCase()) ||
      m.discordUsername?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'all' || m.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Staff Roster</h2>
          <p className="text-slate-400 text-sm sm:text-base">View and manage all staff members across the network.</p>
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

          <div className="flex items-center gap-1 bg-slate-900/50 border border-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar">
            {['all', 'admin', 'mod', 'helper'].map((role) => (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                className={cn(
                  "px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                  filterRole === role 
                    ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20" 
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                )}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <AnimatePresence mode="popLayout">
          {filteredStaff.map((member, i) => {
            const config = roleConfig[member.role];
            return (
              <motion.div
                key={member.uid}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 group hover:border-cyan-500/30 transition-all"
              >
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="relative">
                    <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-xl", config.bg)}>
                      {member.minecraftUsername ? (
                        <img 
                          src={`https://mc-heads.net/avatar/${member.minecraftUsername}/80`} 
                          alt={member.minecraftUsername}
                          className="w-full h-full rounded-2xl object-cover"
                        />
                      ) : member.email[0].toUpperCase()}
                    </div>
                    <div className={cn("absolute -bottom-2 -right-2 p-1.5 rounded-lg border-2 border-slate-900", config.bg, config.border)}>
                      <config.icon className={cn("w-4 h-4", config.color)} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-bold text-white truncate">{member.minecraftUsername || 'Unknown IGN'}</h3>
                          <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border", config.bg, config.color, config.border)}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 flex items-center gap-2">
                          <Mail className="w-3 h-3" />
                          {member.email}
                        </p>
                      </div>

                      {isAdmin && member.role !== 'owner' && (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => {
                              setSelectedStaff(member);
                              setShowNotes(true);
                            }}
                            className="p-2 text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-xl transition-all"
                            title="Staff Notes"
                          >
                            <StickyNote className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handlePromote(member)}
                            disabled={member.role === 'admin'}
                            className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-xl transition-all disabled:opacity-30"
                            title="Promote"
                          >
                            <ArrowUpCircle className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDemote(member)}
                            className="p-2 text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 rounded-xl transition-all"
                            title="Demote"
                          >
                            <ArrowDownCircle className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleRemove(member.uid)}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                            title="Remove from Staff"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          Discord
                        </p>
                        <p className="text-sm text-slate-300 font-medium truncate">{member.discordUsername || 'Not linked'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          UUID
                        </p>
                        <p className="text-sm text-slate-300 font-medium truncate font-mono text-xs">{member.minecraftUuid?.slice(0, 8) || 'N/A'}...</p>
                      </div>
                      <div className="space-y-1 hidden sm:block">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          Status
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                          <span className="text-sm text-slate-300 font-medium">Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {showNotes && selectedStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotes(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <StaffNotes 
                  targetUid={selectedStaff.uid} 
                  targetName={selectedStaff.minecraftUsername || selectedStaff.email}
                  onClose={() => setShowNotes(false)}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
