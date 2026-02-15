"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";
import type { Enrollment } from "@/lib/types";
import Link from "next/link";
import { PageLoader } from "@/components/Spinner";

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("enrollments")
        .select(
          "*, course:courses(id, title, slug, thumbnail_url, price, level, instructor:users!instructor_id(full_name), category:categories(name))"
        )
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false });

      setEnrollments(data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My Enrollments</h1>

      {enrollments.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-gray-500 mb-4">No enrollments yet.</p>
          <Link
            href="/courses"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium text-sm"
          >
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((enrollment) => {
            const course = enrollment.course as any;
            const instructor = course?.instructor;
            const instructorName = Array.isArray(instructor)
              ? instructor[0]?.full_name
              : instructor?.full_name;
            const category = course?.category;
            const categoryName = Array.isArray(category)
              ? category[0]?.name
              : category?.name;

            return (
              <div
                key={enrollment.id}
                className="bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all duration-200"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  {course?.thumbnail_url ? (
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
                      {course?.price === 0 ? "Free" : `₹${course?.price}`}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  {categoryName && (
                    <span className="text-xs font-medium text-primary-600 uppercase tracking-wide">
                      {categoryName}
                    </span>
                  )}

                  <h3 className="mt-1 font-semibold text-gray-900 line-clamp-2">
                    {course?.title}
                  </h3>

                  {instructorName && (
                    <p className="mt-1.5 text-sm text-gray-500">
                      {instructorName}
                    </p>
                  )}

                  {/* Level badge */}
                  {course?.level && (
                    <span
                      className={`inline-block mt-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                        course.level === "beginner"
                          ? "bg-green-100 text-green-700"
                          : course.level === "intermediate"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {course.level.charAt(0).toUpperCase() +
                        course.level.slice(1)}
                    </span>
                  )}

                  {/* Enrollment info */}
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      <p>Enrolled {formatDate(enrollment.enrolled_at)}</p>
                      <p className="mt-0.5">
                        Paid ₹{enrollment.amount_paid}
                      </p>
                    </div>
                    <Link
                      href={`/student/courses/${enrollment.course_id}/learn`}
                      className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium text-sm flex-shrink-0"
                    >
                      Learn
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
