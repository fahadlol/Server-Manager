import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  MoreVertical, 
  Trash2, 
  Edit2, 
  Settings, 
  Globe, 
  Shield, 
  Layout, 
  X,
  Palette
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../context/AuthContext';
import { cn } from '../lib/utils';

interface Server {
  id: string;
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  ownerUid: string;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
  };
  staff?: string[];
}

export default function Servers() {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [servers, setServers] = useState<Server[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [newServerName, setNewServerName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0891b2');
  const [secondaryColor, setSecondaryColor] = useState('#0f172a');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'servers'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setServers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Server)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'servers'));

    return () => unsubscribe();
  }, []);

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName.trim()) return;

    try {
      const serverData = {
        name: newServerName,
        logoUrl: logoUrl || null,
        websiteUrl: websiteUrl || null,
        theme: {
          primaryColor,
          secondaryColor
        }
      };

      if (editingServer) {
        await updateDoc(doc(db, 'servers', editingServer.id), serverData);
      } else {
        await addDoc(collection(db, 'servers'), {
          ...serverData,
          ownerUid: profile?.uid,
          staff: [profile?.uid]
        });
      }
      setNewServerName('');
      setLogoUrl('');
      setWebsiteUrl('');
      setPrimaryColor('#0891b2');
      setSecondaryColor('#0f172a');
      setEditingServer(null);
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'servers');
    }
  };

  const handleDeleteServer = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this server? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'servers', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `servers/${id}`);
    }
  };

  const openEditModal = (server: Server) => {
    setEditingServer(server);
    setNewServerName(server.name);
    setLogoUrl(server.logoUrl || '');
    setWebsiteUrl(server.websiteUrl || '');
    setPrimaryColor(server.theme?.primaryColor || '#0891b2');
    setSecondaryColor(server.theme?.secondaryColor || '#0f172a');
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Servers</h2>
          <p className="text-slate-400 text-sm sm:text-base">Manage your connected Minecraft servers and their staff teams.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditingServer(null); setNewServerName(''); setIsModalOpen(true); }}
            className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-5 h-5" />
            <span>Add Server</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {servers.map((server, i) => (
          <motion.div
            key={server.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden group hover:border-cyan-500/50 transition-all"
          >
            <div className="h-32 bg-gradient-to-br from-cyan-600/20 to-teal-600/20 relative">
              <div className="absolute inset-0 bg-slate-950/40" />
              <div className="absolute -bottom-8 left-6">
                {server.logoUrl ? (
                  <img src={server.logoUrl} alt={server.name} className="w-20 h-20 rounded-2xl border-4 border-slate-900 shadow-xl object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-cyan-600 border-4 border-slate-900 shadow-xl flex items-center justify-center text-3xl font-bold text-white">
                    {server.name[0]}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 pt-12">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{server.name}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-2">
                    <Globe className="w-3 h-3" />
                    {server.websiteUrl ? (
                      <a href={server.websiteUrl} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">
                        {server.websiteUrl.replace(/^https?:\/\//, '').split('/')[0]}
                      </a>
                    ) : (
                      `play.${server.name.toLowerCase().replace(/\s+/g, '')}.com`
                    )}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditModal(server)} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-xl transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteServer(server.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Staff Members</p>
                  <p className="text-lg font-bold text-white">{server.staff?.length || 0}</p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                  <p className="text-lg font-bold text-emerald-500">Active</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => navigate(`/servers/${server.id}`)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Staff Panel
                </button>
                <button 
                  onClick={() => openEditModal(server)}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all"
                >
                  <Palette className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
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
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 relative shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-white">{editingServer ? 'Edit Server' : 'Add New Server'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateServer} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 ml-1">Server Name</label>
                  <input
                    type="text"
                    required
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    placeholder="e.g. Survival Hub"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 ml-1">Logo URL (Optional)</label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 ml-1">Website URL (Optional)</label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    placeholder="https://example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">Primary Color</label>
                    <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 p-3 rounded-xl">
                      <input 
                        type="color" 
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer"
                      />
                      <span className="text-xs text-slate-400 font-mono uppercase">{primaryColor}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">Secondary Color</label>
                    <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 p-3 rounded-xl">
                      <input 
                        type="color" 
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer"
                      />
                      <span className="text-xs text-slate-400 font-mono uppercase">{secondaryColor}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-cyan-500/20"
                >
                  {editingServer ? 'Save Changes' : 'Create Server'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
