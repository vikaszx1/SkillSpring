import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase-admin";
import { createHmac } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
    } = await request.json();

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !courseId
    ) {
      return NextResponse.json(
        { error: "Missing required payment fields" },
        { status: 400 }
      );
    }

    // Verify Razorpay signature (HMAC SHA256)
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = createHmac(
      "sha256",
      process.env.RAZORPAY_KEY_SECRET!
    )
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // Auth client — get the logged-in user
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Service Role client — insert enrollment (bypasses RLS)
    const adminSupabase = createAdminClient();

    // Fetch course price for the record
    const { data: course } = await adminSupabase
      .from("courses")
      .select("price")
      .eq("id", courseId)
      .single();

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Insert payment record
    const { error: paymentError } = await adminSupabase
      .from("payments")
      .insert({
        user_id: user.id,
        course_id: courseId,
        razorpay_order_id,
        razorpay_payment_id,
        amount: course.price,
        currency: "INR",
        status: "captured",
      });

    if (paymentError) {
      console.error("Payment record error:", paymentError);
      // Don't block enrollment if payment record fails (payment is already verified)
    }

    // Insert enrollment
    const { error: enrollError } = await adminSupabase
      .from("enrollments")
      .insert({
        user_id: user.id,
        course_id: courseId,
        payment_id: razorpay_payment_id,
        amount_paid: course.price,
      });

    if (enrollError) {
      if (enrollError.code === "23505") {
        return NextResponse.json(
          { error: "Already enrolled in this course" },
          { status: 400 }
        );
      }
      console.error("Enrollment error:", enrollError);
      return NextResponse.json(
        { error: "Failed to create enrollment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and enrollment created",
    });
  } catch (error: unknown) {
    console.error("Verify payment error:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
