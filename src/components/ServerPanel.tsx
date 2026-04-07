import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Shield, 
  Users, 
  MessageSquare, 
  BookOpen, 
  ScrollText, 
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Settings,
  Palette,
  Image as ImageIcon
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../context/AuthContext';
import { where } from 'firebase/firestore';
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

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: any;
  authorUid: string;
}

interface Rule {
  id: string;
  content: string;
  order: number;
}

interface Guide {
  id: string;
  title: string;
  content: string;
}

export default function ServerPanel() {
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  
  const [server, setServer] = useState<Server | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('announcements');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'announcement' | 'rule' | 'guide'>('announcement');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });

  // Settings state
  const [settingsData, setSettingsData] = useState({
    name: '',
    logoUrl: '',
    websiteUrl: '',
    primaryColor: '#0891b2',
    secondaryColor: '#0f172a'
  });

  useEffect(() => {
    if (!serverId) return;

    const unsubServer = onSnapshot(doc(db, 'servers', serverId), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Server;
        setServer(data);
        setSettingsData({
          name: data.name,
          logoUrl: data.logoUrl || '',
          websiteUrl: data.websiteUrl || '',
          primaryColor: data.theme?.primaryColor || '#0891b2',
          secondaryColor: data.theme?.secondaryColor || '#0f172a'
        });
      } else {
        navigate('/servers');
      }
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, `servers/${serverId}`));

    const unsubAnnouncements = onSnapshot(
      query(collection(db, 'servers', serverId, 'announcements')),
      (snap) => {
        setAnnouncements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
      }
    );

    const unsubRules = onSnapshot(
      query(collection(db, 'servers', serverId, 'rules')),
      (snap) => {
        setRules(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rule)).sort((a, b) => a.order - b.order));
      }
    );

    const unsubGuides = onSnapshot(
      query(collection(db, 'servers', serverId, 'guides')),
      (snap) => {
        setGuides(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guide)));
      }
    );

    const unsubStaff = onSnapshot(
      query(collection(db, 'users'), where('servers', 'array-contains', serverId)),
      (snap) => {
        setStaffMembers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
      }
    );

    return () => {
      unsubServer();
      unsubAnnouncements();
      unsubRules();
      unsubGuides();
      unsubStaff();
    };
  }, [serverId, navigate]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverId) return;
    try {
      await updateDoc(doc(db, 'servers', serverId), {
        name: settingsData.name,
        logoUrl: settingsData.logoUrl || null,
        websiteUrl: settingsData.websiteUrl || null,
        theme: {
          primaryColor: settingsData.primaryColor,
          secondaryColor: settingsData.secondaryColor
        }
      });
      alert('Settings updated successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `servers/${serverId}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverId) return;

    try {
      const collectionName = modalType === 'announcement' ? 'announcements' : modalType === 'rule' ? 'rules' : 'guides';
      const data = modalType === 'announcement' 
        ? { title: formData.title, content: formData.content, authorUid: profile?.uid, createdAt: serverTimestamp() }
        : modalType === 'rule'
        ? { content: formData.content, order: rules.length }
        : { title: formData.title, content: formData.content };

      if (editingItem) {
        await updateDoc(doc(db, 'servers', serverId, collectionName, editingItem.id), data);
      } else {
        await addDoc(collection(db, 'servers', serverId, collectionName), data);
      }

      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({ title: '', content: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `servers/${serverId}`);
    }
  };

  const handleDelete = async (type: string, id: string) => {
    if (!serverId || !window.confirm('Are you sure?')) return;
    try {
      const collectionName = type === 'announcement' ? 'announcements' : type === 'rule' ? 'rules' : 'guides';
      await deleteDoc(doc(db, 'servers', serverId, collectionName, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `servers/${serverId}`);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading server panel...</div>;
  if (!server) return null;

  return (
    <div 
      className="space-y-8"
      style={{ 
        '--server-primary': server.theme?.primaryColor || '#0891b2',
        '--server-secondary': server.theme?.secondaryColor || '#0f172a'
      } as React.CSSProperties}
    >
      {/* Header */}
      <div className="flex flex-col gap-6">
        <button 
          onClick={() => navigate('/servers')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors w-fit"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Servers
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div 
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-bold text-white shadow-xl"
              style={{ backgroundColor: 'var(--server-primary)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
            >
              {server.logoUrl ? (
                <img src={server.logoUrl} alt={server.name} className="w-full h-full object-cover rounded-3xl" />
              ) : (
                server.name[0]
              )}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">{server.name}</h2>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-sm text-slate-400">
                  <Users className="w-4 h-4" />
                  {server.staff?.length || 0} Staff
                </span>
                <span className="flex items-center gap-1.5 text-sm text-emerald-400 font-bold">
                  <CheckCircle className="w-4 h-4" />
                  Online
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {server.websiteUrl && (
              <a 
                href={server.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Visit Website
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 p-1.5 rounded-2xl w-fit overflow-x-auto no-scrollbar">
        {[
          { id: 'announcements', label: 'Announcements', icon: MessageSquare },
          { id: 'rules', label: 'Rules', icon: ScrollText },
          { id: 'guides', label: 'Guides', icon: BookOpen },
          { id: 'staff', label: 'Staff Team', icon: Shield },
          { id: 'settings', label: 'Settings', icon: Settings, adminOnly: true },
        ].map((tab) => {
          if (tab.adminOnly && !isAdmin) return null;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-all whitespace-nowrap",
                isActive 
                  ? "text-white shadow-lg" 
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
              )}
              style={isActive ? { backgroundColor: 'var(--server-primary)', boxShadow: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)` } : {}}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'announcements' && (
            <motion.div
              key="announcements"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Latest Announcements</h3>
                {isAdmin && (
                  <button 
                    onClick={() => { setModalType('announcement'); setEditingItem(null); setFormData({ title: '', content: '' }); setIsModalOpen(true); }}
                    className="p-2 text-white rounded-xl transition-all"
                    style={{ backgroundColor: 'var(--server-primary)' }}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="grid gap-6">
                {announcements.map((ann) => (
                  <div key={ann.id} className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-lg font-bold text-white">{ann.title}</h4>
                        <p className="text-xs text-slate-500">Posted on {ann.createdAt?.toDate().toLocaleDateString()}</p>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => { setModalType('announcement'); setEditingItem(ann); setFormData({ title: ann.title, content: ann.content }); setIsModalOpen(true); }}
                            className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete('announcement', ann.id)}
                            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <div className="text-center py-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl text-slate-500">
                    No announcements yet.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'rules' && (
            <motion.div
              key="rules"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Server Rules</h3>
                {isAdmin && (
                  <button 
                    onClick={() => { setModalType('rule'); setEditingItem(null); setFormData({ title: '', content: '' }); setIsModalOpen(true); }}
                    className="p-2 text-white rounded-xl transition-all"
                    style={{ backgroundColor: 'var(--server-primary)' }}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl divide-y divide-slate-800">
                {rules.map((rule, i) => (
                  <div key={rule.id} className="p-6 flex items-start gap-6 group">
                    <span className="text-2xl font-black text-cyan-500/30 group-hover:text-cyan-500 transition-colors">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-slate-300 leading-relaxed">{rule.content}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setModalType('rule'); setEditingItem(rule); setFormData({ title: '', content: rule.content }); setIsModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete('rule', rule.id)}
                          className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {rules.length === 0 && (
                  <div className="p-12 text-center text-slate-500 italic">
                    No rules defined yet.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'guides' && (
            <motion.div
              key="guides"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Staff Guides</h3>
                {isAdmin && (
                  <button 
                    onClick={() => { setModalType('guide'); setEditingItem(null); setFormData({ title: '', content: '' }); setIsModalOpen(true); }}
                    className="p-2 text-white rounded-xl transition-all"
                    style={{ backgroundColor: 'var(--server-primary)' }}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {guides.map((guide) => (
                  <div key={guide.id} className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl space-y-4 hover:border-cyan-500/30 transition-all">
                    <div className="flex items-start justify-between">
                      <h4 className="text-lg font-bold text-white">{guide.title}</h4>
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => { setModalType('guide'); setEditingItem(guide); setFormData({ title: guide.title, content: guide.content }); setIsModalOpen(true); }}
                            className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete('guide', guide.id)}
                            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm line-clamp-3">{guide.content}</p>
                    <button className="text-cyan-400 text-xs font-bold hover:underline">Read Full Guide →</button>
                  </div>
                ))}
                {guides.length === 0 && (
                  <div className="col-span-full py-12 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl text-slate-500">
                    No guides available.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'staff' && (
            <motion.div
              key="staff"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Server Staff Team</h3>
                <p className="text-sm text-slate-500">{staffMembers.length} members assigned</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staffMembers.map((member) => (
                  <div key={member.uid} className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400 font-bold border border-slate-700">
                      {member.minecraftUsername ? (
                        <img src={`https://mc-heads.net/avatar/${member.minecraftUsername}/48`} alt={member.minecraftUsername} className="w-full h-full rounded-xl" />
                      ) : member.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-bold">{member.minecraftUsername || member.email.split('@')[0]}</p>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{member.role}</p>
                    </div>
                  </div>
                ))}
                {staffMembers.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-slate-900/30 border border-slate-800 rounded-3xl">
                    <Shield className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Staff Assigned</h3>
                    <p className="text-slate-500 max-w-md mx-auto">Use the Admin Panel to assign staff members to this server.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && isAdmin && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl"
            >
              <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl space-y-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-cyan-600/20 rounded-2xl">
                    <Settings className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Server Settings</h3>
                    <p className="text-sm text-slate-500">Update server identity and appearance.</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateSettings} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">Server Name</label>
                    <input
                      type="text"
                      required
                      value={settingsData.name}
                      onChange={(e) => setSettingsData({ ...settingsData, name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">Logo URL</label>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <input
                          type="url"
                          value={settingsData.logoUrl}
                          onChange={(e) => setSettingsData({ ...settingsData, logoUrl: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                          placeholder="https://..."
                        />
                      </div>
                      <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                        {settingsData.logoUrl ? (
                          <img src={settingsData.logoUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-600" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">Website URL</label>
                    <input
                      type="url"
                      value={settingsData.websiteUrl}
                      onChange={(e) => setSettingsData({ ...settingsData, websiteUrl: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300 ml-1 flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Primary Color
                      </label>
                      <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 p-3 rounded-xl">
                        <input 
                          type="color" 
                          value={settingsData.primaryColor}
                          onChange={(e) => setSettingsData({ ...settingsData, primaryColor: e.target.value })}
                          className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer"
                        />
                        <span className="text-xs text-slate-400 font-mono uppercase">{settingsData.primaryColor}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300 ml-1 flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Secondary Color
                      </label>
                      <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 p-3 rounded-xl">
                        <input 
                          type="color" 
                          value={settingsData.secondaryColor}
                          onChange={(e) => setSettingsData({ ...settingsData, secondaryColor: e.target.value })}
                          className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer"
                        />
                        <span className="text-xs text-slate-400 font-mono uppercase">{settingsData.secondaryColor}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                    style={{ backgroundColor: 'var(--server-primary)' }}
                  >
                    <Save className="w-5 h-5" />
                    Save Server Settings
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
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
              className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-8 relative shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-white">
                  {editingItem ? 'Edit' : 'Add'} {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                {modalType !== 'rule' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">Title</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                      placeholder="Enter title..."
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 ml-1">Content</label>
                  <textarea
                    required
                    rows={modalType === 'rule' ? 3 : 8}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all resize-none"
                    placeholder={modalType === 'rule' ? "Enter rule text..." : "Enter detailed content..."}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full text-white font-bold py-4 rounded-xl transition-all shadow-lg"
                  style={{ backgroundColor: 'var(--server-primary)' }}
                >
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
