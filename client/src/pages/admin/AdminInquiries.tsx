import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  CheckCircle2,
  Clock,
  Send,
  Trash2,
  ExternalLink,
  Phone,
  Mail,
  User,
  Calendar,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Inbox
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { ContactMessage, InquiryStats } from '../../types';

export const AdminInquiries: React.FC = () => {
  const { showToast } = useToast();

  const [inquiries, setInquiries] = useState<ContactMessage[]>([]);
  const [stats, setStats] = useState<InquiryStats>({ total: 0, unread: 0, read: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<ContactMessage | null>(null);

  // Filters & Pagination
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'READ' | 'RESOLVED'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Atelier Response Composer state
  const [replyMessage, setReplyMessage] = useState('');
  const [senderName, setSenderName] = useState('Atelier Concierge');
  const [markAsResolvedOnSend, setMarkAsResolvedOnSend] = useState(true);
  const [sendingReply, setSendingReply] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Mobile detail view toggle
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  const fetchInquiries = async (targetPage = page, keepSelection = true) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/inquiries', {
        params: {
          page: targetPage,
          limit: 15,
          status: activeTab,
          search: search.trim() || undefined
        }
      });

      const list: ContactMessage[] = res.data.inquiries || [];
      setInquiries(list);
      setTotalPages(res.data.totalPages || 1);
      if (res.data.stats) {
        setStats(res.data.stats);
      }

      // Preserve or auto-select first item
      if (list.length > 0) {
        if (!keepSelection || !selectedInquiry) {
          setSelectedInquiry(list[0]);
        } else {
          const match = list.find((item) => item.id === selectedInquiry.id);
          setSelectedInquiry(match || list[0]);
        }
      } else {
        setSelectedInquiry(null);
      }
    } catch (err: any) {
      console.error(err);
      showToast('Failed to load contact inquiries', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries(1, false);
    setPage(1);
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInquiries(1, false);
    setPage(1);
  };

  const handleSelectInquiry = async (item: ContactMessage) => {
    setSelectedInquiry(item);
    setIsMobileDetailOpen(true);
    setReplyMessage('');

    // If it's UNREAD, mark as READ automatically in the background
    if (item.status === 'UNREAD') {
      try {
        await api.put(`/admin/inquiries/${item.id}/status`, { status: 'READ' });
        setInquiries((prev) =>
          prev.map((inq) => (inq.id === item.id ? { ...inq, status: 'READ' } : inq))
        );
        setStats((prev) => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1),
          read: prev.read + 1
        }));
        setSelectedInquiry((prev) => (prev && prev.id === item.id ? { ...prev, status: 'READ' } : prev));
      } catch (err) {
        // silent fail on auto-read
      }
    }
  };

  const handleStatusChange = async (newStatus: 'UNREAD' | 'READ' | 'RESOLVED') => {
    if (!selectedInquiry) return;
    try {
      const res = await api.put(`/admin/inquiries/${selectedInquiry.id}/status`, { status: newStatus });
      showToast(`Inquiry marked as ${newStatus}`, 'success');
      const updated = res.data.inquiry;
      setSelectedInquiry(updated);
      setInquiries((prev) =>
        prev.map((inq) => (inq.id === updated.id ? updated : inq))
      );
      // Refresh stats
      const statsRes = await api.get('/admin/inquiries/stats');
      setStats(statsRes.data);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiry) return;
    if (!replyMessage.trim()) {
      showToast('Please type a response message for the patron', 'error');
      return;
    }

    setSendingReply(true);
    try {
      const res = await api.post(`/admin/inquiries/${selectedInquiry.id}/reply`, {
        replyMessage: replyMessage.trim(),
        senderName: senderName.trim(),
        markAsResolved: markAsResolvedOnSend
      });

      showToast('Official response dispatched successfully to customer', 'success');
      setReplyMessage('');
      const updated = res.data.inquiry;
      setSelectedInquiry(updated);
      setInquiries((prev) =>
        prev.map((inq) => (inq.id === updated.id ? updated : inq))
      );

      // Refresh stats
      const statsRes = await api.get('/admin/inquiries/stats');
      setStats(statsRes.data);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to dispatch reply email', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedInquiry) return;
    const confirmDelete = window.confirm(`Permanently remove inquiry from "${selectedInquiry.name}"?`);
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/admin/inquiries/${selectedInquiry.id}`);
      showToast('Inquiry deleted successfully', 'success');
      setIsMobileDetailOpen(false);
      fetchInquiries(page, false);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete inquiry', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const getCleanPhone = (phone?: string | null) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    return digits;
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-wide">
              Patron Inquiries & Concierge Desk
            </h1>
            {stats.unread > 0 && (
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-semibold animate-pulse">
                {stats.unread} New
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Review bespoke styling inquiries, bridal sizing consultations, and customer messages.
          </p>
        </div>

        <button
          onClick={() => fetchInquiries(page, true)}
          disabled={loading}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-[#DFC89D] border border-[#C6A15D]/40 rounded-lg text-xs font-medium uppercase tracking-wider flex items-center gap-2 transition-colors self-start shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Desk</span>
        </button>
      </div>

      {/* Queue Tabs & Stats */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#3E1A1E]/80 pb-3">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider flex items-center gap-2 transition-colors ${
            activeTab === 'ALL'
              ? 'bg-[#3E1A1E] text-[#DFC89D] border border-[#C6A15D]/60'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>All Inquiries</span>
          <span className="px-1.5 py-0.2 bg-black/40 rounded text-[10px] text-zinc-400">
            {stats.total}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('UNREAD')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider flex items-center gap-2 transition-colors ${
            activeTab === 'UNREAD'
              ? 'bg-amber-950/60 text-amber-300 border border-amber-500/60'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>Unread</span>
          {stats.unread > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500 text-black font-bold rounded-full text-[10px]">
              {stats.unread}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('READ')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider flex items-center gap-2 transition-colors ${
            activeTab === 'READ'
              ? 'bg-blue-950/60 text-blue-300 border border-blue-500/60'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>In Review</span>
          <span className="px-1.5 py-0.2 bg-black/40 rounded text-[10px] text-zinc-400">
            {stats.read}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('RESOLVED')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider flex items-center gap-2 transition-colors ${
            activeTab === 'RESOLVED'
              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/60'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Resolved</span>
          <span className="px-1.5 py-0.2 bg-black/40 rounded text-[10px] text-zinc-400">
            {stats.resolved}
          </span>
        </button>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by patron name, email, phone, subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-black/40 border border-zinc-700 rounded-lg text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#C6A15D]"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-[#3E1A1E] hover:bg-[#2B0C10] text-[#DFC89D] border border-[#C6A15D]/40 rounded-lg text-xs font-bold uppercase tracking-wider"
        >
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              fetchInquiries(1, false);
            }}
            className="px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-xs hover:bg-zinc-700"
          >
            Clear
          </button>
        )}
      </form>

      {/* Main Split Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        
        {/* Left List Column (12 on mobile if list active, 5 on desktop) */}
        <div className={`lg:col-span-5 space-y-3 ${isMobileDetailOpen ? 'hidden lg:block' : 'block'}`}>
          {loading && inquiries.length === 0 ? (
            <div className="bg-[#1C060E] border border-zinc-800 rounded-xl p-8 text-center text-zinc-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#C6A15D] mb-3" />
              Loading concierge inbox...
            </div>
          ) : inquiries.length === 0 ? (
            <div className="bg-[#1C060E] border border-zinc-800 rounded-xl p-8 text-center text-zinc-400 text-xs space-y-3">
              <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="font-serif text-sm text-zinc-300">No inquiries found</p>
              <p className="text-[11px] text-zinc-500">
                {activeTab === 'UNREAD'
                  ? 'All patron inquiries are currently handled.'
                  : 'No contact submissions match your current filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {inquiries.map((inq) => {
                const isSelected = selectedInquiry?.id === inq.id;
                return (
                  <div
                    key={inq.id}
                    onClick={() => handleSelectInquiry(inq)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#2E1218] border-[#C6A15D] shadow-lg ring-1 ring-[#C6A15D]/40'
                        : 'bg-[#1C060E] border-zinc-800/80 hover:border-zinc-700 hover:bg-[#230912]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {inq.status === 'UNREAD' ? (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        ) : inq.status === 'RESOLVED' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                        )}
                        <h3 className="font-semibold text-xs text-white line-clamp-1">
                          {inq.name}
                        </h3>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          inq.status === 'UNREAD'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : inq.status === 'RESOLVED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        }`}
                      >
                        {inq.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#DFC89D] font-medium mt-1 line-clamp-1">
                      {inq.subject}
                    </p>

                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {inq.message}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500">
                      <span>{inq.email}</span>
                      <span>{formatDate(inq.createdAt)}</span>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 px-1 text-xs text-zinc-400">
                  <button
                    onClick={() => {
                      const next = Math.max(1, page - 1);
                      setPage(next);
                      fetchInquiries(next, false);
                    }}
                    disabled={page <= 1}
                    className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => {
                      const next = Math.min(totalPages, page + 1);
                      setPage(next);
                      fetchInquiries(next, false);
                    }}
                    disabled={page >= totalPages}
                    className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Detail Dossier Column (12 on mobile if detail active, 7 on desktop) */}
        <div className={`lg:col-span-7 ${isMobileDetailOpen ? 'block' : 'hidden lg:block'}`}>
          {selectedInquiry ? (
            <div className="bg-[#1C060E] border border-[#3E1A1E] rounded-xl p-5 sm:p-6 space-y-6 shadow-xl">
              
              {/* Mobile Back Button */}
              <div className="lg:hidden flex items-center justify-between pb-3 border-b border-zinc-800">
                <button
                  onClick={() => setIsMobileDetailOpen(false)}
                  className="flex items-center gap-2 text-xs text-[#DFC89D] hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Inquiries List</span>
                </button>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                  Status: {selectedInquiry.status}
                </span>
              </div>

              {/* Inquiry Header Dossier */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-zinc-800/80">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-[#3E1A1E] border border-[#C6A15D]/40 flex items-center justify-center text-[#DFC89D] font-bold text-sm">
                      {selectedInquiry.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-serif text-lg font-bold text-white">
                        {selectedInquiry.name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-[#C6A15D]" />
                          <a
                            href={`mailto:${selectedInquiry.email}`}
                            className="hover:text-white underline decoration-zinc-700"
                          >
                            {selectedInquiry.email}
                          </a>
                        </span>
                        {selectedInquiry.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#C6A15D]" />
                            <a
                              href={`tel:${selectedInquiry.phone}`}
                              className="hover:text-white"
                            >
                              {selectedInquiry.phone}
                            </a>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Dropdown / Action Pills */}
                <div className="flex flex-wrap items-center gap-2 self-start">
                  <button
                    onClick={() => handleStatusChange('UNREAD')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                      selectedInquiry.status === 'UNREAD'
                        ? 'bg-amber-500 text-black'
                        : 'bg-zinc-900 text-zinc-400 hover:text-amber-300 border border-zinc-800'
                    }`}
                  >
                    Unread
                  </button>
                  <button
                    onClick={() => handleStatusChange('READ')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                      selectedInquiry.status === 'READ'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-900 text-zinc-400 hover:text-blue-300 border border-zinc-800'
                    }`}
                  >
                    In Review
                  </button>
                  <button
                    onClick={() => handleStatusChange('RESOLVED')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                      selectedInquiry.status === 'RESOLVED'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-900 text-zinc-400 hover:text-emerald-300 border border-zinc-800'
                    }`}
                  >
                    Resolved
                  </button>
                </div>
              </div>

              {/* Quick Communication Bar */}
              <div className="bg-black/30 p-3 rounded-lg border border-zinc-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Calendar className="w-3.5 h-3.5 text-[#C6A15D]" />
                  <span>Received {formatDate(selectedInquiry.createdAt)}</span>
                </div>

                <div className="flex items-center gap-2">
                  {selectedInquiry.phone && (
                    <a
                      href={`https://wa.me/${getCleanPhone(selectedInquiry.phone)}?text=${encodeURIComponent(
                        `Hello ${selectedInquiry.name}, this is the Ethniz Couture Atelier Concierge regarding your inquiry on "${selectedInquiry.subject}". How may we assist you today?`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/40 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>WhatsApp Patron</span>
                    </a>
                  )}

                  <a
                    href={`mailto:${selectedInquiry.email}?subject=${encodeURIComponent(
                      `Re: ${selectedInquiry.subject} — Ethniz Couture Atelier`
                    )}`}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Mail className="w-3 h-3" />
                    <span>Open Email Client</span>
                  </a>

                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors rounded hover:bg-red-950/30"
                    title="Delete inquiry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Inquiry Message Box */}
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-wider text-[#C6A15D] font-bold">
                  Inquiry Subject & Message
                </div>
                <div className="p-4 bg-black/40 border border-[#3E1A1E] rounded-xl space-y-2.5">
                  <h3 className="font-serif text-sm font-bold text-white tracking-wide">
                    {selectedInquiry.subject}
                  </h3>
                  <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line font-light">
                    {selectedInquiry.message}
                  </div>
                </div>
              </div>

              {/* Official Atelier Response Composer */}
              <div className="pt-2 border-t border-zinc-800/80 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C6A15D]" />
                  <div>
                    <h3 className="font-serif text-sm font-bold text-white">
                      Dispatch Official Atelier Response
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Delivers a royal branded HTML response email directly to {selectedInquiry.email}.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSendReply} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Concierge Sign-off Name
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="e.g. Atelier Concierge or Master Stylist Kavita"
                      className="w-full px-3 py-2 bg-black/40 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-[#C6A15D]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Official Response Message
                    </label>
                    <textarea
                      rows={5}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder={`Dear ${selectedInquiry.name},\n\nThank you for reaching out to Ethniz Couture. Regarding your question on custom measurements and delivery timelines for your upcoming event, our master karigars can certainly...`}
                      className="w-full p-3 bg-black/40 border border-zinc-700 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#C6A15D] leading-relaxed resize-y"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={markAsResolvedOnSend}
                        onChange={(e) => setMarkAsResolvedOnSend(e.target.checked)}
                        className="rounded border-zinc-700 bg-black/40 text-[#C6A15D] focus:ring-0"
                      />
                      <span>Mark inquiry as Resolved upon sending</span>
                    </label>

                    <button
                      type="submit"
                      disabled={sendingReply}
                      className="px-5 py-2.5 bg-[#C6A15D] hover:bg-[#AA8743] text-black font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 shadow-md"
                    >
                      <Send className={`w-3.5 h-3.5 ${sendingReply ? 'animate-pulse' : ''}`} />
                      <span>{sendingReply ? 'Dispatching Response...' : 'Send Official Response'}</span>
                    </button>
                  </div>
                </form>
              </div>

            </div>
          ) : (
            <div className="h-full min-h-[400px] bg-[#1C060E] border border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center text-center text-zinc-500 space-y-3">
              <Inbox className="w-10 h-10 text-zinc-700" />
              <p className="font-serif text-sm text-zinc-300">No Inquiry Selected</p>
              <p className="text-xs text-zinc-500 max-w-xs">
                Select an inquiry from the queue on the left to review the patron's request and send an official atelier response.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
