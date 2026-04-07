import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, where, updateDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  X,
  User,
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../context/AuthContext';
import { sendNotification } from '../lib/notifications';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '../lib/utils';

interface LOA {
  id: string;
  staffUid: string;
  staffName?: string;
  serverId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export default function LOA() {
  const { profile, isAdmin } = useAuth();
  const [loas, setLoas] = useState<LOA[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
  });

  useEffect(() => {
    const q = isAdmin 
      ? query(collection(db, 'loas'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'loas'), where('staffUid', '==', profile?.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snap) => {
      setLoas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LOA)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'loas'));

    return () => unsubscribe();
  }, [isAdmin, profile?.uid]);

  const handleSubmitLOA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate || !formData.reason) return;

    try {
      await addDoc(collection(db, 'loas'), {
        ...formData,
        staffUid: profile?.uid,
        staffName: profile?.minecraftUsername || profile?.email,
        serverId: 'global',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setIsModalOpen(false);
      setFormData({ startDate: '', endDate: '', reason: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'loas');
    }
  };

  const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const loa = loas.find(l => l.id === id);
      await updateDoc(doc(db, 'loas', id), { status });
      
      if (loa) {
        await sendNotification(
          loa.staffUid,
          `LOA Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          `Your leave of absence request from ${format(new Date(loa.startDate), 'MMM d')} to ${format(new Date(loa.endDate), 'MMM d')} has been ${status}.`,
          status === 'approved' ? 'success' : 'error',
          '/loa'
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `loas/${id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Leave of Absence</h2>
          <p className="text-slate-400 text-sm sm:text-base">Manage time-off requests for the staff team.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-5 h-5" />
          <span>Request LOA</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {loas.length > 0 ? loas.map((loa, i) => (
          <motion.div
            key={loa.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 group hover:border-cyan-500/30 transition-all"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{loa.staffName}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Requested {loa.createdAt?.toDate ? formatDistanceToNow(loa.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                  </p>
                </div>
              </div>
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                loa.status === 'approved' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                loa.status === 'rejected' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                "bg-amber-500/10 text-amber-400 border-amber-500/20"
              )}>
                {loa.status}
              </span>
            </div>

            <div className="bg-slate-800/30 rounded-2xl p-4 mb-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Date</p>
                  <p className="text-slate-200 font-medium">{format(new Date(loa.startDate), 'MMM d, yyyy')}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">End Date</p>
                  <p className="text-slate-200 font-medium">{format(new Date(loa.endDate), 'MMM d, yyyy')}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-700/50">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reason</p>
                <p className="text-sm text-slate-400 leading-relaxed italic">"{loa.reason}"</p>
              </div>
            </div>

            {isAdmin && loa.status === 'pending' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleStatusUpdate(loa.id, 'approved')}
                  className="flex-1 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border border-emerald-600/20"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => handleStatusUpdate(loa.id, 'rejected')}
                  className="flex-1 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border border-red-600/20"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            )}
          </motion.div>
        )) : (
          <div className="lg:col-span-2 py-20 text-center text-slate-500 italic">
            No leave of absence requests found.
          </div>
        )}
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
                    <Calendar className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Request LOA</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmitLOA} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 ml-1">Reason for Absence</label>
                  <textarea
                    required
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={4}
                    className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-none"
                    placeholder="Provide a detailed reason for your leave..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                >
                  <Calendar className="w-5 h-5" />
                  <span>Submit Request</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
