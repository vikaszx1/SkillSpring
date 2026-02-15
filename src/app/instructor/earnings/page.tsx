"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { PayoutRequest, InstructorPaymentMethod } from "@/lib/types";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";
import { PageLoader } from "@/components/Spinner";

interface CourseEarning {
  course_id: string;
  course_title: string;
  enrollments: number;
  revenue: number;
}

interface RecentTransaction {
  id: string;
  course_title: string;
  student_name: string;
  amount: number;
  date: string;
}

export default function InstructorEarningsPage() {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPaidOut, setTotalPaidOut] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [totalEnrollments, setTotalEnrollments] = useState(0);
  const [courseEarnings, setCourseEarnings] = useState<CourseEarning[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<InstructorPaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    loadEarnings();
  }, []);

  async function loadEarnings() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get all courses by this instructor
    const { data: courses } = await supabase
      .from("courses")
      .select("id, title")
      .eq("instructor_id", user.id);

    // Load payment method
    const { data: pmData } = await supabase
      .from("instructor_payment_methods")
      .select("*")
      .eq("instructor_id", user.id)
      .eq("is_default", true)
      .single();
    setPaymentMethod(pmData);

    if (!courses || courses.length === 0) {
      // Still load payouts even with no courses
      const { data: payoutData } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("instructor_id", user.id)
        .order("requested_at", { ascending: false });
      setPayouts(payoutData || []);
      setLoading(false);
      return;
    }

    const courseIds = courses.map((c) => c.id);

    // Get all enrollments for these courses
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("id, course_id, amount_paid, enrolled_at, user:users(full_name)")
      .in("course_id", courseIds)
      .order("enrolled_at", { ascending: false });

    const allEnrollments = enrollments || [];

    // Calculate totals
    const revenue = allEnrollments.reduce((sum, e) => sum + (e.amount_paid || 0), 0);
    setTotalRevenue(revenue);
    setTotalEnrollments(allEnrollments.length);

    // Per-course earnings
    const courseMap = new Map<string, CourseEarning>();
    for (const c of courses) {
      courseMap.set(c.id, {
        course_id: c.id,
        course_title: c.title,
        enrollments: 0,
        revenue: 0,
      });
    }
    for (const e of allEnrollments) {
      const entry = courseMap.get(e.course_id);
      if (entry) {
        entry.enrollments++;
        entry.revenue += e.amount_paid || 0;
      }
    }
    setCourseEarnings(
      Array.from(courseMap.values()).sort((a, b) => b.revenue - a.revenue)
    );

    // Recent transactions (last 20)
    const recent = allEnrollments.slice(0, 20).map((e) => ({
      id: e.id,
      course_title: courses.find((c) => c.id === e.course_id)?.title || "",
      student_name: (e.user as unknown as { full_name: string } | null)?.full_name || "Unknown",
      amount: e.amount_paid || 0,
      date: e.enrolled_at,
    }));
    setRecentTransactions(recent);

    // Load payout requests
    const { data: payoutData } = await supabase
      .from("payout_requests")
      .select("*")
      .eq("instructor_id", user.id)
      .order("requested_at", { ascending: false });

    const allPayouts = payoutData || [];
    setPayouts(allPayouts);

    const paidOut = allPayouts
      .filter((p) => p.status === "paid")
      .reduce((sum: number, p: PayoutRequest) => sum + p.amount, 0);
    const pending = allPayouts
      .filter((p) => p.status === "pending")
      .reduce((sum: number, p: PayoutRequest) => sum + p.amount, 0);
    setTotalPaidOut(paidOut);
    setTotalPending(pending);

    setLoading(false);
  }

  async function handleWithdraw() {
    setWithdrawError("");
    setWithdrawSuccess("");

    if (!paymentMethod) {
      setWithdrawError("Please set up your payment method in Payout Settings first.");
      return;
    }

    const amount = parseFloat(withdrawAmount);
    const availableBalance = totalRevenue - totalPaidOut - totalPending;

    if (!amount || amount <= 0) {
      setWithdrawError("Enter a valid amount");
      return;
    }
    if (amount > availableBalance) {
      setWithdrawError(`Maximum available: ₹${availableBalance.toLocaleString()}`);
      return;
    }

    setWithdrawing(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Build payment details string for admin
    let paymentDetails = "";
    if (paymentMethod.method_type === "upi") {
      paymentDetails = `UPI: ${paymentMethod.upi_id}`;
    } else {
      paymentDetails = `Bank: ${paymentMethod.bank_account_name} | A/C: ${paymentMethod.bank_account_number} | IFSC: ${paymentMethod.bank_ifsc}`;
    }

    const { error } = await supabase.from("payout_requests").insert({
      instructor_id: user.id,
      amount,
      payment_method_type: paymentMethod.method_type,
      payment_details: paymentDetails,
    });

    if (error) {
      setWithdrawError(error.message);
      toast(error.message, "error");
    } else {
      setWithdrawSuccess(`Withdrawal request for ₹${amount.toLocaleString()} submitted!`);
      setWithdrawAmount("");
      toast(`Withdrawal of ₹${amount.toLocaleString()} requested`, "success");
      loadEarnings();
    }
    setWithdrawing(false);
  }

  if (loading) return <PageLoader />;

  const availableBalance = totalRevenue - totalPaidOut - totalPending;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Earnings</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            ₹{totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border">
          <p className="text-sm text-gray-500">Paid Out</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            ₹{totalPaidOut.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border">
          <p className="text-sm text-gray-500">Pending Withdrawal</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">
            ₹{totalPending.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border">
          <p className="text-sm text-gray-500">Available Balance</p>
          <p className="text-3xl font-bold text-primary-600 mt-1">
            ₹{availableBalance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Withdraw Section */}
      <div className="bg-white rounded-xl border p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-4">Request Withdrawal</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="flex">
              <span className="inline-flex items-center px-3 border border-r-0 rounded-l-lg bg-gray-50 text-gray-500 text-sm">
                ₹
              </span>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={`Max: ₹${availableBalance.toLocaleString()}`}
                min="1"
                max={availableBalance}
                className="flex-1 px-3 py-2 border rounded-r-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleWithdraw}
            disabled={withdrawing || availableBalance <= 0}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 font-medium text-sm disabled:opacity-50"
          >
            {withdrawing ? "Submitting..." : "Withdraw"}
          </button>
        </div>
        {withdrawError && (
          <p className="text-red-500 text-sm mt-2">{withdrawError}</p>
        )}
        {withdrawSuccess && (
          <p className="text-green-600 text-sm mt-2">{withdrawSuccess}</p>
        )}
        {availableBalance <= 0 && !withdrawError && (
          <p className="text-gray-400 text-sm mt-2">No balance available for withdrawal.</p>
        )}

        {/* Current payment method info */}
        <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {paymentMethod ? (
            <div className="text-sm text-gray-600">
              <span className="text-gray-400">Payout to: </span>
              {paymentMethod.method_type === "upi" ? (
                <span className="font-medium">UPI — {paymentMethod.upi_id}</span>
              ) : (
                <span className="font-medium">
                  Bank — {paymentMethod.bank_account_name} (****
                  {paymentMethod.bank_account_number?.slice(-4)})
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-yellow-600">
              No payment method configured yet.
            </p>
          )}
          <Link
            href="/instructor/payout-settings"
            className="text-sm text-primary-600 hover:underline"
          >
            {paymentMethod ? "Change" : "Set up payment method"}
          </Link>
        </div>
      </div>

      {/* Payout History */}
      {payouts.length > 0 && (
        <div className="bg-white rounded-xl border mb-8">
          <div className="p-4 sm:p-6 border-b">
            <h2 className="font-semibold text-gray-900">Payout History</h2>
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Requested</th>
                  <th className="px-6 py-3">Processed</th>
                  <th className="px-6 py-3">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ₹{p.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          p.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : p.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(p.requested_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {p.processed_at
                        ? formatDate(p.processed_at)
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {p.admin_note || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="sm:hidden divide-y">
            {payouts.map((p) => (
              <div key={p.id} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">₹{p.amount.toLocaleString()}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      p.status === "paid"
                        ? "bg-green-100 text-green-700"
                        : p.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Requested: {formatDate(p.requested_at)}
                  {p.processed_at && ` · Processed: ${formatDate(p.processed_at)}`}
                </p>
                {p.admin_note && <p className="text-xs text-gray-400 mt-1">{p.admin_note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-Course Breakdown */}
      <div className="bg-white rounded-xl border mb-8">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="font-semibold text-gray-900">Revenue by Course</h2>
        </div>
        {courseEarnings.length === 0 ? (
          <div className="p-6 text-gray-500 text-sm">No courses yet.</div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Course</th>
                    <th className="px-6 py-3 text-right">Enrollments</th>
                    <th className="px-6 py-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {courseEarnings.map((ce) => (
                    <tr key={ce.course_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {ce.course_title}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 text-right">
                        {ce.enrollments}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-green-600 text-right">
                        ₹{ce.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sm:hidden divide-y">
              {courseEarnings.map((ce) => (
                <div key={ce.course_id} className="p-4">
                  <p className="text-sm font-medium text-gray-900">{ce.course_title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">{ce.enrollments} enrollments</span>
                    <span className="text-sm font-medium text-green-600">₹{ce.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="p-6 text-gray-500 text-sm">No transactions yet.</div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Student</th>
                    <th className="px-6 py-3">Course</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {t.student_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {t.course_title}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-green-600 text-right">
                        ₹{t.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 text-right">
                        {formatDate(t.date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sm:hidden divide-y">
              {recentTransactions.map((t) => (
                <div key={t.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900">{t.student_name}</span>
                    <span className="text-sm font-medium text-green-600">₹{t.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500 truncate mr-2">{t.course_title}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(t.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
