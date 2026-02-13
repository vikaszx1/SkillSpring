"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Course } from "@/lib/types";
import Link from "next/link";

export default function InstructorCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

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

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  return (
    <div>
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
        <div className="grid gap-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl border p-6 flex items-center justify-between"
            >
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{course.title}</h3>
                <div className="flex items-center gap-3 mt-2 text-sm">
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
                  <span className="text-gray-500">${course.price}</span>
                  {course.category && (
                    <span className="text-gray-400">
                      {course.category.name}
                    </span>
                  )}
                </div>
              </div>
              <Link
                href={`/instructor/courses/${course.id}/edit`}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium text-sm"
              >
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
