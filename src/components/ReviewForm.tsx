"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Review } from "@/lib/types";
import { useToast } from "@/components/Toast";

interface ReviewFormProps {
  courseId: string;
  userId: string;
  existingReview: Review | null;
  onReviewSubmitted: (review: Review) => void;
}

export default function ReviewForm({
  courseId,
  userId,
  existingReview,
  onReviewSubmitted,
}: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setError("");
    setSubmitting(true);

    if (existingReview) {
      const { error: updateError } = await supabase
        .from("reviews")
        .update({ rating, comment: comment || null })
        .eq("id", existingReview.id);

      if (updateError) {
        setError(updateError.message);
        setSubmitting(false);
        return;
      }

      toast("Review updated", "success");
      onReviewSubmitted({
        ...existingReview,
        rating,
        comment: comment || null,
      });
    } else {
      const { data, error: insertError } = await supabase
        .from("reviews")
        .insert({
          user_id: userId,
          course_id: courseId,
          rating,
          comment: comment || null,
        })
        .select("*")
        .single();

      if (insertError) {
        setError(insertError.message);
        setSubmitting(false);
        return;
      }

      toast("Review submitted", "success");
      onReviewSubmitted(data);
    }

    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-semibold text-gray-900">
        {existingReview ? "Update Your Review" : "Leave a Review"}
      </h3>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Star rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rating
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="focus:outline-none"
            >
              <svg
                className={`w-8 h-8 transition-colors ${
                  star <= (hoveredRating || rating)
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
      </div>

      {/* Comment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Comment (optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          placeholder="Share your experience with this course..."
        />
      </div>

      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="bg-primary-600 text-white px-5 py-2 rounded-lg hover:bg-primary-700 font-medium text-sm disabled:opacity-50"
      >
        {submitting
          ? "Submitting..."
          : existingReview
          ? "Update Review"
          : "Submit Review"}
      </button>
    </form>
  );
}
