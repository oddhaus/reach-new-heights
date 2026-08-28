import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminRequest } from "@/lib/adminAuth";

export async function GET() {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: events, error } = await supabaseAdmin
    .from("events")
    .select("id, title, description, location, event_date, event_time, capacity, created_at")
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: counts } = await supabaseAdmin
    .from("event_booking_counts")
    .select("event_id, booked");

  const countsMap = {};
  (counts || []).forEach((c) => {
    countsMap[c.event_id] = c.booked;
  });

  return NextResponse.json({
    events: events.map((e) => ({ ...e, booked: countsMap[e.id] || 0 })),
  });
}

export async function POST(request) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const title = (body.title || "").trim();
  const description = (body.description || "").trim();
  const location = (body.location || "").trim();
  const event_date = body.event_date;
  const event_time = body.event_time;
  const capacity = parseInt(body.capacity, 10);

  if (!title || !event_date || !event_time || !capacity || capacity < 1) {
    return NextResponse.json(
      { error: "Title, date, time, and a capacity of at least 1 are required." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("events")
    .insert({
      title,
      description: description || null,
      location: location || null,
      event_date,
      event_time,
      capacity,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}
