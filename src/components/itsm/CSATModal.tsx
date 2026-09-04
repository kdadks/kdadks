import React, { useState } from 'react';
import { Star, X, CheckCircle2, MessageSquare, Send, Sparkles, HelpCircle } from 'lucide-react';
import { ITSMCsatService } from '../../services/itsmCsatService';
import { DEFAULT_CSAT_QUESTIONS, ITSMCsatQuestionResponse } from '../../types/itsm';
import { useToast } from '../ui/ToastProvider';

interface CSATModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  ticketNumber: string;
  customerId: string;
  contactId?: string;
  onSubmitted?: () => void;
}

export const CSATModal: React.FC<CSATModalProps> = ({
  isOpen,
  onClose,
  ticketId,
  ticketNumber,
  customerId,
  contactId,
  onSubmitted,
}) => {
  const { showSuccess, showError } = useToast();

  // Store ratings (1-5) and comments for each of the 5 survey questions
  const [answers, setAnswers] = useState<Record<string, { rating: number; comment: string }>>(() => {
    const initial: Record<string, { rating: number; comment: string }> = {};
    DEFAULT_CSAT_QUESTIONS.forEach((q) => {
      initial[q.id] = { rating: 5, comment: '' };
    });
    return initial;
  });

  const [hoveredStars, setHoveredStars] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleRatingChange = (questionId: string, rating: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        rating,
      },
    }));
  };

  const handleCommentChange = (questionId: string, comment: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        comment,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      const responsePayload: ITSMCsatQuestionResponse[] = DEFAULT_CSAT_QUESTIONS.map((q) => ({
        question_id: q.id,
        question_text: q.question_text,
        rating: answers[q.id]?.rating || 5,
        comment: answers[q.id]?.comment?.trim() || undefined,
      }));

      await ITSMCsatService.submitCsatSurvey(ticketId, customerId, responsePayload, undefined, contactId);
      setSubmitted(true);
      showSuccess('Thank you for completing the support satisfaction survey!');
      if (onSubmitted) onSubmitted();
      setTimeout(() => {
        onClose();
        setSubmitted(false);
      }, 2000);
    } catch (err) {
      showError(`Failed to submit survey feedback: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transform transition-all max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 p-6 text-white text-center relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-2 backdrop-blur-md">
            <Sparkles className="h-6 w-6 text-amber-300 fill-amber-300" />
          </div>
          <h2 className="text-xl font-black tracking-tight">Customer Satisfaction Survey</h2>
          <p className="text-xs text-indigo-100 mt-1">
            Ticket #{ticketNumber} • 5-Question Feedback Survey
          </p>
        </div>

        {/* Modal Body */}
        {submitted ? (
          <div className="p-12 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto animate-bounce" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Survey Submitted Successfully!</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Your detailed feedback has been recorded and will be shared with our IT Operations & Management team to ensure continuous service improvement.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
            <div className="bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex items-start space-x-3 text-xs text-indigo-900 dark:text-indigo-200">
              <HelpCircle className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Your opinion matters:</span> Please rate each of the 5 categories below from 1 to 5 stars and add optional comments for our engineering and support teams.
              </div>
            </div>

            {/* List of 5 Standard Questions */}
            <div className="space-y-6">
              {DEFAULT_CSAT_QUESTIONS.map((q, idx) => {
                const currentAns = answers[q.id] || { rating: 5, comment: '' };
                const activeStar = hoveredStars[q.id] || currentAns.rating;

                return (
                  <div
                    key={q.id}
                    className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200 dark:border-gray-700/80 space-y-3"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center justify-between">
                        <span>{q.question_text}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold">
                          Q{idx + 1} of 5
                        </span>
                      </h4>
                      {q.description && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{q.description}</p>
                      )}
                    </div>

                    {/* Star Rating Selector */}
                    <div className="flex items-center space-x-3 pt-1">
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleRatingChange(q.id, star)}
                            onMouseEnter={() => setHoveredStars((prev) => ({ ...prev, [q.id]: star }))}
                            onMouseLeave={() => setHoveredStars((prev) => ({ ...prev, [q.id]: 0 }))}
                            className="p-1 focus:outline-none transform hover:scale-110 transition duration-150"
                          >
                            <Star
                              className={`h-7 w-7 ${
                                star <= activeStar
                                  ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        {activeStar} / 5 Stars
                      </span>
                    </div>

                    {/* Comment Field for this specific question */}
                    <div className="pt-1">
                      <div className="flex items-center space-x-1.5 text-[11px] text-gray-600 dark:text-gray-300 font-medium mb-1">
                        <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                        <span>Comments / Details for Q{idx + 1}:</span>
                      </div>
                      <textarea
                        rows={2}
                        value={currentAns.comment}
                        onChange={(e) => handleCommentChange(q.id, e.target.value)}
                        placeholder={`Share specific feedback or thoughts on ${q.question_text.toLowerCase()}...`}
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition"
              >
                Skip / Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg transition flex items-center space-x-2 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmitting ? 'Submitting Responses...' : 'Submit 5-Question Survey'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CSATModal;
