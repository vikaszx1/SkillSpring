import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const { courseId } = await request.json();

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 }
      );
    }

    // Create Supabase client from request cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get course details and verify it exists & is purchasable
    const { data: course } = await supabase
      .from("courses")
      .select("id, title, price, is_approved, is_published")
      .eq("id", courseId)
      .eq("is_approved", true)
      .eq("is_published", true)
      .single();

    if (!course) {
      return NextResponse.json(
        { error: "Course not found or not available" },
        { status: 404 }
      );
    }

    if (course.price <= 0) {
      return NextResponse.json(
        { error: "This is a free course. Use direct enrollment." },
        { status: 400 }
      );
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .single();

    if (existingEnrollment) {
      return NextResponse.json(
        { error: "Already enrolled in this course" },
        { status: 400 }
      );
    }

    // Create Razorpay order (amount in paise — INR smallest unit)
    const amountInPaise = Math.round(course.price * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `course_${courseId}_${user.id}_${Date.now()}`,
      notes: {
        courseId,
        userId: user.id,
        courseTitle: course.title,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      courseName: course.title,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: unknown) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
