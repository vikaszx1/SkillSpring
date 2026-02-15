"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Course } from "@/lib/types";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import PromptDialog from "@/components/PromptDialog";
import { PageLoader } from "@/components/Spinner";

export default function InstructorCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const { toast } = useToast();

  // Prompt dialog
  const [promptOpen, setPromptOpen] = useState(false);
  const [appealCourseId, setAppealCourseId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("courses")
        .select("*, category:categories(*)")
        .eq("instructor_id", user.id)
        .order("created_at", { ascending: false });

      setCourses(data || []);
      setLoading(false);
    }
    load();
  }, []);

  function handleAppeal(courseId: string) {
    setAppealCourseId(courseId);
    setPromptOpen(true);
  }

  async function submitAppeal(appeal: string) {
    if (!appealCourseId) return;
    setPromptOpen(false);
    const { error } = await supabase
      .from("courses")
      .update({ flag_appeal: appeal })
      .eq("id", appealCourseId);
    if (!error) {
      toast("Appeal submitted successfully", "success");
      setCourses((prev) =>
        prev.map((c) => (c.id === appealCourseId ? { ...c, flag_appeal: appeal } : c))
      );
    } else {
      toast(error.message, "error");
    }
    setAppealCourseId(null);
  }

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div>
      <PromptDialog
        open={promptOpen}
        title="Submit Appeal"
        message="Describe why this course should be unflagged."
        placeholder="e.g. The content has been updated to comply with guidelines..."
        submitLabel="Submit Appeal"
        variant="warning"
        required
        onSubmit={submitAppeal}
        onCancel={() => { setPromptOpen(false); setAppealCourseId(null); }}
      />

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
        <Link
          href="/instructor/courses/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium text-sm"
        >
          Create Course
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-gray-500 mb-4">You haven&apos;t created any courses yet.</p>
          <Link
            href="/instructor/courses/new"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium text-sm"
          >
            Create your first course
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all duration-200"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-gray-100 relative overflow-hidden">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-50">
                    <svg
                      className="w-12 h-12 text-primary-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                      />
                    </svg>
                  </div>
                )}

                {/* Price badge */}
                <div className="absolute top-3 right-3">
                  <span className="bg-white/90 backdrop-blur-sm text-gray-900 px-2.5 py-1 rounded-lg text-sm font-bold shadow-sm">
                    {course.price === 0 ? "Free" : `₹${course.price}`}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                {/* Category */}
                {course.category && (
                  <span className="text-xs font-medium text-primary-600 uppercase tracking-wide">
                    {course.category.name}
                  </span>
                )}

                <h3 className="mt-1 font-semibold text-gray-900 line-clamp-2">
                  {course.title}
                </h3>

                {/* Level */}
                {course.level && (
                  <span
                    className={`inline-block mt-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                      course.level === "beginner"
                        ? "bg-green-100 text-green-700"
                        : course.level === "intermediate"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
                  </span>
                )}

                {/* Status badges */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      course.is_approved
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {course.is_approved ? "Approved" : "Pending"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      course.is_published
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {course.is_published ? "Published" : "Draft"}
                  </span>
                  {course.is_flagged && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      Flagged
                    </span>
                  )}
                </div>

                {/* Flag info */}
                {course.is_flagged && course.flag_reason && (
                  <p className="text-xs text-red-600 mt-2">
                    <span className="font-medium">Reason:</span> {course.flag_reason}
                  </p>
                )}
                {course.is_flagged && course.flag_appeal && (
                  <p className="text-xs text-amber-600 mt-1">
                    <span className="font-medium">Your appeal:</span> {course.flag_appeal}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  {course.is_flagged && !course.flag_appeal && (
                    <button
                      onClick={() => handleAppeal(course.id)}
                      className="flex-1 bg-amber-50 text-amber-700 px-3 py-2 rounded-lg hover:bg-amber-100 font-medium text-sm text-center"
                    >
                      Appeal
                    </button>
                  )}
                  <Link
                    href={`/instructor/courses/${course.id}/edit`}
                    className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 font-medium text-sm text-center"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
