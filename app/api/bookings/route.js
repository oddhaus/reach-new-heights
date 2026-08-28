import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const event_id = (body.event_id || "").trim();
  const name = (body.name || "").trim();
  const phone = (body.phone || "").trim();
  const email = (body.email || "").trim();

  if (!event_id || !name || !phone) {
    return NextResponse.json(
      { error: "Name, phone, and event are required." },
      { status: 400 }
    );
  }

  // 1. Confirm the event exists and grab its capacity.
  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id, capacity")
    .eq("id", event_id)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  // 2. Use a Postgres function so the "count then insert" happens
  // atomically inside the database, preventing a race where two people
  // booking at the exact same moment both squeeze into the last spot.
  const { data, error } = await supabaseAdmin.rpc("create_booking_if_space", {
    p_event_id: event_id,
    p_name: name,
    p_phone: phone,
    p_email: email || null,
  });

  if (error) {
    return NextResponse.json({ error: "Could not create booking." }, { status: 500 });
  }

  if (data === "FULL") {
    return NextResponse.json(
      { error: "Sorry, this event just filled up." },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true, booking_id: data });
}
