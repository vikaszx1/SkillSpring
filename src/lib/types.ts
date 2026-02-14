export type UserRole = "admin" | "instructor" | "student";
export type CourseLevel = "beginner" | "intermediate" | "advanced";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Course {
  id: string;
  instructor_id: string;
  category_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  level: CourseLevel;
  is_approved: boolean;
  is_published: boolean;
  is_flagged: boolean;
  flag_reason: string | null;
  flag_appeal: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  instructor?: User;
  category?: Category;
  sections?: CourseSection[];
}

export interface CourseSection {
  id: string;
  course_id: string;
  title: string;
  position: number;
  created_at: string;
  lessons?: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  section_id: string;
  title: string;
  video_url: string | null;
  duration: number;
  position: number;
  is_preview: boolean;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  payment_id: string | null;
  amount_paid: number;
  enrolled_at: string;
  course?: Course;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  is_completed: boolean;
  completed_at: string | null;
}

export interface Review {
  id: string;
  user_id: string;
  course_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user?: User;
}

export type PaymentMethodType = "upi" | "bank";

export interface InstructorPaymentMethod {
  id: string;
  instructor_id: string;
  method_type: PaymentMethodType;
  upi_id: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_account_name: string | null;
  is_default: boolean;
  created_at: string;
}

export interface PayoutRequest {
  id: string;
  instructor_id: string;
  amount: number;
  status: "pending" | "paid" | "rejected";
  payment_method_type: PaymentMethodType | null;
  payment_details: string | null;
  admin_note: string | null;
  requested_at: string;
  processed_at: string | null;
  instructor?: User;
}

export interface Payment {
  id: string;
  user_id: string;
  course_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  amount: number;
  currency: string;
  status: "captured" | "refunded";
  created_at: string;
  // Joined fields
  user?: User;
  course?: Course;
}

export interface CourseApprovalLog {
  id: string;
  course_id: string;
  admin_id: string;
  action: "approved" | "rejected";
  notes: string | null;
  created_at: string;
}
