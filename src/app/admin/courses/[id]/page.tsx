"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Course, CourseSection, CourseLesson, Review } from "@/lib/types";
import VideoPlayer from "@/components/VideoPlayer";
import ConfirmDialog from "@/components/ConfirmDialog";
import PromptDialog from "@/components/PromptDialog";
import { useToast } from "@/components/Toast";
import Link from "next/link";

export default function AdminCourseReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<(CourseSection & { lessons?: CourseLesson[] })[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const [loading, setLoading] = useState(true);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "danger" | "warning";
    onConfirm: () => void;
  }>({ title: "", message: "", confirmLabel: "", variant: "danger", onConfirm: () => {} });

  // Prompt dialog
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptConfig, setPromptConfig] = useState<{
    title: string;
    message: string;
    placeholder: string;
    submitLabel: string;
    variant: "default" | "danger" | "warning";
    required: boolean;
    onSubmit: (value: string) => void;
  }>({ title: "", message: "", placeholder: "", submitLabel: "", variant: "default", required: false, onSubmit: () => {} });

  useEffect(() => {
    loadCourse();
  }, [id]);

  async function loadCourse() {
    // Admin can see any course (RLS allows admin SELECT on courses)
    const { data: courseData } = await supabase
      .from("courses")
      .select(
        "*, instructor:users!instructor_id(full_name, email, avatar_url), category:categories(name)"
      )
      .eq("id", id)
      .single();

    if (!courseData) {
      setLoading(false);
      return;
    }

    setCourse(courseData);

    // Sections + lessons
    const { data: sectionsData } = await supabase
      .from("course_sections")
      .select("*, lessons:course_lessons(*)")
      .eq("course_id", id)
      .order("position");

    const sorted = (sectionsData || []).map((s) => ({
      ...s,
      lessons: (s.lessons || []).sort(
        (a: CourseLesson, b: CourseLesson) => a.position - b.position
      ),
    }));
    setSections(sorted);

    // Set first lesson with video as active
    for (const sec of sorted) {
      const firstLesson = sec.lessons?.find((l: CourseLesson) => l.video_url);
      if (firstLesson) {
        setActiveLesson(firstLesson);
        break;
      }
    }

    // Reviews
    const { data: reviewsData } = await supabase
      .from("reviews")
      .select("*, user:users(full_name)")
      .eq("course_id", id)
      .order("created_at", { ascending: false });
    setReviews(reviewsData || []);

    // Enrollment count
    const { count } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("course_id", id);
    setEnrollmentCount(count || 0);

    setLoading(false);
  }

  async function handleApprove() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !course) return;

    await supabase.from("courses").update({ is_approved: true }).eq("id", course.id);
    await supabase.from("course_approval_logs").insert({
      course_id: course.id,
      admin_id: user.id,
      action: "approved",
    });
    toast("Course approved", "success");
    setCourse({ ...course, is_approved: true });
  }

  function handleRevoke() {
    setConfirmConfig({
      title: "Revoke Approval",
      message: "This course will be hidden from students. Are you sure?",
      confirmLabel: "Revoke",
      variant: "warning",
      onConfirm: async () => {
        setConfirmOpen(false);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !course) return;
        await supabase.from("courses").update({ is_approved: false }).eq("id", course.id);
        await supabase.from("course_approval_logs").insert({
          course_id: course.id,
          admin_id: user.id,
          action: "rejected",
        });
        toast("Approval revoked", "warning");
        setCourse({ ...course, is_approved: false });
      },
    });
    setConfirmOpen(true);
  }

  function handleFlag() {
    setPromptConfig({
      title: "Flag Course",
      message: "Enter a reason for flagging this course.",
      placeholder: "e.g. Inappropriate content, misleading title...",
      submitLabel: "Flag Course",
      variant: "warning",
      required: true,
      onSubmit: async (reason) => {
        setPromptOpen(false);
        if (!course) return;
        await supabase
          .from("courses")
          .update({ is_flagged: true, flag_reason: reason, flag_appeal: null })
          .eq("id", course.id);
        toast("Course flagged", "warning");
        setCourse({ ...course, is_flagged: true, flag_reason: reason, flag_appeal: null });
      },
    });
    setPromptOpen(true);
  }

  function handleUnflag() {
    setConfirmConfig({
      title: "Unflag Course",
      message: "Remove the flag from this course?",
      confirmLabel: "Unflag",
      variant: "warning",
      onConfirm: async () => {
        setConfirmOpen(false);
        if (!course) return;
        await supabase
          .from("courses")
          .update({ is_flagged: false, flag_reason: null, flag_appeal: null })
          .eq("id", course.id);
        toast("Course unflagged", "info");
        setCourse({ ...course, is_flagged: false, flag_reason: null, flag_appeal: null });
      },
    });
    setConfirmOpen(true);
  }

  function handleDelete() {
    setConfirmConfig({
      title: "Delete Course Permanently",
      message: "This will permanently delete this course along with all sections, lessons, enrollments, reviews, and progress data. This cannot be undone.",
      confirmLabel: "Delete Permanently",
      variant: "danger",
      onConfirm: async () => {
        setConfirmOpen(false);
        if (!course) return;

        const { data: sectionData } = await supabase
          .from("course_sections").select("id").eq("course_id", course.id);
        const sectionIds = (sectionData || []).map((s) => s.id);

        if (sectionIds.length > 0) {
          const { data: lessonData } = await supabase
            .from("course_lessons").select("id").in("section_id", sectionIds);
          if (lessonData?.length) {
            await supabase.from("lesson_progress").delete().in("lesson_id", lessonData.map((l) => l.id));
          }
          await supabase.from("course_lessons").delete().in("section_id", sectionIds);
        }
        await supabase.from("course_sections").delete().eq("course_id", course.id);
        await supabase.from("reviews").delete().eq("course_id", course.id);
        await supabase.from("enrollments").delete().eq("course_id", course.id);
        await supabase.from("course_approval_logs").delete().eq("course_id", course.id);
        await supabase.from("courses").delete().eq("id", course.id);

        toast("Course deleted permanently", "error");
        router.push("/admin/courses");
      },
    });
    setConfirmOpen(true);
  }

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  if (!course) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>Course not found.</p>
        <Link href="/admin/courses" className="text-primary-600 hover:underline mt-2 inline-block">
          Back to Course Approvals
        </Link>
      </div>
    );
  }

  const totalLessons = sections.reduce((acc, s) => acc + (s.lessons?.length || 0), 0);
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <div>
      <ConfirmDialog
        open={confirmOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel={confirmConfig.confirmLabel}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
      <PromptDialog
        open={promptOpen}
        title={promptConfig.title}
        message={promptConfig.message}
        placeholder={promptConfig.placeholder}
        submitLabel={promptConfig.submitLabel}
        variant={promptConfig.variant}
        required={promptConfig.required}
        onSubmit={promptConfig.onSubmit}
        onCancel={() => setPromptOpen(false)}
      />

      {/* Back link */}
      <Link
        href="/admin/courses"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Course Approvals
      </Link>

      {/* Header with actions */}
      <div className="bg-white rounded-xl border p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{course.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              {course.instructor?.avatar_url ? (
                <img src={course.instructor.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-600">
                  {course.instructor?.full_name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{course.instructor?.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{course.instructor?.email}</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            {!course.is_approved ? (
              <button
                onClick={handleApprove}
                className="bg-green-600 text-white px-4 sm:px-5 py-2 rounded-lg hover:bg-green-700 font-medium text-sm"
              >
                Approve
              </button>
            ) : (
              <button
                onClick={handleRevoke}
                className="bg-red-50 text-red-600 px-4 sm:px-5 py-2 rounded-lg hover:bg-red-100 font-medium text-sm border border-red-200"
              >
                Revoke
              </button>
            )}
            {course.is_flagged ? (
              <button
                onClick={handleUnflag}
                className="bg-orange-100 text-orange-700 px-4 sm:px-5 py-2 rounded-lg hover:bg-orange-200 font-medium text-sm"
              >
                Unflag
              </button>
            ) : (
              <button
                onClick={handleFlag}
                className="bg-yellow-50 text-yellow-700 px-4 sm:px-5 py-2 rounded-lg hover:bg-yellow-100 font-medium text-sm border border-yellow-200"
              >
                Flag
              </button>
            )}
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 sm:px-5 py-2 rounded-lg hover:bg-red-700 font-medium text-sm"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Status badges + info */}
        <div className="flex flex-wrap items-center gap-3 mt-4 text-sm">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${course.is_approved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
            {course.is_approved ? "Approved" : "Pending"}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${course.is_published ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
            {course.is_published ? "Published" : "Draft"}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
            {course.level}
          </span>
          {course.is_flagged && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
              Flagged
            </span>
          )}
          {course.category && (
            <span className="text-gray-500">{course.category.name}</span>
          )}
          <span className="text-gray-500">&#8377;{course.price}</span>
        </div>

        {/* Flag info */}
        {course.is_flagged && course.flag_reason && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs font-medium text-red-800">Flag Reason:</p>
            <p className="text-sm text-red-700 mt-0.5">{course.flag_reason}</p>
          </div>
        )}
        {course.is_flagged && course.flag_appeal && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-medium text-amber-800">Instructor Appeal:</p>
            <p className="text-sm text-amber-700 mt-0.5">{course.flag_appeal}</p>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{sections.length}</p>
          <p className="text-xs text-gray-500 mt-1">Sections</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalLessons}</p>
          <p className="text-xs text-gray-500 mt-1">Lessons</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{enrollmentCount}</p>
          <p className="text-xs text-gray-500 mt-1">Enrollments</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-yellow-500">{avgRating || "—"}</p>
          <p className="text-xs text-gray-500 mt-1">{reviews.length} Reviews</p>
        </div>
      </div>

      {/* Main content: Video + Curriculum */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Video player */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border overflow-hidden">
            {activeLesson ? (
              <>
                <VideoPlayer url={activeLesson.video_url} title={activeLesson.title} />
                <div className="p-4">
                  <p className="font-medium text-gray-900">{activeLesson.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {activeLesson.video_url || "No video URL"}
                  </p>
                </div>
              </>
            ) : (
              <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Select a lesson to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lesson sidebar */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-900 text-sm">Course Content</h3>
            <p className="text-xs text-gray-500 mt-0.5">{sections.length} sections · {totalLessons} lessons</p>
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y">
            {sections.map((section, sIdx) => (
              <div key={section.id}>
                <div className="px-4 py-2.5 bg-gray-50 border-b">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Section {sIdx + 1}: {section.title}
                  </p>
                </div>
                {section.lessons?.map((lesson, lIdx) => (
                  <button
                    key={lesson.id}
                    onClick={() => setActiveLesson(lesson)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm transition-colors ${
                      activeLesson?.id === lesson.id
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-xs text-gray-400 w-6 shrink-0">
                      {sIdx + 1}.{lIdx + 1}
                    </span>
                    <span className="flex-1 truncate">{lesson.title}</span>
                    {lesson.video_url ? (
                      <svg className="w-4 h-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    )}
                    {lesson.is_preview && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-primary-100 text-primary-600 rounded font-medium shrink-0">
                        Preview
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
            {sections.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">
                No content added yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {course.description && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Course Description</h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{course.description}</p>
        </div>
      )}

      {/* Thumbnail */}
      {course.thumbnail_url && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Thumbnail</h2>
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="rounded-lg max-w-md w-full object-cover"
          />
        </div>
      )}

      {/* Reviews */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Reviews {avgRating && <span className="text-yellow-500 font-normal">({avgRating} avg)</span>}
        </h2>
        {reviews.length === 0 ? (
          <p className="text-gray-500 text-sm">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border-b pb-4 last:border-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm">
                      {review.user?.full_name}
                    </span>
                    <span className="text-yellow-500 text-sm">
                      {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                {review.comment && (
                  <p className="mt-1 text-sm text-gray-600">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
