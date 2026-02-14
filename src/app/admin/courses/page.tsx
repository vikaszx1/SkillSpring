"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Course } from "@/lib/types";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import PromptDialog from "@/components/PromptDialog";
import Link from "next/link";

export default function CourseApprovalsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filter, setFilter] = useState<"pending" | "all" | "flagged" | "appeals">("all");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const { toast } = useToast();

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "danger" | "warning";
    onConfirm: () => void;
  }>({ title: "", message: "", confirmLabel: "", variant: "danger", onConfirm: () => {} });

  // Prompt dialog state
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

  function showConfirm(config: typeof confirmConfig) {
    setConfirmConfig(config);
    setConfirmOpen(true);
  }

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
    } else if (filter === "flagged") {
      query = query.eq("is_flagged", true);
    } else if (filter === "appeals") {
      query = query.eq("is_flagged", true).not("flag_appeal", "is", null);
    }

    const { data } = await query;
    setCourses(data || []);
    setLoading(false);
  }

  async function handleApproval(courseId: string, action: "approved" | "rejected") {
    if (action === "rejected") {
      showConfirm({
        title: "Revoke Approval",
        message: "Are you sure you want to revoke approval for this course? It will be hidden from students.",
        confirmLabel: "Revoke",
        variant: "warning",
        onConfirm: () => executeApproval(courseId, action),
      });
      return;
    }
    executeApproval(courseId, action);
  }

  async function executeApproval(courseId: string, action: "approved" | "rejected") {
    setConfirmOpen(false);
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

    await supabase.from("course_approval_logs").insert({
      course_id: courseId,
      admin_id: user.id,
      action,
    });

    toast(
      action === "approved" ? "Course approved" : "Course approval revoked",
      action === "approved" ? "success" : "warning"
    );
    loadCourses();
  }

  function handleToggleFlag(courseId: string, currentlyFlagged: boolean) {
    if (currentlyFlagged) {
      showConfirm({
        title: "Unflag Course",
        message: "Are you sure you want to remove the flag from this course?",
        confirmLabel: "Unflag",
        variant: "warning",
        onConfirm: () => executeUnflag(courseId),
      });
    } else {
      setPromptConfig({
        title: "Flag Course",
        message: "Enter a reason for flagging this course.",
        placeholder: "e.g. Inappropriate content, misleading title...",
        submitLabel: "Flag Course",
        variant: "warning",
        required: true,
        onSubmit: (reason) => {
          setPromptOpen(false);
          executeFlag(courseId, reason);
        },
      });
      setPromptOpen(true);
    }
  }

  async function executeFlag(courseId: string, reason: string) {
    setConfirmOpen(false);
    await supabase
      .from("courses")
      .update({ is_flagged: true, flag_reason: reason, flag_appeal: null })
      .eq("id", courseId);
    toast("Course flagged", "warning");
    loadCourses();
  }

  async function executeUnflag(courseId: string) {
    setConfirmOpen(false);
    await supabase
      .from("courses")
      .update({ is_flagged: false, flag_reason: null, flag_appeal: null })
      .eq("id", courseId);
    toast("Course unflagged", "info");
    loadCourses();
  }

  function handleDeleteCourse(courseId: string) {
    showConfirm({
      title: "Delete Course Permanently",
      message: "This will permanently delete this course along with all sections, lessons, enrollments, reviews, and progress data. This action cannot be undone.",
      confirmLabel: "Delete Permanently",
      variant: "danger",
      onConfirm: () => executeDeleteCourse(courseId),
    });
  }

  async function executeDeleteCourse(courseId: string) {
    setConfirmOpen(false);

    const { data: sectionData } = await supabase
      .from("course_sections")
      .select("id")
      .eq("course_id", courseId);

    const sectionIds = (sectionData || []).map((s) => s.id);

    if (sectionIds.length > 0) {
      await supabase
        .from("lesson_progress")
        .delete()
        .in(
          "lesson_id",
          (
            await supabase
              .from("course_lessons")
              .select("id")
              .in("section_id", sectionIds)
          ).data?.map((l) => l.id) || []
        );
      await supabase.from("course_lessons").delete().in("section_id", sectionIds);
    }
    await supabase.from("course_sections").delete().eq("course_id", courseId);
    await supabase.from("reviews").delete().eq("course_id", courseId);
    await supabase.from("enrollments").delete().eq("course_id", courseId);
    await supabase.from("course_approval_logs").delete().eq("course_id", courseId);
    await supabase.from("courses").delete().eq("id", courseId);

    toast("Course deleted permanently", "error");
    loadCourses();
  }

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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Course Approvals</h1>
        <div className="flex flex-wrap gap-2">
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
            onClick={() => setFilter("flagged")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filter === "flagged"
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Flagged
          </button>
          <button
            onClick={() => setFilter("appeals")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filter === "appeals"
                ? "bg-amber-100 text-amber-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Appeals
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
            : filter === "flagged"
            ? "No flagged courses."
            : filter === "appeals"
            ? "No pending appeals."
            : "No courses found."}
        </div>
      ) : (
        <div className="bg-white rounded-xl border divide-y">
          {courses.map((course) => (
            <div key={course.id} className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 truncate">
                    By {course.instructor?.full_name} ({course.instructor?.email})
                  </p>
                  {course.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {course.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3 text-sm">
                    <span className="text-gray-500">&#8377;{course.price}</span>
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
                    {course.is_flagged && (
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700"
                        title={course.flag_reason || undefined}
                      >
                        Flagged
                      </span>
                    )}
                  </div>
                  {course.is_flagged && course.flag_reason && (
                    <p className="text-xs text-red-600 mt-2">
                      <span className="font-medium">Flag reason:</span> {course.flag_reason}
                    </p>
                  )}
                  {course.is_flagged && course.flag_appeal && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-medium text-amber-800">Instructor Appeal:</p>
                      <p className="text-xs text-amber-700 mt-0.5">{course.flag_appeal}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 flex-shrink-0">
                  <Link
                    href={`/admin/courses/${course.id}`}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium text-sm"
                  >
                    Review
                  </Link>
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
                  <button
                    onClick={() =>
                      handleToggleFlag(course.id, !!course.is_flagged)
                    }
                    className={`px-4 py-2 rounded-lg font-medium text-sm ${
                      course.is_flagged
                        ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                        : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                    }`}
                  >
                    {course.is_flagged ? "Unflag" : "Flag"}
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(course.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
