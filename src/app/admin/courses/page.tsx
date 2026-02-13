"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Course } from "@/lib/types";

export default function CourseApprovalsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadCourses();
  }, [filter]);

  async function loadCourses() {
    setLoading(true);
    let query = supabase
      .from("courses")
      .select("*, instructor:users!instructor_id(full_name, email), category:categories(name)")
      .order("created_at", { ascending: false });

    if (filter === "pending") {
      query = query.eq("is_approved", false);
    }

    const { data } = await query;
    setCourses(data || []);
    setLoading(false);
  }

  async function handleApproval(courseId: string, action: "approved" | "rejected") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (action === "approved") {
      await supabase
        .from("courses")
        .update({ is_approved: true })
        .eq("id", courseId);
    } else {
      await supabase
        .from("courses")
        .update({ is_approved: false })
        .eq("id", courseId);
    }

    // Log the action
    await supabase.from("course_approval_logs").insert({
      course_id: courseId,
      admin_id: user.id,
      action,
    });

    loadCourses();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Course Approvals</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filter === "pending"
                ? "bg-primary-100 text-primary-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filter === "all"
                ? "bg-primary-100 text-primary-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            All Courses
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
          {filter === "pending"
            ? "No courses pending approval."
            : "No courses found."}
        </div>
      ) : (
        <div className="bg-white rounded-xl border divide-y">
          {courses.map((course) => (
            <div key={course.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    By {course.instructor?.full_name} ({course.instructor?.email})
                  </p>
                  {course.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {course.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-sm">
                    <span className="text-gray-500">${course.price}</span>
                    {course.category && (
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                        {course.category.name}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        course.is_approved
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {course.is_approved ? "Approved" : "Pending"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        course.is_published
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {course.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  {!course.is_approved && (
                    <button
                      onClick={() => handleApproval(course.id, "approved")}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium text-sm"
                    >
                      Approve
                    </button>
                  )}
                  {course.is_approved && (
                    <button
                      onClick={() => handleApproval(course.id, "rejected")}
                      className="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 font-medium text-sm"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
