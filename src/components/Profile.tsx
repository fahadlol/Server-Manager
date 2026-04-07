import React, { useState } from 'react';
import { doc, updateDoc, collection, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  User, 
  Mail, 
  Shield, 
  MessageSquare, 
  Hash, 
  Save, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  UserPlus,
  RefreshCw,
  StickyNote
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../context/AuthContext';
import { cn } from '../lib/utils';
import StaffNotes from './StaffNotes';

export default function Profile() {
  const { profile, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const [formData, setFormData] = useState({
    minecraftUsername: profile?.minecraftUsername || '',
    minecraftUuid: profile?.minecraftUuid || '',
    discordUsername: profile?.discordUsername || '',
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await updateDoc(doc(db, 'users', profile?.uid || ''), formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile?.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid || !inviteCode.trim()) return;
    setInviteLoading(true);
    setError('');
    setSuccess(false);
    try {
      const q = query(collection(db, 'invites'), where('code', '==', inviteCode.trim().toUpperCase()), where('used', '==', false));
      const snap = await getDocs(q);
      if (snap.empty) {
        throw new Error('Invalid or already used invite code');
      }
      const inviteData = snap.docs[0].data();
      const inviteDocId = snap.docs[0].id;

      // Update user role and servers
      const updateData: any = { role: inviteData.role };
      if (inviteData.serverId) {
        updateData.servers = arrayUnion(inviteData.serverId);
      }

      await updateDoc(doc(db, 'users', profile.uid), updateData);

      // Mark invite as used
      await updateDoc(doc(db, 'invites', inviteDocId), {
        used: true,
        usedBy: profile.uid
      });

      setSuccess(true);
      setInviteCode('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile?.uid}`);
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
          <User className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />
          Your Profile
        </h2>
        <p className="text-slate-400 text-sm sm:text-base">Manage your linked accounts and personal information.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 text-center space-y-6">
            <div className="relative inline-block">
              <div className="w-32 h-32 rounded-3xl bg-cyan-600 flex items-center justify-center text-5xl font-bold text-white shadow-2xl shadow-cyan-500/20">
                {profile?.minecraftUsername ? (
                  <img 
                    src={`https://mc-heads.net/avatar/${profile.minecraftUsername}/128`} 
                    alt={profile.minecraftUsername}
                    className="w-full h-full rounded-3xl object-cover"
                  />
                ) : profile?.email[0].toUpperCase()}
              </div>
              <div className="absolute -bottom-2 -right-2 p-2 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-1">{profile?.minecraftUsername || 'Unknown Player'}</h3>
              <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">{profile?.role}</p>
            </div>

            <div className="pt-6 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-300 font-medium">{profile?.email}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Status</span>
                <span className="text-emerald-500 font-bold">ACTIVE</span>
              </div>
            </div>
          </div>

          <div className="bg-cyan-600/10 border border-cyan-600/20 p-6 rounded-3xl">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-cyan-600/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Account Security</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your account is managed via Firebase Auth. To change your password or email, please contact a system administrator.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <form onSubmit={handleUpdateProfile} className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 space-y-8 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1 flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-400" />
                  Minecraft Username
                </label>
                <input
                  type="text"
                  value={formData.minecraftUsername}
                  onChange={(e) => setFormData({ ...formData, minecraftUsername: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                  placeholder="e.g. Notch"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-cyan-400" />
                  Minecraft UUID
                </label>
                <input
                  type="text"
                  value={formData.minecraftUuid}
                  onChange={(e) => setFormData({ ...formData, minecraftUuid: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                  placeholder="e.g. 0693452b-..."
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-300 ml-1 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  Discord Username
                </label>
                <input
                  type="text"
                  value={formData.discordUsername}
                  onChange={(e) => setFormData({ ...formData, discordUsername: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                  placeholder="e.g. username#0000"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 flex items-center justify-between gap-4">
              <div className="flex-1">
                {success && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-emerald-500 text-sm font-bold"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Action completed successfully!
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-red-500 text-sm font-bold"
                  >
                    <AlertCircle className="w-5 h-5" />
                    {error}
                  </motion.div>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2",
                  loading && "opacity-70 cursor-not-allowed"
                )}
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-600/20 rounded-2xl">
                <UserPlus className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Redeem Staff Invite</h3>
                <p className="text-sm text-slate-500">Enter an invite code to upgrade your role.</p>
              </div>
            </div>

            <form onSubmit={handleRedeemInvite} className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all uppercase font-mono"
                placeholder="ABC-123-XYZ"
              />
              <button
                type="submit"
                disabled={inviteLoading || !inviteCode.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {inviteLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Redeem Code
              </button>
            </form>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <StaffNotes 
              targetUid={profile?.uid || ''} 
              targetName="Yourself" 
            />
          </div>
        )}
      </div>
    </div>
  );
}
