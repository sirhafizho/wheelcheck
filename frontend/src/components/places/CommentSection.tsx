'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Comment } from '@/lib/types';
import { api } from '@/lib/api';

type VoteState = 'up' | 'down' | null;

interface CommentSectionProps {
  placeId: string;
  locale: string;
}

function getVoteState(userVote?: string | null): VoteState {
  if (userVote === 'UP') return 'up';
  if (userVote === 'DOWN') return 'down';
  return null;
}

function extractUserVotes(commentList: Comment[]): Record<string, VoteState> {
  const votes: Record<string, VoteState> = {};

  const visit = (items: Comment[]) => {
    items.forEach((comment) => {
      votes[comment.id] = getVoteState(comment.userVote);
      visit(comment.replies || []);
    });
  };

  visit(commentList);
  return votes;
}

function applyVoteUpdate(comment: Comment, nextVote: VoteState): Comment {
  const previousVote = getVoteState(comment.userVote);
  let upvotes = comment.upvotes;
  let downvotes = comment.downvotes;

  if (previousVote === 'up') {
    upvotes -= 1;
  } else if (previousVote === 'down') {
    downvotes -= 1;
  }

  if (nextVote === 'up') {
    upvotes += 1;
  } else if (nextVote === 'down') {
    downvotes += 1;
  }

  return {
    ...comment,
    upvotes: Math.max(upvotes, 0),
    downvotes: Math.max(downvotes, 0),
    userVote: nextVote === 'up' ? 'UP' : nextVote === 'down' ? 'DOWN' : null,
  };
}

function mergeUpdatedComment(existing: Comment, updated: Comment): Comment {
  return {
    ...existing,
    ...updated,
    replies: updated.replies.length > 0 ? updated.replies : existing.replies,
  };
}

function updateCommentInTree(
  commentList: Comment[],
  commentId: string,
  updater: (comment: Comment) => Comment,
): Comment[] {
  return commentList.map((comment) => {
    if (comment.id === commentId) {
      return updater(comment);
    }

    return {
      ...comment,
      replies: updateCommentInTree(comment.replies || [], commentId, updater),
    };
  });
}

function CommentCard({
  comment,
  onReply,
  onVote,
  userVotes,
  depth = 0,
  locale,
}: {
  comment: Comment;
  onReply: (parentId: string) => void;
  onVote: (commentId: string, type: 'up' | 'down') => void;
  userVotes: Record<string, VoteState>;
  depth?: number;
  locale: string;
}) {
  const t = useTranslations('comments');

  const formatDate = (dateString: string) => new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));

  const score = comment.upvotes - comment.downvotes;
  const activeVote = userVotes[comment.id] ?? null;

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
            {comment.userName || t('anonymous')}
          </span>
          <span className="text-xs text-gray-400">
            {formatDate(comment.createdAt)}
          </span>
        </div>

        <p className="text-sm text-gray-700 mb-2">{comment.content}</p>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onVote(comment.id, 'up')}
              className={`rounded-md p-1 transition-colors ${activeVote === 'up' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:text-emerald-600'}`}
              aria-label={t('upvote')}
              aria-pressed={activeVote === 'up'}
            >
              ▲
            </button>
            <span className={`font-medium ${score > 0 ? 'text-emerald-600' : score < 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {score}
            </span>
            <button
              type="button"
              onClick={() => onVote(comment.id, 'down')}
              className={`rounded-md p-1 transition-colors ${activeVote === 'down' ? 'bg-red-50 text-red-500' : 'text-gray-400 hover:text-red-500'}`}
              aria-label={t('downvote')}
              aria-pressed={activeVote === 'down'}
            >
              ▼
            </button>
          </div>
          {depth === 0 && (
            <button
              type="button"
              onClick={() => onReply(comment.id)}
              className="text-gray-400 hover:text-blue-600 transition-colors"
            >
              {t('reply')}
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
              userVotes={userVotes}
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
  const t = useTranslations('comments');
  const tCommon = useTranslations('common');
  const [comments, setComments] = useState<Comment[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, VoteState>>({});
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('wheelcheck_token');
  };

  const fetchComments = useCallback(async () => {
    setLoading(true);

    try {
      const token = getToken() ?? undefined;
      const data = await api.getComments(placeId, token);
      setComments(data);
      setUserVotes(extractUserVotes(data));
    } catch {
      setComments([]);
      setUserVotes({});
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (parentId?: string | null) => {
    const content = parentId ? replyText : newComment;
    if (!content.trim()) return;

    const token = getToken();
    if (!token) {
      alert(t('loginToComment'));
      return;
    }

    setSubmitting(true);
    try {
      await api.createComment(
        { placeId, parentId: parentId || null, content: content.trim() },
        token,
      );
      if (parentId) {
        setReplyText('');
        setReplyTo(null);
      } else {
        setNewComment('');
      }
      await fetchComments();
    } catch {
      alert(t('postFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (commentId: string, type: 'up' | 'down') => {
    const token = getToken();
    if (!token) {
      alert(t('loginToVote'));
      return;
    }

    const previousComments = comments;
    const previousVotes = userVotes;
    const nextVote = previousVotes[commentId] === type ? null : type;

    setComments((current) => updateCommentInTree(current, commentId, (comment) => applyVoteUpdate(comment, nextVote)));
    setUserVotes((current) => ({ ...current, [commentId]: nextVote }));

    try {
      const updatedComment = await api.voteComment(commentId, type, token);
      const updatedVote = getVoteState(updatedComment.userVote);

      setComments((current) => updateCommentInTree(current, commentId, (comment) => mergeUpdatedComment(comment, updatedComment)));
      setUserVotes((current) => ({ ...current, [commentId]: updatedVote }));
    } catch {
      setComments(previousComments);
      setUserVotes(previousVotes);
    }
  };

  const handleReply = (parentId: string) => {
    setReplyTo(replyTo === parentId ? null : parentId);
    setReplyText('');
  };

  if (loading) {
    return (
      <div className="py-4 text-center text-gray-500 text-sm">
        {t('loading')}
      </div>
    );
  }

  return (
    <div data-testid="comment-section">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t('title')} ({comments.length})
      </h2>

      <div className="mb-6">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={t('placeholder')}
          className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          rows={3}
          maxLength={2000}
          data-testid="comment-input"
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-400">{newComment.length}/2000</span>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!newComment.trim() || submitting}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[40px]"
            data-testid="comment-submit"
          >
            {submitting ? tCommon('loading') : t('post')}
          </button>
        </div>
      </div>

      {comments.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">
          {t('noComments')}
        </p>
      ) : (
        <div className="divide-y divide-gray-100">
          {comments.map((comment) => (
            <div key={comment.id}>
              <CommentCard
                comment={comment}
                onReply={handleReply}
                onVote={handleVote}
                userVotes={userVotes}
                locale={locale}
              />
              {replyTo === comment.id && (
                <div className="ml-6 pl-4 border-l-2 border-emerald-200 pb-3">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={t('replyPlaceholder')}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    rows={2}
                    maxLength={2000}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => void handleSubmit(comment.id)}
                      disabled={!replyText.trim() || submitting}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {t('reply')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyTo(null)}
                      className="px-3 py-1.5 text-gray-500 text-xs hover:text-gray-700 transition-colors"
                    >
                      {t('cancel')}
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
