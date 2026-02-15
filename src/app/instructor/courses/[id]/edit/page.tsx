"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import type { Course, CourseSection, CourseLesson, Category, CourseLevel } from "@/lib/types";
import ThumbnailUpload from "@/components/ThumbnailUpload";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { PageLoader } from "@/components/Spinner";

export default function EditCoursePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [level, setLevel] = useState<CourseLevel>("beginner");
  const [isPublished, setIsPublished] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sections, setSections] = useState<(CourseSection & { lessons?: CourseLesson[] })[]>([]);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    loadCourse();
    loadCategories();
  }, []);

  async function loadCategories() {
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories(data || []);
  }

  async function loadCourse() {
    const { data: courseData } = await supabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .single();

    if (!courseData) {
      router.push("/instructor/courses");
      return;
    }

    setCourse(courseData);
    setTitle(courseData.title);
    setDescription(courseData.description || "");
    setPrice(courseData.price.toString());
    setCategoryId(courseData.category_id || "");
    setThumbnailUrl(courseData.thumbnail_url || "");
    setLevel(courseData.level || "beginner");
    setIsPublished(courseData.is_published);

    const { data: sectionsData } = await supabase
      .from("course_sections")
      .select("*, lessons:course_lessons(*)")
      .eq("course_id", id)
      .order("position");

    const sortedSections = (sectionsData || []).map((s) => ({
      ...s,
      lessons: (s.lessons || []).sort(
        (a: CourseLesson, b: CourseLesson) => a.position - b.position
      ),
    }));

    setSections(sortedSections);
    setLoading(false);
  }

  async function handleSaveCourse(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const { error: updateError } = await supabase
      .from("courses")
      .update({
        title,
        description,
        price: parseFloat(price),
        level,
        category_id: categoryId || null,
        thumbnail_url: thumbnailUrl || null,
        is_published: isPublished,
      })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      toast(updateError.message, "error");
    } else {
      toast("Course saved successfully", "success");
    }
    setSaving(false);
  }

  async function handleAddSection() {
    if (!newSectionTitle.trim()) return;

    const { error: insertError } = await supabase
      .from("course_sections")
      .insert({
        course_id: id,
        title: newSectionTitle,
        position: sections.length,
      });

    if (!insertError) {
      setNewSectionTitle("");
      toast("Section added", "success");
      loadCourse();
    }
  }

  function handleDeleteSection(sectionId: string) {
    setConfirmConfig({
      title: "Delete Section",
      message: "Are you sure you want to delete this section? All lessons within it will also be removed.",
      confirmLabel: "Delete Section",
      variant: "danger",
      onConfirm: async () => {
        setConfirmOpen(false);
        await supabase.from("course_sections").delete().eq("id", sectionId);
        toast("Section deleted", "warning");
        loadCourse();
      },
    });
    setConfirmOpen(true);
  }

  async function handleAddLesson(sectionId: string) {
    const section = sections.find((s) => s.id === sectionId);
    const lessonCount = section?.lessons?.length || 0;

    const { error: insertError } = await supabase
      .from("course_lessons")
      .insert({
        section_id: sectionId,
        title: "New Lesson",
        position: lessonCount,
      });

    if (!insertError) {
      toast("Lesson added", "success");
      loadCourse();
    }
  }

  async function handleUpdateLesson(
    lessonId: string,
    updates: Partial<CourseLesson>
  ) {
    await supabase.from("course_lessons").update(updates).eq("id", lessonId);
  }

  function handleDeleteLesson(lessonId: string) {
    setConfirmConfig({
      title: "Remove Lesson",
      message: "Are you sure you want to remove this lesson?",
      confirmLabel: "Remove",
      variant: "danger",
      onConfirm: async () => {
        setConfirmOpen(false);
        await supabase.from("course_lessons").delete().eq("id", lessonId);
        toast("Lesson removed", "warning");
        loadCourse();
      },
    });
    setConfirmOpen(true);
  }

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-3xl w-full">
      <ConfirmDialog
        open={confirmOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel={confirmConfig.confirmLabel}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmOpen(false)}
      />

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Edit Course</h1>
        <div className="flex items-center gap-2 text-sm">
          {course?.is_approved ? (
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
              Approved
            </span>
          ) : (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
              Pending Approval
            </span>
          )}
        </div>
      </div>

      {/* Course Details Form */}
      <form
        onSubmit={handleSaveCourse}
        className="bg-white rounded-xl border p-6 space-y-4 mb-8"
      >
        <h2 className="font-semibold text-gray-900">Course Details</h2>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (₹)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Level
          </label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as CourseLevel)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <ThumbnailUpload
          currentUrl={thumbnailUrl}
          onUploaded={(url) => setThumbnailUrl(url)}
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="published"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="published" className="text-sm text-gray-700">
            Published (visible to students once approved)
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 font-medium text-sm disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* Sections & Lessons */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          Course Content
        </h2>

        <div className="space-y-4">
          {sections.map((section, sIdx) => (
            <div key={section.id} className="border rounded-lg">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-t-lg">
                <h3 className="font-medium text-gray-900 text-sm">
                  Section {sIdx + 1}: {section.title}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddLesson(section.id)}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    + Lesson
                  </button>
                  <button
                    onClick={() => handleDeleteSection(section.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {section.lessons && section.lessons.length > 0 && (
                <div className="divide-y">
                  {section.lessons.map((lesson, lIdx) => (
                    <div
                      key={lesson.id}
                      className="p-3 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3"
                    >
                      <div className="flex items-center gap-3 sm:contents">
                        <span className="text-xs text-gray-400 w-6 flex-shrink-0">
                          {sIdx + 1}.{lIdx + 1}
                        </span>
                        <input
                          type="text"
                          defaultValue={lesson.title}
                          onBlur={(e) =>
                            handleUpdateLesson(lesson.id, {
                              title: e.target.value,
                            })
                          }
                          className="flex-1 px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-primary-500 outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-3 pl-9 sm:pl-0">
                        <input
                          type="url"
                          defaultValue={lesson.video_url || ""}
                          placeholder="Video URL"
                          onBlur={(e) =>
                            handleUpdateLesson(lesson.id, {
                              video_url: e.target.value || null,
                            })
                          }
                          className="flex-1 sm:w-48 sm:flex-none px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-primary-500 outline-none"
                        />
                        <label className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                          <input
                            type="checkbox"
                            defaultChecked={lesson.is_preview}
                            onChange={(e) =>
                              handleUpdateLesson(lesson.id, {
                                is_preview: e.target.checked,
                              })
                            }
                            className="rounded"
                          />
                          Preview
                        </label>
                        <button
                          onClick={() => handleDeleteLesson(lesson.id)}
                          className="text-xs text-red-500 hover:underline flex-shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <input
            type="text"
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            placeholder="New section title"
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSection())}
          />
          <button
            onClick={handleAddSection}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium text-sm"
          >
            Add Section
          </button>
        </div>
      </div>
    </div>
  );
}
