import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  User, 
  Clock, 
  Send, 
  X,
  ChevronRight,
  Hash,
  MoreVertical
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../context/AuthContext';
import { sendNotification } from '../lib/notifications';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';

interface Message {
  authorUid: string;
  authorName: string;
  content: string;
  timestamp: any;
}

interface Thread {
  id: string;
  serverId: string;
  title: string;
  authorUid: string;
  authorName: string;
  createdAt: any;
  messages: Message[];
}

export default function Threads() {
  const { profile } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [showMobileView, setShowMobileView] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'threads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setThreads(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Thread)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'threads'));

    return () => unsubscribe();
  }, []);

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThreadTitle.trim()) return;

    try {
      await addDoc(collection(db, 'threads'), {
        title: newThreadTitle,
        serverId: 'global',
        authorUid: profile?.uid,
        authorName: profile?.minecraftUsername || profile?.email,
        createdAt: serverTimestamp(),
        messages: []
      });
      setNewThreadTitle('');
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'threads');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedThread) return;

    try {
      const message: Message = {
        authorUid: profile?.uid || '',
        authorName: profile?.minecraftUsername || profile?.email || '',
        content: newMessage,
        timestamp: new Date().toISOString()
      };

      await updateDoc(doc(db, 'threads', selectedThread.id), {
        messages: arrayUnion(message)
      });

      // Notify thread author if someone else replies
      if (selectedThread.authorUid !== profile?.uid) {
        await sendNotification(
          selectedThread.authorUid,
          'New Reply in Thread',
          `${profile?.minecraftUsername || profile?.email} replied to your thread: ${selectedThread.title}`,
          'info',
          '/threads'
        );
      }

      setNewMessage('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `threads/${selectedThread?.id}`);
    }
  };

  const handleSelectThread = (thread: Thread) => {
    setSelectedThread(thread);
    setShowMobileView(true);
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex gap-8 relative overflow-hidden">
      {/* Thread List */}
      <div className={cn(
        "w-full lg:w-96 flex flex-col gap-6 transition-all duration-300",
        showMobileView ? "hidden lg:flex" : "flex"
      )}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-cyan-400" />
            Threads
          </h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search threads..."
            className="w-full bg-slate-900/50 border border-slate-800 text-white pl-11 pr-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => handleSelectThread(thread)}
              className={cn(
                "w-full text-left p-4 rounded-2xl border transition-all group",
                selectedThread?.id === thread.id 
                  ? "bg-cyan-600/10 border-cyan-600/50 shadow-lg shadow-cyan-500/10" 
                  : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className={cn("font-bold truncate pr-4 text-sm sm:text-base", selectedThread?.id === thread.id ? "text-cyan-400" : "text-white")}>
                  {thread.title}
                </h4>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">
                  {thread.messages.length} msgs
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                    {thread.authorName[0]}
                  </div>
                  <span className="text-xs text-slate-400 truncate max-w-[100px]">{thread.authorName}</span>
                </div>
                <span className="text-[10px] text-slate-600">
                  {thread.createdAt?.toDate ? formatDistanceToNow(thread.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Thread View */}
      <div className={cn(
        "flex-1 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden flex-col transition-all duration-300",
        showMobileView ? "flex" : "hidden lg:flex"
      )}>
        {selectedThread ? (
          <>
            <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/20">
              <div className="flex items-center gap-3 sm:gap-4">
                <button 
                  onClick={() => setShowMobileView(false)}
                  className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-6 h-6 rotate-180" />
                </button>
                <div className="p-2 bg-cyan-600/20 rounded-xl hidden sm:block">
                  <Hash className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-white truncate">{selectedThread.title}</h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 truncate">Started by {selectedThread.authorName}</p>
                </div>
              </div>
              <button className="p-2 text-slate-500 hover:text-white transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
              {selectedThread.messages.length > 0 ? selectedThread.messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-3 sm:gap-4", msg.authorUid === profile?.uid && "flex-row-reverse")}>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400 shrink-0 border border-slate-700">
                    <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className={cn("max-w-[85%] sm:max-w-[70%] space-y-1", msg.authorUid === profile?.uid && "text-right")}>
                    <div className="flex items-center gap-2 mb-1 justify-end flex-row-reverse">
                      <span className="text-[10px] text-slate-600">{formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}</span>
                      <span className="text-xs font-bold text-slate-300">{msg.authorName}</span>
                    </div>
                    <div className={cn(
                      "p-3 sm:p-4 rounded-2xl text-sm leading-relaxed",
                      msg.authorUid === profile?.uid 
                        ? "bg-cyan-600 text-white rounded-tr-none" 
                        : "bg-slate-800 text-slate-200 rounded-tl-none"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                  <MessageSquare className="w-12 h-12 opacity-20" />
                  <p className="italic text-sm">No messages yet. Start the conversation!</p>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-800/20">
              <form onSubmit={handleSendMessage} className="flex gap-3 sm:gap-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-slate-950 border border-slate-800 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-sm"
                />
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white p-3 sm:p-4 rounded-2xl transition-all shadow-lg shadow-cyan-500/20"
                >
                  <Send className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-6 p-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-800/50 rounded-full flex items-center justify-center border border-slate-700/50">
              <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 opacity-20" />
            </div>
            <div className="text-center">
              <h3 className="text-lg sm:text-xl font-bold text-slate-400 mb-2">Select a Thread</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xs">Choose a discussion from the list or create a new one to get started.</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Thread Modal */}
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
                <h3 className="text-2xl font-bold text-white">New Thread</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateThread} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 ml-1">Thread Title</label>
                  <input
                    type="text"
                    required
                    value={newThreadTitle}
                    onChange={(e) => setNewThreadTitle(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                    placeholder="e.g. Punishment Appeal Request"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-cyan-500/20"
                >
                  Create Thread
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
