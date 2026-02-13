"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useParams } from "next/navigation";
import type { Course, CourseSection, CourseLesson, LessonProgress } from "@/lib/types";
import VideoPlayer from "@/components/VideoPlayer";

export default function LearnPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const supabase = createClient();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<(CourseSection & { lessons: CourseLesson[] })[]>([]);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Get course
      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
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

      // Set first lesson as active
      if (sorted.length > 0 && sorted[0].lessons.length > 0) {
        setActiveLesson(sorted[0].lessons[0]);
      }

      // Get progress
      const allLessonIds = sorted.flatMap((s) =>
        s.lessons.map((l: CourseLesson) => l.id)
      );

      if (allLessonIds.length > 0) {
        const { data: progressData } = await supabase
          .from("lesson_progress")
          .select("lesson_id, is_completed")
          .eq("user_id", user.id)
          .in("lesson_id", allLessonIds);

        const progressMap: Record<string, boolean> = {};
        (progressData || []).forEach((p) => {
          progressMap[p.lesson_id] = p.is_completed;
        });
        setProgress(progressMap);
      }

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
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  const totalLessons = sections.reduce((acc, s) => acc + s.lessons.length, 0);
  const completedLessons = Object.values(progress).filter(Boolean).length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
      {/* Video area */}
      <div className="flex-1">
        <VideoPlayer
          url={activeLesson?.video_url || null}
          title={activeLesson?.title || ""}
        />
        <div className="p-6">
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
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-80 border-l bg-white overflow-y-auto">
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
                  onClick={() => setActiveLesson(lesson)}
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
    </div>
  );
}
