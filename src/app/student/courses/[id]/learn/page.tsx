"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useParams } from "next/navigation";
import type { Course, CourseSection, CourseLesson, Review } from "@/lib/types";
import VideoPlayer from "@/components/VideoPlayer";
import ReviewForm from "@/components/ReviewForm";
import { useToast } from "@/components/Toast";

export default function LearnPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const supabase = createClient();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<(CourseSection & { lessons: CourseLesson[] })[]>([]);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Get course
      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      setCourse(courseData);

      // Get sections with lessons
      const { data: sectionsData } = await supabase
        .from("course_sections")
        .select("*, lessons:course_lessons(*)")
        .eq("course_id", courseId)
        .order("position");

      const sorted = (sectionsData || []).map((s) => ({
        ...s,
        lessons: (s.lessons || []).sort(
          (a: CourseLesson, b: CourseLesson) => a.position - b.position
        ),
      }));
      setSections(sorted);

      // Get progress
      const allLessonIds = sorted.flatMap((s) =>
        s.lessons.map((l: CourseLesson) => l.id)
      );

      let progressMap: Record<string, boolean> = {};

      if (allLessonIds.length > 0) {
        const { data: progressData } = await supabase
          .from("lesson_progress")
          .select("lesson_id, is_completed")
          .eq("user_id", user.id)
          .in("lesson_id", allLessonIds);

        (progressData || []).forEach((p) => {
          progressMap[p.lesson_id] = p.is_completed;
        });
        setProgress(progressMap);
      }

      // Resume where left off: find first incomplete lesson
      let resumeLesson: CourseLesson | null = null;
      for (const section of sorted) {
        for (const lesson of section.lessons) {
          if (!progressMap[lesson.id]) {
            resumeLesson = lesson;
            break;
          }
        }
        if (resumeLesson) break;
      }

      // If all complete, go to first lesson; if none exist, null
      if (!resumeLesson && sorted.length > 0 && sorted[0].lessons.length > 0) {
        resumeLesson = sorted[0].lessons[0];
      }
      setActiveLesson(resumeLesson);

      // Get reviews
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("*, user:users(full_name)")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });

      setReviews(reviewsData || []);

      // Check if user already reviewed
      const userReview = (reviewsData || []).find(
        (r) => r.user_id === user.id
      );
      setMyReview(userReview || null);

      setLoading(false);
    }
    load();
  }, [courseId]);

  async function toggleComplete(lessonId: string) {
    if (!userId) return;

    const isCurrentlyComplete = progress[lessonId];

    if (isCurrentlyComplete) {
      await supabase
        .from("lesson_progress")
        .update({ is_completed: false, completed_at: null })
        .eq("user_id", userId)
        .eq("lesson_id", lessonId);
    } else {
      await supabase.from("lesson_progress").upsert(
        {
          user_id: userId,
          lesson_id: lessonId,
          is_completed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" }
      );
    }

    setProgress((prev) => ({ ...prev, [lessonId]: !isCurrentlyComplete }));
    toast(isCurrentlyComplete ? "Lesson marked incomplete" : "Lesson completed!", isCurrentlyComplete ? "info" : "success");
  }

  function handleReviewSubmitted(review: Review) {
    if (myReview) {
      // Update existing
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? review : r))
      );
    } else {
      // New review
      setReviews((prev) => [review, ...prev]);
    }
    setMyReview(review);
    setShowReviewForm(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  const totalLessons = sections.reduce((acc, s) => acc + s.lessons.length, 0);
  const completedLessons = Object.values(progress).filter(Boolean).length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
      {/* Video area */}
      <div className="flex-1 overflow-y-auto">
        <VideoPlayer
          url={activeLesson?.video_url || null}
          title={activeLesson?.title || ""}
        />
        <div className="p-4 sm:p-6 space-y-8">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {activeLesson?.title || "Select a lesson"}
            </h1>
            {activeLesson && (
              <button
                onClick={() => toggleComplete(activeLesson.id)}
                className={`mt-4 px-4 py-2 rounded-lg font-medium text-sm ${
                  progress[activeLesson.id]
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {progress[activeLesson.id]
                  ? "✓ Completed"
                  : "Mark as Complete"}
              </button>
            )}
          </div>

          {/* Reviews Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Reviews ({reviews.length})
              </h2>
              {userId && (
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  {myReview ? "Edit Review" : "Write a Review"}
                </button>
              )}
            </div>

            {showReviewForm && userId && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 border">
                <ReviewForm
                  courseId={courseId}
                  userId={userId}
                  existingReview={myReview}
                  onReviewSubmitted={handleReviewSubmitted}
                />
              </div>
            )}

            {reviews.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No reviews yet. Be the first to review this course!
              </p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="border-b pb-4 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">
                        {review.user?.full_name}
                      </span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? "text-yellow-400"
                                : "text-gray-200"
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      {review.user_id === userId && (
                        <span className="text-xs text-primary-600 font-medium">
                          (You)
                        </span>
                      )}
                    </div>
                    {review.comment && (
                      <p className="mt-1 text-sm text-gray-600">
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-80 border-l bg-white overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900 text-sm">
            {course?.title}
          </h2>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>
                {completedLessons}/{totalLessons} lessons
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-primary-600 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="divide-y">
          {sections.map((section, sIdx) => (
            <div key={section.id}>
              <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                Section {sIdx + 1}: {section.title}
              </div>
              {section.lessons.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => setActiveLesson(lesson)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm hover:bg-gray-50 transition-colors ${
                    activeLesson?.id === lesson.id ? "bg-primary-50" : ""
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs flex-shrink-0 ${
                      progress[lesson.id]
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300"
                    }`}
                  >
                    {progress[lesson.id] && "✓"}
                  </span>
                  <span
                    className={
                      activeLesson?.id === lesson.id
                        ? "text-primary-700 font-medium"
                        : "text-gray-700"
                    }
                  >
                    {lesson.title}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
