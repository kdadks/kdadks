import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  User,
  Shield,
  MessageSquare,
  Lock,
  Paperclip,
  Send,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  FileText,
  Building2,
  FileCheck,
  Star,
  Check,
} from 'lucide-react';
import { ITSMTicket, ITSMComment, TicketStatus, DEFAULT_CSAT_QUESTIONS } from '../../types/itsm';
import { ITSMTicketService } from '../../services/itsmTicketService';
import { ITSMSlaService } from '../../services/itsmSlaService';
import { PolicyService } from '../../services/policyService';
import { Policy } from '../../types/policy';
import { useToast } from '../ui/ToastProvider';
import { simpleAuth } from '../../utils/simpleAuth';
import CSATModal from './CSATModal';

interface TicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string | null;
  isAgentView?: boolean;
  onTicketUpdated?: () => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  isOpen,
  onClose,
  ticketId,
  isAgentView = false,
  onTicketUpdated,
}) => {
  const { showSuccess, showError } = useToast();

  const [ticket, setTicket] = useState<ITSMTicket | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Comment Form State
  const [commentText, setCommentText] = useState<string>('');
  const [isInternalNote, setIsInternalNote] = useState<boolean>(false);
  const [commentSubmitting, setCommentSubmitting] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Resolution & KB Linking Modal State
  const [showResolveModal, setShowResolveModal] = useState<boolean>(false);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');

  // CSAT Modal Trigger
  const [showCsatModal, setShowCsatModal] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && ticketId) {
      loadTicket();
    }
  }, [isOpen, ticketId]);

  const loadTicket = async () => {
    if (!ticketId) return;
    try {
      setLoading(true);
      const data = await ITSMTicketService.getTicketById(ticketId);
      setTicket(data);

      // Load published policies for SOP linking if agent view
      if (isAgentView) {
        const polList = await PolicyService.getPolicies({ status: 'published' });
        setPolicies(polList);
      }
    } catch (err) {
      showError(`Failed to load ticket details: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !commentText.trim()) return;

    try {
      setCommentSubmitting(true);
      await ITSMTicketService.addComment(
        ticket.id,
        commentText.trim(),
        isInternalNote,
        [],
        selectedFiles
      );
      showSuccess(isInternalNote ? 'Private agent note saved.' : 'Public comment posted.');
      setCommentText('');
      setSelectedFiles([]);
      await loadTicket();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      showError(`Failed to post comment: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleStatusTransition = async (targetStatus: TicketStatus, notes?: string) => {
    if (!ticket) return;
    try {
      const currentUser = await simpleAuth.getCurrentUser();
      await ITSMTicketService.transitionTicketStatus(
        ticket.id,
        targetStatus,
        notes,
        currentUser?.id,
        selectedPolicyId || undefined
      );
      showSuccess(`Ticket status updated to ${targetStatus}.`);
      setShowResolveModal(false);
      await loadTicket();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      showError(`Status transition failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleAcceptResolution = async () => {
    if (!ticket) return;
    try {
      await ITSMTicketService.transitionTicketStatus(ticket.id, 'closed', 'Customer accepted resolution.');
      showSuccess('Resolution accepted. Thank you!');
      setShowCsatModal(true);
      await loadTicket();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      showError(`Failed to close ticket: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (!isOpen || !ticketId) return null;

  const slaStatus = ticket ? ITSMSlaService.getSlaStopwatchStatus(ticket) : null;
  const filteredComments = ticket?.comments?.filter((c) => (isAgentView ? true : !c.is_internal)) || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 text-xs font-mono font-bold rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
              {ticket?.ticket_number || 'Loading...'}
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-xl">
                {ticket?.title}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Created on {ticket?.created_at ? new Date(ticket.created_at).toLocaleString() : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* SLA Stopwatch & Status Header Banner */}
        {ticket && slaStatus && (
          <div className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between text-xs gap-3">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-700 dark:text-gray-300">SLA Stopwatches:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-mono font-semibold text-[11px] ${
                  slaStatus.ttoBadgeColor === 'red'
                    ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse'
                    : slaStatus.ttoBadgeColor === 'yellow'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : slaStatus.ttoBadgeColor === 'completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                ⏱️ {slaStatus.ttoLabel}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-mono font-semibold text-[11px] ${
                  slaStatus.ttrBadgeColor === 'red'
                    ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse'
                    : slaStatus.ttrBadgeColor === 'yellow'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : slaStatus.ttrBadgeColor === 'completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                🏁 {slaStatus.ttrLabel}
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center space-x-2">
              {!isAgentView && ticket.status === 'resolved' && (
                <button
                  onClick={handleAcceptResolution}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Accept Resolution & Close</span>
                </button>
              )}
              {isAgentView && ticket.status !== 'closed' && (
                <>
                  {ticket.status === 'new' && (
                    <button
                      onClick={() => handleStatusTransition('in_progress')}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition"
                    >
                      Start Work
                    </button>
                  )}
                  {ticket.status === 'in_progress' && (
                    <button
                      onClick={() => setShowResolveModal(true)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Resolve Ticket</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal Main Body Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Center Column: Conversation Feed & Comments */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description Box */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description / Inquiry</h4>
              <div
                className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{ __html: ticket?.description || '' }}
              />
            </div>

            {/* Resolution Notes Box if resolved/closed */}
            {ticket?.resolution_notes && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Resolution Details</span>
                </div>
                <p className="text-xs text-emerald-900 dark:text-emerald-200">{ticket.resolution_notes}</p>
                {ticket.linked_kb_policy && (
                  <div className="mt-2 text-xs flex items-center text-emerald-600 dark:text-emerald-400">
                    <BookOpen className="h-3.5 w-3.5 mr-1" />
                    <span>Linked SOP/Policy: {ticket.linked_kb_policy.title} ({ticket.linked_kb_policy.policy_code})</span>
                  </div>
                )}
              </div>
            )}

            {/* CSAT Satisfaction Survey Details Breakdown */}
            {ticket?.csat_survey ? (
              <div className="p-5 bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-amber-50/50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-amber-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/60 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-amber-400/20 text-amber-600 rounded-lg">
                      <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span>Customer CSAT Survey Breakdown</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300">
                          {ticket.csat_survey.rating} / 5 Stars
                        </span>
                      </h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        Submitted on {new Date(ticket.csat_survey.submitted_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 5 Questions Breakdown */}
                <div className="space-y-3">
                  {(ticket.csat_survey.responses && ticket.csat_survey.responses.length > 0
                    ? ticket.csat_survey.responses
                    : DEFAULT_CSAT_QUESTIONS.map((q) => ({
                        question_id: q.id,
                        question_text: q.question_text,
                        rating: ticket.csat_survey?.rating || 5,
                        comment: ticket.csat_survey?.feedback_text || undefined,
                      }))
                  ).map((resp, idx) => (
                    <div
                      key={resp.question_id || idx}
                      className="p-3 bg-white/90 dark:bg-gray-800/90 rounded-xl border border-gray-200/80 dark:border-gray-700/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-800 dark:text-gray-200">
                          {resp.question_text}
                        </span>
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-3.5 w-3.5 ${
                                s <= (resp.rating || 5)
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                            />
                          ))}
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 ml-1">
                            {resp.rating}/5
                          </span>
                        </div>
                      </div>

                      {resp.comment ? (
                        <div className="text-[11px] text-gray-700 dark:text-gray-200 bg-indigo-50/50 dark:bg-gray-900/60 p-2.5 rounded-lg italic border-l-2 border-indigo-500 flex items-start space-x-1.5 mt-1">
                          <MessageSquare className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                          <span>"{resp.comment}"</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic block">No specific comment added</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              (ticket?.status === 'resolved' || ticket?.status === 'closed') && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-gray-500">
                    <Star className="h-4 w-4 text-amber-400" />
                    <span>CSAT Survey: <span className="italic font-medium">Pending Customer Feedback</span></span>
                  </div>
                  {!isAgentView && (
                    <button
                      onClick={() => setShowCsatModal(true)}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs shadow transition flex items-center space-x-1"
                    >
                      <Star className="h-3.5 w-3.5 fill-white" />
                      <span>Provide Survey & Feedback</span>
                    </button>
                  )}
                </div>
              )
            )}

            {/* Comment Stream */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                <span>Discussion & Timeline</span>
                <span className="text-[10px] text-gray-400">{filteredComments.length} messages</span>
              </h4>

              {filteredComments.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 text-xs">
                  No comments posted yet.
                </div>
              ) : (
                filteredComments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-4 rounded-xl border transition ${
                      comment.is_internal
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {comment.author_name || 'User'}
                        </span>
                        {comment.is_internal && (
                          <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                            <Lock className="h-3 w-3" />
                            <span>Private Agent Note</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Post Comment Form */}
            {ticket?.status !== 'closed' && ticket?.status !== 'canceled' && (
              <form onSubmit={handlePostComment} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Add Response
                  </label>
                  {isAgentView && (
                    <label className="flex items-center space-x-2 text-xs cursor-pointer select-none text-amber-700 dark:text-amber-300 font-semibold">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                      />
                      <Lock className="h-3 w-3" />
                      <span>Private Agent Note (Hidden from Customer)</span>
                    </label>
                  )}
                </div>

                <textarea
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={
                    isInternalNote
                      ? 'Type internal investigation notes, team @mentions...'
                      : 'Type public reply to customer...'
                  }
                  className={`w-full px-3 py-2 text-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 ${
                    isInternalNote
                      ? 'border-amber-300 focus:ring-amber-500 bg-amber-50/50'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'
                  }`}
                  required
                />

                <div className="flex items-center justify-between">
                  <input
                    type="file"
                    multiple
                    id="comment-attachments"
                    className="hidden"
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                  />
                  <label
                    htmlFor="comment-attachments"
                    className="cursor-pointer text-xs text-gray-500 hover:text-indigo-600 flex items-center space-x-1"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>
                      {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : 'Attach File'}
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={commentSubmitting}
                    className={`px-4 py-1.5 text-xs font-bold text-white rounded-xl shadow transition flex items-center space-x-1 disabled:opacity-50 ${
                      isInternalNote ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{commentSubmitting ? 'Posting...' : isInternalNote ? 'Save Private Note' : 'Send Reply'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Column: Ticket Metadata Panel */}
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
              <h4 className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Ticket Overview</h4>

              <div>
                <span className="text-gray-400 block text-[11px]">Priority</span>
                <span className="font-semibold text-gray-900 dark:text-white uppercase">{ticket?.priority}</span>
              </div>

              <div>
                <span className="text-gray-400 block text-[11px]">Status</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase">{ticket?.status}</span>
              </div>

              <div>
                <span className="text-gray-400 block text-[11px]">Category</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{ticket?.category?.name || 'General Inquiry'}</span>
              </div>

              {ticket?.customer && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-400 block text-[11px]">Customer Account</span>
                  <div className="flex items-center space-x-1.5 text-gray-900 dark:text-white font-semibold mt-0.5">
                    <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{ticket.customer.company_name}</span>
                  </div>
                  {ticket.customer.customer_code && (
                    <span className="inline-block mt-1 font-mono text-[10px] bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">
                      {ticket.customer.customer_code}
                    </span>
                  )}
                </div>
              )}

              {ticket?.contact && (
                <div>
                  <span className="text-gray-400 block text-[11px]">Contact Person</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{ticket.contact.name}</p>
                  <p className="text-gray-500 text-[10px]">{ticket.contact.email}</p>
                </div>
              )}

              {ticket?.csat_survey && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-400 block text-[11px]">CSAT Survey Score</span>
                  <div className="flex items-center space-x-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs mt-0.5">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span>{ticket.csat_survey.rating} / 5 Stars</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6 border border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span>Resolve Support Ticket #{ticket?.ticket_number}</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Resolution Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Detail root cause analysis and technical resolution provided..."
                className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Link Knowledge Base / SOP Policy (Optional)
              </label>
              <select
                value={selectedPolicyId}
                onChange={(e) => setSelectedPolicyId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">-- No SOP Link --</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.policy_code}] {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStatusTransition('resolved', resolutionNotes)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSAT Modal */}
      {ticket && (
        <CSATModal
          isOpen={showCsatModal}
          onClose={() => setShowCsatModal(false)}
          ticketId={ticket.id}
          ticketNumber={ticket.ticket_number}
          customerId={ticket.customer_id}
          contactId={ticket.contact_id || undefined}
        />
      )}
    </div>
  );
};

export default TicketDetailModal;
