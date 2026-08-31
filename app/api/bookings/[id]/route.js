import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminRequest } from "@/lib/adminAuth";

export async function PATCH(request, { params }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const nextStatus = String(body.status || "active").trim().toLowerCase();
  if (!["active", "suspended"].includes(nextStatus)) {
    return NextResponse.json({ error: "Status must be active or suspended." }, { status: 400 });
  }

  const { data: existingBooking, error: existingError } = await supabaseAdmin
    .from("bookings")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message || "Could not find booking." }, { status: 500 });
  }

  if (!existingBooking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update({
      status: nextStatus,
      suspended_at: nextStatus === "suspended" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("id, status, suspended_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message || "Could not update booking." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, booking: data });
}

export async function DELETE(request, { params }) {
  return PATCH(request, { params });
}
