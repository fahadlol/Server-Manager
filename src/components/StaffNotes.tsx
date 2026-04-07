import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  StickyNote, 
  Plus, 
  Trash2, 
  Clock, 
  User, 
  X,
  Send,
  AlertCircle
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface StaffNote {
  id: string;
  targetUid: string;
  authorUid: string;
  authorName: string;
  content: string;
  createdAt: any;
}

interface StaffNotesProps {
  targetUid: string;
  targetName: string;
  onClose?: () => void;
}

export default function StaffNotes({ targetUid, targetName, onClose }: StaffNotesProps) {
  const { profile, isAdmin } = useAuth();
  const [notes, setNotes] = useState<StaffNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(
      collection(db, 'staff_notes'),
      where('targetUid', '==', targetUid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setNotes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffNote)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'staff_notes');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [targetUid, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !profile || submitting) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'staff_notes'), {
        targetUid,
        authorUid: profile.uid,
        authorName: profile.minecraftUsername || profile.email,
        content: newNote.trim(),
        createdAt: serverTimestamp()
      });
      setNewNote('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'staff_notes');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      await deleteDoc(doc(db, 'staff_notes', noteId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `staff_notes/${noteId}`);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-600/20 rounded-xl">
            <StickyNote className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Staff Notes</h3>
            <p className="text-xs text-slate-500">Private records for {targetName}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mb-6 relative">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a private note about this staff member..."
          className="w-full bg-slate-950 border border-slate-800 text-white p-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all resize-none h-24 text-sm"
        />
        <button
          type="submit"
          disabled={!newNote.trim() || submitting}
          className="absolute bottom-3 right-3 p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-cyan-600/20 border-t-cyan-600 rounded-full animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800">
            <StickyNote className="w-8 h-8 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No notes found for this member.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {notes.map((note) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center">
                      <User className="w-3 h-3 text-slate-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-300">{note.authorName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {note.createdAt ? format(note.createdAt.toDate(), 'MMM d, h:mm a') : 'Just now'}
                    </span>
                    {(profile?.uid === note.authorUid || profile?.role === 'owner') && (
                      <button 
                        onClick={() => handleDelete(note.id)}
                        className="p-1 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {note.content}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-800 flex items-center gap-2 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
        <AlertCircle className="w-3 h-3 text-amber-500/50" />
        Notes are only visible to Admins and Owners
      </div>
    </div>
  );
}
