'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Comment } from '@/lib/types';
import { api } from '@/lib/api';

interface CommentSectionProps {
  placeId: string;
  locale: string;
}

function CommentCard({
  comment,
  onReply,
  onVote,
  depth = 0,
  locale,
}: {
  comment: Comment;
  onReply: (parentId: string) => void;
  onVote: (commentId: string, type: 'up' | 'down') => void;
  depth?: number;
  locale: string;
}) {
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const score = comment.upvotes - comment.downvotes;

  return (
    <div
      className={`${depth > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}`}
      data-testid="comment-card"
    >
      <div className="py-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
            {(comment.userName || 'A')[0].toUpperCase()}
          </div>
          <span className="text-sm font-medium text-gray-900">
            {comment.userName || 'Anonymous'}
          </span>
          <span className="text-xs text-gray-400">
            {formatDate(comment.createdAt)}
          </span>
        </div>

        <p className="text-sm text-gray-700 mb-2">{comment.content}</p>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onVote(comment.id, 'up')}
              className="text-gray-400 hover:text-emerald-600 transition-colors p-1"
              aria-label="Upvote"
            >
              ▲
            </button>
            <span className={`font-medium ${score > 0 ? 'text-emerald-600' : score < 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {score}
            </span>
            <button
              onClick={() => onVote(comment.id, 'down')}
              className="text-gray-400 hover:text-red-500 transition-colors p-1"
              aria-label="Downvote"
            >
              ▼
            </button>
          </div>
          {depth === 0 && (
            <button
              onClick={() => onReply(comment.id)}
              className="text-gray-400 hover:text-blue-600 transition-colors"
            >
              Reply
            </button>
          )}
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-0">
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onVote={onVote}
              depth={depth + 1}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentSection({ placeId, locale }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const data = await api.getComments(placeId);
      setComments(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('wheelcheck_token');
  };

  const handleSubmit = async (parentId?: string | null) => {
    const content = parentId ? replyText : newComment;
    if (!content.trim()) return;

    const token = getToken();
    if (!token) {
      alert('Please log in to comment.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createComment(
        { placeId, parentId: parentId || null, content: content.trim() },
        token
      );
      if (parentId) {
        setReplyText('');
        setReplyTo(null);
      } else {
        setNewComment('');
      }
      await fetchComments();
    } catch {
      alert('Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (commentId: string, type: 'up' | 'down') => {
    const token = getToken();
    if (!token) {
      alert('Please log in to vote.');
      return;
    }
    try {
      await api.voteComment(commentId, type, token);
      await fetchComments();
    } catch {
      // silently fail
    }
  };

  const handleReply = (parentId: string) => {
    setReplyTo(replyTo === parentId ? null : parentId);
    setReplyText('');
  };

  if (loading) {
    return (
      <div className="py-4 text-center text-gray-500 text-sm">
        Loading comments...
      </div>
    );
  }

  return (
    <div data-testid="comment-section">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Discussion ({comments.length})
      </h2>

      {/* New comment form */}
      <div className="mb-6">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Share your experience or ask a question..."
          className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          rows={3}
          maxLength={2000}
          data-testid="comment-input"
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-400">{newComment.length}/2000</span>
          <button
            onClick={() => handleSubmit()}
            disabled={!newComment.trim() || submitting}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[40px]"
            data-testid="comment-submit"
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </div>

      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">
          No comments yet. Start the discussion!
        </p>
      ) : (
        <div className="divide-y divide-gray-100">
          {comments.map((comment) => (
            <div key={comment.id}>
              <CommentCard
                comment={comment}
                onReply={handleReply}
                onVote={handleVote}
                locale={locale}
              />
              {replyTo === comment.id && (
                <div className="ml-6 pl-4 border-l-2 border-emerald-200 pb-3">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    rows={2}
                    maxLength={2000}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => handleSubmit(comment.id)}
                      disabled={!replyText.trim() || submitting}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      Reply
                    </button>
                    <button
                      onClick={() => setReplyTo(null)}
                      className="px-3 py-1.5 text-gray-500 text-xs hover:text-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
