import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDocs, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Users, 
  Shield, 
  Key, 
  Database, 
  Activity, 
  Trash2, 
  Edit2, 
  Save, 
  X,
  CheckCircle,
  AlertCircle,
  Terminal,
  Copy,
  RefreshCw,
  UserPlus,
  MessageSquare,
  ArrowUpCircle,
  ArrowDownCircle,
  Mail
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../context/AuthContext';
import { cn } from '../lib/utils';

interface User {
  uid: string;
  email: string;
  role: string;
  minecraftUsername?: string;
}

interface Invite {
  id: string;
  code: string;
  role: string;
  serverId?: string;
  used: boolean;
  createdAt: any;
}

interface Server {
  id: string;
  name: string;
}

export default function AdminPanel() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [apiToken, setApiToken] = useState('sk_test_51MzS...');
  const [isCopied, setIsCopied] = useState(false);
  
  // Invite form state
  const [inviteRole, setInviteRole] = useState('helper');
  const [inviteServer, setInviteServer] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const usersQ = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(usersQ, (snap) => {
      setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const invitesQ = query(collection(db, 'invites'), orderBy('createdAt', 'desc'));
    const unsubInvites = onSnapshot(invitesQ, (snap) => {
      setInvites(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invite)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'invites'));

    const serversQ = query(collection(db, 'servers'));
    const unsubServers = onSnapshot(serversQ, (snap) => {
      setServers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Server)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'servers'));

    return () => {
      unsubUsers();
      unsubInvites();
      unsubServers();
    };
  }, []);

  const handleRoleChange = async (uid: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handlePromote = (user: User) => {
    const roles = ['user', 'helper', 'mod', 'admin', 'owner'];
    const currentIndex = roles.indexOf(user.role);
    if (currentIndex < roles.length - 1) {
      handleRoleChange(user.uid, roles[currentIndex + 1]);
    }
  };

  const handleDemote = (user: User) => {
    const roles = ['user', 'helper', 'mod', 'admin', 'owner'];
    const currentIndex = roles.indexOf(user.role);
    if (currentIndex > 0) {
      handleRoleChange(user.uid, roles[currentIndex - 1]);
    }
  };

  const generateInvite = async () => {
    setIsGenerating(true);
    try {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      await addDoc(collection(db, 'invites'), {
        code,
        role: inviteRole,
        serverId: inviteServer || null,
        used: false,
        createdBy: profile?.uid,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'invites');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'invites', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `invites/${id}`);
    }
  };

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userServers, setUserServers] = useState<string[]>([]);

  const openUserModal = (user: User) => {
    setEditingUser(user);
    setUserServers((user as any).servers || []);
    setIsUserModalOpen(true);
  };

  const handleUpdateUserServers = async () => {
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, 'users', editingUser.uid), {
        servers: userServers
      });
      setIsUserModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${editingUser.uid}`);
    }
  };

  const toggleServer = (serverId: string) => {
    setUserServers(prev => 
      prev.includes(serverId) 
        ? prev.filter(id => id !== serverId)
        : [...prev, serverId]
    );
  };

  const copyToken = () => {
    navigator.clipboard.writeText(apiToken);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
          <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />
          Admin Control Panel
        </h2>
        <p className="text-slate-400 text-sm sm:text-base">Manage system-wide settings, users, and integrations.</p>
      </div>

      <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 p-1.5 rounded-2xl w-full sm:w-fit overflow-x-auto no-scrollbar">
        {[
          { id: 'users', label: 'Users', icon: Users },
          { id: 'invites', label: 'Invites', icon: UserPlus },
          { id: 'integrations', label: 'Integrations', icon: Key },
          { id: 'system', label: 'System', icon: Activity },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 sm:gap-3 transition-all whitespace-nowrap",
              activeTab === tab.id 
                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20" 
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-800/30">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Minecraft</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map((user) => (
                    <tr key={user.uid} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400 font-bold border border-slate-700">
                            {user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{user.email}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{user.uid}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.uid, e.target.value)}
                            disabled={user.uid === profile?.uid}
                            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all appearance-none"
                          >
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="mod">Moderator</option>
                            <option value="helper">Helper</option>
                            <option value="user">User</option>
                          </select>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => handlePromote(user)}
                              disabled={user.uid === profile?.uid || user.role === 'owner'}
                              className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all disabled:opacity-30"
                              title="Promote"
                            >
                              <ArrowUpCircle className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDemote(user)}
                              disabled={user.uid === profile?.uid || user.role === 'user'}
                              className="p-1.5 text-slate-500 hover:text-orange-400 hover:bg-orange-400/10 rounded-lg transition-all disabled:opacity-30"
                              title="Demote"
                            >
                              <ArrowDownCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-400">{user.minecraftUsername || 'Not linked'}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openUserModal(user)}
                            className="p-2 text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-xl transition-all"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={async () => {
                              if (!window.confirm('Are you sure you want to permanently delete this user?')) return;
                              try {
                                await deleteDoc(doc(db, 'users', user.uid));
                              } catch (err) {
                                handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}`);
                              }
                            }}
                            disabled={user.uid === profile?.uid}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all disabled:opacity-30"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'integrations' && (
          <motion.div
            key="integrations"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Discord Integration */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-cyan-600/20 rounded-2xl">
                  <MessageSquare className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Discord Bot Integration</h3>
                  <p className="text-sm text-slate-500">Sync roles and automate notifications.</p>
                </div>
              </div>

              <div className="bg-cyan-500/5 border border-cyan-500/20 p-5 rounded-2xl space-y-3">
                <h4 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Setup Instructions
                </h4>
                <ul className="text-xs text-slate-400 space-y-2 list-disc ml-4 leading-relaxed">
                  <li>Create a bot at the <a href="https://discord.com/developers/applications" target="_blank" className="text-cyan-400 hover:underline">Discord Developer Portal</a>.</li>
                  <li>Enable <strong>Server Members Intent</strong> and <strong>Message Content Intent</strong>.</li>
                  <li>Invite the bot with <strong>Administrator</strong> or <strong>Manage Roles</strong> permissions.</li>
                  <li>Add your bot token as <code>DISCORD_BOT_TOKEN</code> in the <strong>Secrets</strong> panel.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Discord API Key</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl font-mono text-sm text-slate-400 flex items-center justify-between">
                      <span className="truncate">{apiToken}</span>
                      <button onClick={copyToken} className="hover:text-cyan-400 transition-colors shrink-0 ml-2">
                        {isCopied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <button className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-all">
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <button className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/20">
                  Configure Discord Webhooks
                </button>
              </div>
            </div>

            {/* Minecraft Integration */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-600/20 rounded-2xl">
                  <Database className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Minecraft Plugin Integration</h3>
                  <p className="text-sm text-slate-500">Sync punishments and staff status in-game.</p>
                </div>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl space-y-3">
                <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Setup Instructions
                </h4>
                <ul className="text-xs text-slate-400 space-y-2 list-disc ml-4 leading-relaxed">
                  <li>Download the <strong>StaffManager.jar</strong> plugin.</li>
                  <li>Drop it into your server's <code>/plugins</code> folder.</li>
                  <li>Restart your server to generate the <code>config.yml</code>.</li>
                  <li>Add your API key as <code>MINECRAFT_API_KEY</code> in the <strong>Secrets</strong> panel.</li>
                  <li>Set the <code>api-key</code> in <code>config.yml</code> to match.</li>
                  <li className="text-amber-400 font-medium italic">Note: The API URL is already baked into the plugin source.</li>
                </ul>
                <a 
                  href="/api/minecraft/source" 
                  download="StaffManager-Source.txt"
                  className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors mt-2"
                >
                  <Database className="w-3 h-3" />
                  Download Plugin Source Code (.txt)
                </a>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Minecraft API Key</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl font-mono text-sm text-slate-400 flex items-center justify-between">
                      <span className="truncate">{apiToken}</span>
                      <button onClick={copyToken} className="hover:text-cyan-400 transition-colors shrink-0 ml-2">
                        {isCopied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <button className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-all">
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Plugin Version</span>
                  <span className="text-xs font-bold text-white">v1.2.4 (Latest)</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'invites' && (
          <motion.div
            key="invites"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
              <div className="flex flex-col md:flex-row md:items-end gap-6">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium text-slate-300 ml-1">Assign Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                  >
                    <option value="admin">Admin</option>
                    <option value="mod">Moderator</option>
                    <option value="helper">Helper</option>
                  </select>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium text-slate-300 ml-1">Assign to Server (Optional)</label>
                  <select
                    value={inviteServer}
                    onChange={(e) => setInviteServer(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                  >
                    <option value="">Global Staff</option>
                    {servers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={generateInvite}
                  disabled={isGenerating}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                  Generate Invite
                </button>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-800/30">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Invite Code</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Server</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {invites.map((invite) => (
                      <tr key={invite.id} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <code className="bg-slate-800 px-2 py-1 rounded text-cyan-400 font-mono font-bold">{invite.code}</code>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(invite.code);
                              }}
                              className="p-1 text-slate-500 hover:text-white transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-300 uppercase">{invite.role}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-400">
                            {invite.serverId ? servers.find(s => s.id === invite.serverId)?.name : 'Global'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {invite.used ? (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                              <CheckCircle className="w-3 h-3" /> USED
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                              <Activity className="w-3 h-3" /> ACTIVE
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteInvite(invite.id)}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {invites.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                          No active invites. Generate one above to add staff.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          key="system"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            { label: 'Database Load', value: '12%', status: 'Healthy', icon: Database, color: 'text-emerald-400' },
            { label: 'API Latency', value: '45ms', status: 'Optimal', icon: Activity, color: 'text-blue-400' },
            { label: 'Active Sessions', value: '24', status: 'Normal', icon: Users, color: 'text-teal-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div className={cn("p-2 rounded-lg bg-slate-800", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className={cn("text-[10px] font-bold uppercase tracking-wider", stat.color)}>{stat.status}</span>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* User Edit Modal */}
      <AnimatePresence>
        {isUserModalOpen && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUserModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-8 relative shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-white">Edit User</h3>
                  <p className="text-sm text-slate-500">{editingUser.email}</p>
                </div>
                <button onClick={() => setIsUserModalOpen(false)} className="p-2 text-slate-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Role Management
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {['owner', 'admin', 'mod', 'helper', 'user'].map((role) => (
                      <button
                        key={role}
                        onClick={() => handleRoleChange(editingUser.uid, role)}
                        disabled={editingUser.uid === profile?.uid && role !== 'owner'}
                        className={cn(
                          "px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all",
                          editingUser.role === role
                            ? "bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                            : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                        )}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Server Assignments
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {servers.map((server) => (
                      <button
                        key={server.id}
                        onClick={() => toggleServer(server.id)}
                        className={cn(
                          "px-4 py-3 rounded-xl text-xs font-bold text-left border transition-all flex items-center justify-between",
                          userServers.includes(server.id)
                            ? "bg-emerald-600/10 border-emerald-500/50 text-emerald-400"
                            : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                        )}
                      >
                        <span className="truncate">{server.name}</span>
                        {userServers.includes(server.id) && <CheckCircle className="w-4 h-4 shrink-0" />}
                      </button>
                    ))}
                    {servers.length === 0 && (
                      <p className="col-span-full text-center py-4 text-slate-500 text-xs italic">No servers created yet.</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleUpdateUserServers}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
