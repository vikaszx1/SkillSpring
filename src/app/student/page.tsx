"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Enrollment } from "@/lib/types";
import Link from "next/link";

export default function StudentDashboard() {
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
        .select("*, course:courses(id, title, slug, thumbnail_url, instructor_id)")
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false });

      setEnrollments(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <Link
          href="/courses"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium text-sm"
        >
          Browse Courses
        </Link>
      </div>

      <div className="bg-white p-6 rounded-xl border mb-8">
        <p className="text-sm text-gray-500">Enrolled Courses</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">
          {enrollments.length}
        </p>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : enrollments.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-gray-500 mb-4">
            You haven&apos;t enrolled in any courses yet.
          </p>
          <Link
            href="/courses"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium text-sm"
          >
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrollments.map((enrollment) => (
            <Link
              key={enrollment.id}
              href={`/student/courses/${enrollment.course_id}/learn`}
              className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-video bg-gray-200">
                {enrollment.course?.thumbnail_url ? (
                  <img
                    src={enrollment.course.thumbnail_url}
                    alt={enrollment.course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    No thumbnail
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">
                  {enrollment.course?.title}
                </h3>
                <p className="text-sm text-primary-600 mt-2 font-medium">
                  Continue Learning →
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
