import Link from "next/link";
import type { Course } from "@/lib/types";

interface CourseCardProps {
  course: Course;
  reviewData?: { avg: number; count: number };
  lessonCount?: number;
}

export default function CourseCard({
  course,
  reviewData,
  lessonCount,
}: CourseCardProps) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all duration-200"
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-100 relative overflow-hidden">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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

        {/* Title */}
        <h3 className="mt-1 font-semibold text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {course.title}
        </h3>

        {/* Instructor */}
        <p className="mt-1.5 text-sm text-gray-500">
          {Array.isArray(course.instructor)
            ? (course.instructor as { full_name: string }[])[0]?.full_name
            : course.instructor?.full_name}
        </p>

        {/* Level badge */}
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

        {/* Rating & lessons */}
        <div className="mt-3 flex items-center justify-between text-sm">
          {reviewData && reviewData.count > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="text-yellow-500 font-semibold">
                {reviewData.avg.toFixed(1)}
              </span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= Math.round(reviewData.avg)
                        ? "text-yellow-400"
                        : "text-gray-200"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-gray-400">({reviewData.count})</span>
            </div>
          ) : (
            <span className="text-gray-400 text-xs">No reviews yet</span>
          )}

          {lessonCount !== undefined && (
            <span className="text-gray-400 text-xs">
              {lessonCount} lesson{lessonCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
