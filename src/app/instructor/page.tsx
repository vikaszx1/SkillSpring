"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Course } from "@/lib/types";
import Link from "next/link";

export default function InstructorDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, students: 0 });
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: coursesData } = await supabase
        .from("courses")
        .select("*")
        .eq("instructor_id", user.id)
        .order("created_at", { ascending: false });

      const courses = coursesData || [];
      setCourses(courses);

      const { count: enrollmentCount } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .in(
          "course_id",
          courses.map((c) => c.id)
        );

      setStats({
        total: courses.length,
        approved: courses.filter((c) => c.is_approved).length,
        students: enrollmentCount || 0,
      });
    }
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link
          href="/instructor/courses/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium text-sm"
        >
          Create Course
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border">
          <p className="text-sm text-gray-500">Total Courses</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border">
          <p className="text-sm text-gray-500">Approved</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {stats.approved}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border">
          <p className="text-sm text-gray-500">Total Students</p>
          <p className="text-3xl font-bold text-primary-600 mt-1">
            {stats.students}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900">Recent Courses</h2>
        </div>
        {courses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No courses yet.{" "}
            <Link
              href="/instructor/courses/new"
              className="text-primary-600 hover:underline"
            >
              Create your first course
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {courses.slice(0, 5).map((course) => (
              <div
                key={course.id}
                className="p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">{course.title}</p>
                  <p className="text-sm text-gray-500">
                    {course.is_approved ? (
                      <span className="text-green-600">Approved</span>
                    ) : (
                      <span className="text-yellow-600">Pending Approval</span>
                    )}
                    {" · "}&#8377;{course.price}
                  </p>
                </div>
                <Link
                  href={`/instructor/courses/${course.id}/edit`}
                  className="text-sm text-primary-600 hover:underline"
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
