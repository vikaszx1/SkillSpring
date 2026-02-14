"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import Link from "next/link";

interface StudentReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  course_id: string;
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnail_url: string | null;
  };
}

export default function StudentReviewsPage() {
  const [reviews, setReviews] = useState<StudentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("reviews")
      .select("id, rating, comment, created_at, course_id, course:courses(id, title, slug, thumbnail_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setReviews((data as unknown as StudentReview[]) || []);
    setLoading(false);
  }

  function startEditing(review: StudentReview) {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment || "");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditRating(0);
    setEditComment("");
    setHoveredRating(0);
  }

  async function saveEdit(reviewId: string) {
    if (editRating === 0) return;
    setSaving(true);

    const { error } = await supabase
      .from("reviews")
      .update({ rating: editRating, comment: editComment || null })
      .eq("id", reviewId);

    if (error) {
      toast("Failed to update review", "error");
    } else {
      toast("Review updated", "success");
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, rating: editRating, comment: editComment || null }
            : r
        )
      );
      cancelEditing();
    }
    setSaving(false);
  }

  function handleDeleteClick(reviewId: string) {
    setDeleteTargetId(reviewId);
    setConfirmOpen(true);
  }

  async function executeDelete() {
    if (!deleteTargetId) return;
    setConfirmOpen(false);
    setDeletingId(deleteTargetId);

    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", deleteTargetId);

    if (error) {
      toast("Failed to delete review", "error");
    } else {
      toast("Review deleted", "success");
      setReviews((prev) => prev.filter((r) => r.id !== deleteTargetId));
    }
    setDeletingId(null);
    setDeleteTargetId(null);
  }

  function renderStars(rating: number, interactive = false) {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && setEditRating(star)}
            onMouseEnter={() => interactive && setHoveredRating(star)}
            onMouseLeave={() => interactive && setHoveredRating(0)}
            className={interactive ? "focus:outline-none cursor-pointer" : "cursor-default"}
          >
            <svg
              className={`w-5 h-5 ${
                star <= (interactive ? hoveredRating || editRating : rating)
                  ? "text-yellow-400"
                  : "text-gray-200"
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
    );
  }

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Review"
        message="Are you sure you want to delete this review? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={executeDelete}
        onCancel={() => { setConfirmOpen(false); setDeleteTargetId(null); }}
      />

      <h1 className="text-2xl font-bold text-gray-900 mb-8">My Reviews</h1>

      {reviews.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-gray-500 mb-4">You haven&apos;t reviewed any courses yet.</p>
          <Link
            href="/student/enrollments"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium text-sm"
          >
            Go to My Enrollments
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-xl border p-5">
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                <Link
                  href={`/courses/${review.course.slug}`}
                  className="shrink-0"
                >
                  {review.course.thumbnail_url ? (
                    <img
                      src={review.course.thumbnail_url}
                      alt={review.course.title}
                      className="w-24 h-16 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-24 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/courses/${review.course.slug}`}
                    className="font-medium text-gray-900 hover:text-primary-600 line-clamp-1"
                  >
                    {review.course.title}
                  </Link>

                  {editingId === review.id ? (
                    /* Edit mode */
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Rating</label>
                        {renderStars(editRating, true)}
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Comment (optional)</label>
                        <textarea
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          placeholder="Update your review..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(review.id)}
                          disabled={saving || editRating === 0}
                          className="bg-primary-600 text-white px-4 py-1.5 rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-4 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(review.rating)}
                        <span className="text-sm text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-600 mt-2">{review.comment}</p>
                      )}
                    </>
                  )}
                </div>

                {/* Actions */}
                {editingId !== review.id && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => startEditing(review)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(review.id)}
                      disabled={deletingId === review.id}
                      className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                    >
                      {deletingId === review.id ? "..." : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
