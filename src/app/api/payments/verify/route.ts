import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import crypto from "crypto";

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

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // Signature verified — create Supabase client
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

    // Verify user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get course price for the enrollment record
    const { data: course } = await supabase
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

    // Insert enrollment
    const { error: enrollError } = await supabase.from("enrollments").insert({
      user_id: user.id,
      course_id: courseId,
      payment_id: razorpay_payment_id,
      amount_paid: course.price,
    });

    if (enrollError) {
      // Duplicate enrollment check
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
