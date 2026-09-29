'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  NotebookPen, 
  Plus, 
  Search, 
  Pin, 
  PinOff, 
  Trash2, 
  Copy, 
  Check, 
  Sparkles, 
  LoaderCircle, 
  Save, 
  X, 
  ArrowLeft, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  Clock,
  Layers,
  StickyNote
} from 'lucide-react';
import { db } from '@/lib/supabase';
import { type Row, type Data, noteCategories, noteColors, friendlyDate, formatBanglaDay, todayDate } from '@/lib/content';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

const LOCAL_STORAGE_KEY = 'content_desk_notes_v1';

export type NoteItem = {
  id: string;
  title: string;
  body: string;
  category: string;
  pinned: boolean;
  color: string;
  business_id?: string | null;
  tags?: string[];
  created_at: string;
  updated_at: string;
};

type NotepadProps = {
  data: Data;
  business: string;
  onConvertToContent?: (note: { title: string; script: string; business_id?: string }) => void;
  isDrawer?: boolean;
  onClose?: () => void;
};

export default function Notepad({ data, business, onConvertToContent, isDrawer = false, onClose }: NotepadProps) {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [mobileEditing, setMobileEditing] = useState(false);
  const [notice, setNotice] = useState('');

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId) || null, [notes, activeNoteId]);

  // 1. Initial Load: Try Supabase first, fallback to localStorage
  const loadNotes = useCallback(async () => {
    setLoading(true);
    let loadedFromCloud = false;
    let localNotes: NoteItem[] = [];

    // Read local cache first for instant display
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        localNotes = JSON.parse(cached);
      }
    } catch {
      // ignore
    }

    try {
      const { data: cloudNotes, error } = await db
        .from('notes')
        .select('*')
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) {
        // Table doesn't exist or RLS issue
        setIsCloudSynced(false);
        setNotes(localNotes);
        if (localNotes.length > 0 && !activeNoteId) {
          setActiveNoteId(localNotes[0].id);
        }
      } else if (cloudNotes) {
        loadedFromCloud = true;
        setIsCloudSynced(true);
        // Merge or use cloud data
        const mergedMap = new Map<string, NoteItem>();
        localNotes.forEach(n => mergedMap.set(n.id, n));
        (cloudNotes as NoteItem[]).forEach(n => mergedMap.set(n.id, n));
        const combined = Array.from(mergedMap.values()).sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return b.updated_at.localeCompare(a.updated_at);
        });
        setNotes(combined);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(combined));
        if (combined.length > 0 && !activeNoteId) {
          setActiveNoteId(combined[0].id);
        }
      }
    } catch {
      setIsCloudSynced(false);
      setNotes(localNotes);
      if (localNotes.length > 0 && !activeNoteId) {
        setActiveNoteId(localNotes[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [activeNoteId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Persist to localStorage whenever notes state changes
  const saveToLocal = (newNotes: NoteItem[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newNotes));
    } catch {
      // ignore
    }
  };

  // Create a new note
  const createNewNote = (category = 'general') => {
    const defaultBusinessId = business !== 'all' ? business : data.businesses.find(b => !b.archived_at)?.id || null;
    const newNote: NoteItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'note_' + Date.now(),
      title: '',
      body: '',
      category: category === 'all' ? 'general' : category,
      pinned: false,
      color: 'default',
      business_id: defaultBusinessId,
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    setActiveNoteId(newNote.id);
    saveToLocal(updated);
    setMobileEditing(true);

    // Save to cloud if synced
    if (isCloudSynced) {
      db.from('notes')
        .insert({
          id: newNote.id,
          title: newNote.title,
          body: newNote.body,
          category: newNote.category,
          pinned: newNote.pinned,
          color: newNote.color,
          business_id: newNote.business_id,
          tags: newNote.tags,
          created_at: newNote.created_at,
          updated_at: newNote.updated_at
        })
        .then(({ error }) => {
          if (error) console.error('Cloud insert error:', error);
        });
    }
  };

  // Immediate or debounced save for note updates
  const updateActiveNote = (updates: Partial<NoteItem>, immediate = false) => {
    if (!activeNoteId) return;

    const now = new Date().toISOString();
    const updatedNotes = notes.map(n => {
      if (n.id === activeNoteId) {
        return { ...n, ...updates, updated_at: now };
      }
      return n;
    });

    setNotes(updatedNotes);
    saveToLocal(updatedNotes);

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    const targetNote = updatedNotes.find(n => n.id === activeNoteId);
    if (!targetNote) return;

    if (immediate) {
      persistNoteToCloud(targetNote);
    } else {
      setSaveStatus('saving');
      autoSaveTimerRef.current = setTimeout(() => {
        persistNoteToCloud(targetNote);
      }, 500);
    }
  };

  const persistNoteToCloud = async (note: NoteItem) => {
    setSaveStatus('saving');
    try {
      if (isCloudSynced) {
        const { error } = await db.from('notes').upsert({
          id: note.id,
          title: note.title,
          body: note.body,
          category: note.category,
          pinned: note.pinned,
          color: note.color,
          business_id: note.business_id || null,
          tags: note.tags || [],
          updated_at: note.updated_at
        });

        if (error) {
          console.warn('Could not sync to Supabase notes table:', error.message);
          setSaveStatus('saved'); // Still saved in localStorage
        } else {
          setSaveStatus('saved');
        }
      } else {
        // Saved in localStorage
        setSaveStatus('saved');
      }
    } catch {
      setSaveStatus('saved');
    } finally {
      setTimeout(() => {
        setSaveStatus('idle');
      }, 1500);
    }
  };

  // Toggle Pinned
  const togglePin = (noteId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = notes.find(n => n.id === noteId);
    if (!target) return;
    const newPinned = !target.pinned;
    const updated = notes.map(n => n.id === noteId ? { ...n, pinned: newPinned, updated_at: new Date().toISOString() } : n)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updated_at.localeCompare(a.updated_at);
      });

    setNotes(updated);
    saveToLocal(updated);
    if (isCloudSynced) {
      db.from('notes').update({ pinned: newPinned, updated_at: new Date().toISOString() }).eq('id', noteId).then();
    }
    setNotice(newPinned ? 'নোটটি পিন করা হয়েছে 📌' : 'নোট আনপিন করা হয়েছে');
    setTimeout(() => setNotice(''), 2000);
  };

  // Delete note
  const deleteNote = async (noteId: string) => {
    const updated = notes.filter(n => n.id !== noteId);
    setNotes(updated);
    saveToLocal(updated);
    if (activeNoteId === noteId) {
      setActiveNoteId(updated.length > 0 ? updated[0].id : null);
      setMobileEditing(false);
    }
    setShowDeleteConfirm(null);

    if (isCloudSynced) {
      try {
        await db.from('notes').delete().eq('id', noteId);
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
    setNotice('নোট মুছে ফেলা হয়েছে');
    setTimeout(() => setNotice(''), 2000);
  };

  // Copy note text
  const copyNoteText = () => {
    if (!activeNote) return;
    const fullText = [activeNote.title, activeNote.body].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setNotice('নোট ক্লিপবোর্ডে কপি হয়েছে!');
    setTimeout(() => {
      setCopied(false);
      setNotice('');
    }, 2000);
  };

  // Convert note to Content Idea
  const handleConvertToContent = () => {
    if (!activeNote) return;
    if (onConvertToContent) {
      onConvertToContent({
        title: activeNote.title || activeNote.body.slice(0, 60) || 'নতুন আইডিয়া (নোটপ্যাড থেকে)',
        script: activeNote.body || '',
        business_id: activeNote.business_id || undefined
      });
      setNotice('কনটেন্ট লাইব্রেরিতে পাঠানো হয়েছে! 🚀');
      setTimeout(() => setNotice(''), 2500);
      if (isDrawer && onClose) onClose();
    }
  };

  // Filtered notes
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      // Category filter
      if (categoryFilter === 'pinned' && !n.pinned) return false;
      if (categoryFilter !== 'all' && categoryFilter !== 'pinned' && n.category !== categoryFilter) return false;
      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = (n.title || '').toLowerCase().includes(q);
        const matchesBody = (n.body || '').toLowerCase().includes(q);
        const matchesCategory = (noteCategories[n.category] || '').toLowerCase().includes(q);
        return matchesTitle || matchesBody || matchesCategory;
      }
      return true;
    }).sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updated_at.localeCompare(a.updated_at);
    });
  }, [notes, categoryFilter, search]);

  const wordCount = (activeNote?.body || '').trim() ? (activeNote?.body || '').trim().split(/\s+/).length : 0;
  const charCount = (activeNote?.body || '').length;

  return (
    <div className={`notepad-container ${isDrawer ? 'notepad-drawer-mode' : ''}`}>
      {/* Toast Notice */}
      {notice && (
        <div className="notepad-toast" role="status">
          <CheckCircle2 size={16} />
          <span>{notice}</span>
        </div>
      )}

      {/* Main Split Layout */}
      <div className="notepad-layout">
        {/* Left Column: Note List & Filters */}
        <aside className={`notepad-sidebar ${mobileEditing ? 'hidden-on-mobile' : ''}`}>
          <div className="notepad-sidebar-header">
            <div className="notepad-title-row">
              <div className="notepad-brand">
                <NotebookPen size={20} className="notepad-icon" />
                <h2>নোটপ্যাড</h2>
                <span className="count-pill">{notes.length}</span>
              </div>
              <button 
                type="button" 
                className="primary small-btn notepad-new-btn" 
                onClick={() => createNewNote(categoryFilter)}
                title="নতুন নোট তৈরি করো"
              >
                <Plus size={15} />
                <span>নতুন নোট</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="notepad-search-wrap">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                placeholder="নোট খুঁজুন (শিরোনাম, লেখা বা ধরন)..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="notepad-search-input"
              />
              {search && (
                <button type="button" className="clear-search-btn" onClick={() => setSearch('')}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="notepad-category-pills">
              <button 
                type="button" 
                className={`category-pill ${categoryFilter === 'all' ? 'active' : ''}`}
                onClick={() => setCategoryFilter('all')}
              >
                সব ({notes.length})
              </button>
              <button 
                type="button" 
                className={`category-pill ${categoryFilter === 'pinned' ? 'active' : ''}`}
                onClick={() => setCategoryFilter('pinned')}
              >
                📌 পিন ({notes.filter(n => n.pinned).length})
              </button>
              {Object.entries(noteCategories).filter(([k]) => k !== 'all').map(([key, label]) => {
                const count = notes.filter(n => n.category === key).length;
                if (count === 0 && categoryFilter !== key) return null;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`category-pill ${categoryFilter === key ? 'active' : ''}`}
                    onClick={() => setCategoryFilter(key)}
                  >
                    {label} {count > 0 && <span className="cat-count">({count})</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes List */}
          <div className="notepad-list-scroll">
            {loading ? (
              <div className="notepad-empty-state">
                <LoaderCircle size={22} className="spin" />
                <p>নোট লোড হচ্ছে…</p>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="notepad-empty-state">
                <StickyNote size={32} />
                <p>কোনো নোট পাওয়া যায়নি।</p>
                <button 
                  type="button" 
                  className="secondary small-btn" 
                  onClick={() => createNewNote(categoryFilter)}
                >
                  <Plus size={14} /> এখনই নোট লিখুন
                </button>
              </div>
            ) : (
              <div className="notes-cards-list">
                {filteredNotes.map(n => {
                  const isActive = n.id === activeNoteId;
                  const isPinned = n.pinned;
                  const categoryName = noteCategories[n.category] || 'সাধারণ নোট';
                  const titleDisplay = n.title.trim() || 'শিরোনামহীন নোট';
                  const bodySnippet = n.body.trim() ? n.body.trim().replace(/\n+/g, ' ') : 'কোনো বিবরণ লেখা হয়নি...';

                  return (
                    <div 
                      key={n.id}
                      className={`note-card ${isActive ? 'active' : ''} ${isPinned ? 'pinned-card' : ''} color-${n.color || 'default'}`}
                      onClick={() => {
                        setActiveNoteId(n.id);
                        setMobileEditing(true);
                      }}
                    >
                      <div className="note-card-top">
                        <strong className="note-card-title">{titleDisplay}</strong>
                        <button
                          type="button"
                          className={`note-pin-btn ${isPinned ? 'is-pinned' : ''}`}
                          onClick={(e) => togglePin(n.id, e)}
                          title={isPinned ? 'পিন সরানো' : 'উপরে পিন করো'}
                        >
                          <Pin size={14} />
                        </button>
                      </div>

                      <p className="note-card-snippet">{bodySnippet}</p>

                      <div className="note-card-footer">
                        <span className={`note-cat-badge cat-${n.category || 'general'}`}>
                          {categoryName}
                        </span>
                        <span className="note-date">{friendlyDate(n.updated_at, true)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sync Status in Sidebar Footer */}
          <div className="notepad-sidebar-footer">
            <div className="sync-indicator">
              {isCloudSynced ? (
                <span className="sync-badge cloud" title="নোটগুলো Supabase ক্লাউডে স্বয়ংক্রিয়ভাবে সংরক্ষিত হচ্ছে">
                  <CheckCircle2 size={13} /> ক্লাউড সিঙ্ক চালু
                </span>
              ) : (
                <div className="sync-fallback-wrap">
                  <span className="sync-badge local" title="ব্রাউজারের লোকাল স্টোরেজে নিরাপদে সংরক্ষিত">
                    💾 লোকাল মেমরি
                  </span>
                  <button 
                    type="button" 
                    className="sql-help-btn"
                    onClick={() => setShowSqlModal(true)}
                    title="Supabase-এ ক্লাউড সিঙ্ক চালু করার SQL স্ক্রিপ্ট দেখুন"
                  >
                    SQL ফাইল
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Right Column: Note Editor */}
        <main className={`notepad-editor-pane ${!mobileEditing ? 'hidden-on-mobile' : ''}`}>
          {activeNote ? (
            <div className="note-editor-wrapper">
              {/* Top Action Bar */}
              <div className="note-editor-topbar">
                {/* Back button for mobile */}
                <button 
                  type="button" 
                  className="icon-button mobile-back-btn" 
                  onClick={() => setMobileEditing(false)}
                  title="তালিকায় ফিরুন"
                >
                  <ArrowLeft size={18} />
                </button>

                {/* Category Picker */}
                <div className="editor-controls-group">
                  <select
                    value={activeNote.category || 'general'}
                    onChange={e => updateActiveNote({ category: e.target.value }, true)}
                    className="note-category-select"
                    title="নোটের ধরন বা ক্যাটাগরি"
                  >
                    {Object.entries(noteCategories).filter(([k]) => k !== 'all').map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>

                  {/* Business selector (optional) */}
                  {data.businesses.length > 0 && (
                    <select
                      value={activeNote.business_id || ''}
                      onChange={e => updateActiveNote({ business_id: e.target.value || null }, true)}
                      className="note-biz-select"
                      title="কোন বিজনেসের সাথে যুক্ত"
                    >
                      <option value="">সব বিজনেসে সাধারণ</option>
                      {data.businesses.filter(b => !b.archived_at).map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  )}

                  {/* Color Theme Selector */}
                  <div className="note-color-picker" title="নোটের ব্যাকগ্রাউন্ড কালার">
                    {Object.entries(noteColors).map(([colorKey, colorDef]) => (
                      <button
                        key={colorKey}
                        type="button"
                        className={`color-dot ${(activeNote.color || 'default') === colorKey ? 'selected' : ''}`}
                        style={{ backgroundColor: colorDef.bg, borderColor: colorDef.border }}
                        onClick={() => updateActiveNote({ color: colorKey }, true)}
                        title={colorDef.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="editor-actions-group">
                  {/* Pin Toggle */}
                  <button
                    type="button"
                    className={`secondary small-btn pin-toggle-btn ${activeNote.pinned ? 'pinned-active' : ''}`}
                    onClick={() => togglePin(activeNote.id)}
                    title={activeNote.pinned ? 'পিন ছাড়ান' : 'উপরে পিন করে রাখুন'}
                  >
                    <Pin size={15} />
                    <span>{activeNote.pinned ? 'পিন করা আছে' : 'পিন করো'}</span>
                  </button>

                  {/* Copy Button */}
                  <button
                    type="button"
                    className="secondary small-btn"
                    onClick={copyNoteText}
                    title="সম্পূর্ণ নোট কপি করো"
                  >
                    {copied ? <><Check size={14} /> কপি হয়েছে</> : <><Copy size={14} /> কপি</>}
                  </button>

                  {/* Convert to Content Idea Button */}
                  {onConvertToContent && (
                    <button
                      type="button"
                      className="primary small-btn convert-btn"
                      onClick={handleConvertToContent}
                      title="এই নোটটি কনটেন্ট লাইব্রেরিতে নতুন আইডিয়া হিসেবে পাঠাও"
                    >
                      <Sparkles size={14} />
                      <span>কনটেন্টে পাঠাও</span>
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => setShowDeleteConfirm(activeNote.id)}
                    title="নোটটি মুছে ফেলুন"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Note Title Input */}
              <div className="note-title-box">
                <input
                  type="text"
                  placeholder="নোটের শিরোনাম লিখুন..."
                  value={activeNote.title || ''}
                  onChange={e => updateActiveNote({ title: e.target.value })}
                  className="note-title-input"
                  maxLength={200}
                />
              </div>

              {/* Note Content Textarea */}
              <div className="note-body-box">
                <textarea
                  placeholder="এখানে আপনার নোট, আইডিয়া, চেকলিস্ট, ক্রেডেনশিয়াল বা ড্রাফট লিখুন... স্বয়ংক্রিয়ভাবে সেভ হবে।"
                  value={activeNote.body || ''}
                  onChange={e => updateActiveNote({ body: e.target.value })}
                  className="note-body-textarea"
                  spellCheck={false}
                />
              </div>

              {/* Bottom Metadata & Word/Char Counter */}
              <div className="note-editor-footer">
                <div className="note-stats-meta">
                  <span>{wordCount} শব্দ</span>
                  <span>·</span>
                  <span>{charCount} অক্ষর</span>
                  <span>·</span>
                  <span className="last-saved-time">
                    সর্বশেষ পরিবর্তন: {friendlyDate(activeNote.updated_at, true)}
                  </span>
                </div>

                <div className="save-status-indicator">
                  {saveStatus === 'saving' && (
                    <span className="saving-text">
                      <LoaderCircle size={13} className="spin" /> সেভ হচ্ছে…
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="saved-text">
                      <Check size={13} /> সংরক্ষিত হয়েছে
                    </span>
                  )}
                  {saveStatus === 'idle' && (
                    <button 
                      type="button" 
                      className="manual-save-btn" 
                      onClick={() => persistNoteToCloud(activeNote)}
                      title="তাৎক্ষণিক সেভ করো"
                    >
                      <Save size={13} /> সেভ করুন
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="no-active-note">
              <StickyNote size={48} className="empty-pen-icon" />
              <h3>কোনো নোট নির্বাচিত নেই</h3>
              <p>বামপাশের তালিকা থেকে একটি নোট নির্বাচন করুন অথবা নতুন নোট তৈরি করুন।</p>
              <button 
                type="button" 
                className="primary" 
                onClick={() => createNewNote()}
              >
                <Plus size={16} /> নতুন নোট তৈরি করো
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!showDeleteConfirm} onOpenChange={open => !open && setShowDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>এই নোটটি মুছে ফেলতে চান?</AlertDialogTitle>
            <AlertDialogDescription>
              নোটটি ডিলিট করলে তা চিরতরে মুছে যাবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => showDeleteConfirm && deleteNote(showDeleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              মুছে ফেলুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* SQL Migration Help Dialog */}
      <AlertDialog open={showSqlModal} onOpenChange={setShowSqlModal}>
        <AlertDialogContent className="editor-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Supabase ক্লাউড ডাটাবেজ সিঙ্ক সেটআপ</AlertDialogTitle>
            <AlertDialogDescription>
              আপনার নোটগুলো বর্তমানে ব্রাউজারের লোকাল স্টোরেজে নিরাপদে সেভ হচ্ছে। যেকোনো ডিভাইস থেকে সিঙ্ক করতে নিচের SQL স্ক্রিপ্টটি Supabase SQL Editor-এ একবার চালিয়ে নিন:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <pre className="sql-code-box">
{`-- 16-add-notes-notepad.sql
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade default auth.uid(),
  business_id uuid references public.businesses(id) on delete set null,
  title text not null default '',
  body text not null default '',
  category text not null default 'general',
  pinned boolean not null default false,
  color text default 'default',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;

create policy "notes_all_policy" on public.notes
  for all using (auth.uid() = owner_id or owner_id is null);`}
          </pre>
          <AlertDialogFooter>
            <AlertDialogCancel>বন্ধ করো</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              navigator.clipboard.writeText(`create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade default auth.uid(),
  business_id uuid references public.businesses(id) on delete set null,
  title text not null default '',
  body text not null default '',
  category text not null default 'general',
  pinned boolean not null default false,
  color text default 'default',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.notes enable row level security;
create policy "notes_all_policy" on public.notes for all using (auth.uid() = owner_id or owner_id is null);`);
              setNotice('SQL স্ক্রিপ্ট কপি হয়েছে!');
              setTimeout(() => setNotice(''), 2000);
            }}>
              SQL কোড কপি করো
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
