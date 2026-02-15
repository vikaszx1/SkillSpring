"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useParams } from "next/navigation";
import type { Course, CourseSection, CourseLesson, Review } from "@/lib/types";
import VideoPlayer from "@/components/VideoPlayer";
import ReviewForm from "@/components/ReviewForm";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";
import Spinner from "@/components/Spinner";

type Tab = "overview" | "content";

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
  const [activeTab, setActiveTab] = useState<Tab>("content");

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

      // Get course with instructor & category for overview tab
      const { data: courseData } = await supabase
        .from("courses")
        .select(
          "*, instructor:users!instructor_id(full_name, avatar_url), category:categories(name)"
        )
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
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? review : r))
      );
    } else {
      setReviews((prev) => [review, ...prev]);
    }
    setMyReview(review);
    setShowReviewForm(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const totalLessons = sections.reduce((acc, s) => acc + s.lessons.length, 0);
  const completedLessons = Object.values(progress).filter(Boolean).length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
      {/* Main area */}
      <div className="flex-1 overflow-y-auto">
        {/* Video player - always visible */}
        <VideoPlayer
          url={activeLesson?.video_url || null}
          title={activeLesson?.title || ""}
        />
        <div className="p-4 sm:p-6">
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

        {/* Tabs */}
        <div className="border-b sticky top-0 bg-white z-10">
          <div className="px-4 sm:px-6 flex gap-0">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "overview"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("content")}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "content"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Course Content
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-4 sm:p-6">
          {activeTab === "overview" ? (
            <OverviewTab
              course={course}
              avgRating={avgRating}
              totalLessons={totalLessons}
              sections={sections}
              reviews={reviews}
              userId={userId}
              myReview={myReview}
              showReviewForm={showReviewForm}
              setShowReviewForm={setShowReviewForm}
              courseId={courseId}
              onReviewSubmitted={handleReviewSubmitted}
            />
          ) : (
            /* On desktop, reviews show here (below video). On mobile, they show after the sidebar. */
            <div className="hidden lg:block">
              <ReviewsSection
                reviews={reviews}
                userId={userId}
                myReview={myReview}
                showReviewForm={showReviewForm}
                setShowReviewForm={setShowReviewForm}
                courseId={courseId}
                onReviewSubmitted={handleReviewSubmitted}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sidebar - hidden on mobile when viewing overview */}
      <div className={`w-full lg:w-80 border-l bg-white overflow-y-auto ${activeTab === "overview" ? "hidden lg:block" : ""}`}>
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
                  onClick={() => {
                    setActiveLesson(lesson);
                    setActiveTab("content");
                  }}
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

      {/* Reviews - after sidebar so it appears below course sections on mobile */}
      {activeTab === "content" && (
        <div className="w-full lg:hidden p-4 sm:p-6 bg-white border-t">
          <ReviewsSection
            reviews={reviews}
            userId={userId}
            myReview={myReview}
            showReviewForm={showReviewForm}
            setShowReviewForm={setShowReviewForm}
            courseId={courseId}
            onReviewSubmitted={handleReviewSubmitted}
          />
        </div>
      )}
    </div>
  );
}

/* ─── Overview Tab ─── */
function OverviewTab({
  course,
  avgRating,
  totalLessons,
  sections,
  reviews,
  userId,
  myReview,
  showReviewForm,
  setShowReviewForm,
  courseId,
  onReviewSubmitted,
}: {
  course: Course | null;
  avgRating: string | null;
  totalLessons: number;
  sections: (CourseSection & { lessons: CourseLesson[] })[];
  reviews: Review[];
  userId: string | null;
  myReview: Review | null;
  showReviewForm: boolean;
  setShowReviewForm: (v: boolean) => void;
  courseId: string;
  onReviewSubmitted: (r: Review) => void;
}) {
  if (!course) return null;

  const instructor = course.instructor as { full_name: string; avatar_url: string | null } | undefined;
  const category = course.category as { name: string } | undefined;

  return (
    <div className="space-y-8">
      {/* Course hero info */}
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {category && (
            <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium">
              {category.name}
            </span>
          )}
          {course.level && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                course.level === "beginner"
                  ? "bg-green-50 text-green-700"
                  : course.level === "intermediate"
                  ? "bg-yellow-50 text-yellow-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{course.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
          {avgRating && (
            <span className="flex items-center gap-1 text-yellow-600 font-medium">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              {avgRating} ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {totalLessons} lessons
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
            {sections.length} sections
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Last updated {formatDate(course.updated_at)}
          </span>
        </div>
      </div>

      {/* Instructor */}
      {instructor && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Instructor</h2>
          <div className="flex items-center gap-3">
            {instructor.avatar_url ? (
              <img
                src={instructor.avatar_url}
                alt={instructor.full_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-lg font-semibold">
                {instructor.full_name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">{instructor.full_name}</p>
            </div>
          </div>
        </div>
      )}

      {/* About this course */}
      {course.description && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-3">About this course</h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {course.description}
          </p>
        </div>
      )}

      {/* Reviews */}
      <ReviewsSection
        reviews={reviews}
        userId={userId}
        myReview={myReview}
        showReviewForm={showReviewForm}
        setShowReviewForm={setShowReviewForm}
        courseId={courseId}
        onReviewSubmitted={onReviewSubmitted}
      />
    </div>
  );
}

/* ─── Reviews section shown under Course Content tab ─── */
function ReviewsSection({
  reviews,
  userId,
  myReview,
  showReviewForm,
  setShowReviewForm,
  courseId,
  onReviewSubmitted,
}: {
  reviews: Review[];
  userId: string | null;
  myReview: Review | null;
  showReviewForm: boolean;
  setShowReviewForm: (v: boolean) => void;
  courseId: string;
  onReviewSubmitted: (r: Review) => void;
}) {
  return (
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
            onReviewSubmitted={onReviewSubmitted}
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
            <div key={review.id} className="border-b pb-4 last:border-0">
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
                  <span className="text-xs text-primary-600 font-medium">(You)</span>
                )}
              </div>
              {review.comment && (
                <p className="mt-1 text-sm text-gray-600">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
