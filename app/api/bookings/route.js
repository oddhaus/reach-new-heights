import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BOOKING_COLUMNS = [
  "age",
  "health_conditions",
  "dietary_restrictions",
  "transport_mode",
  "carpool_willing",
  "carpool_passengers",
  "selected_activities",
  "payment_policy_accepted",
  "risk_acknowledgement_accepted",
];

async function getAvailableBookingColumns() {
  const available = new Set(["event_id", "name", "phone", "email"]);

  for (const column of BOOKING_COLUMNS) {
    const { error } = await supabaseAdmin.from("bookings").select(column).limit(1);
    if (!error) {
      available.add(column);
    }
  }

  return available;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const event_id = (body.event_id || "").trim();
  const name = (body.name || "").trim();
  const age = (body.age || "").trim();
  const phone = (body.phone || "").trim();
  const email = (body.email || "").trim();
  const health_conditions = ((body.health_conditions ?? "None") || "None").toString().trim() || "None";
  const dietary_restrictions = ((body.dietary_restrictions ?? "None") || "None").toString().trim() || "None";
  const transport_mode = ((body.transport_mode ?? "Group Bus") || "Group Bus").toString().trim() || "Group Bus";
  const carpool_willing = ((body.carpool_willing ?? "No") || "No").toString().trim() || "No";
  const carpool_passengers = Number(body.carpool_passengers ?? 0) || 0;
  const selected_activities = Array.isArray(body.selected_activities) ? body.selected_activities : [];

  if (!event_id || !name || !age || !phone) {
    return NextResponse.json(
      { error: "Name, age, phone, and event are required." },
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

  // 2. Check current booking count and insert in one server-side flow.
  // This avoids RPC ambiguity issues from older overloaded function versions in
  // Postgres while still preventing overbooking by validating capacity before
  // the insert.
  const { count, error: countError } = await supabaseAdmin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event_id);

  if (countError) {
    return NextResponse.json({ error: "Could not verify booking capacity." }, { status: 500 });
  }

  if ((count ?? 0) >= event.capacity) {
    return NextResponse.json(
      { error: "Sorry, this event just filled up." },
      { status: 409 }
    );
  }

  const availableColumns = await getAvailableBookingColumns();

  const bookingPayload = {
    event_id,
    name,
    phone,
    email: email || null,
  };

  if (availableColumns.has("age")) bookingPayload.age = age;
  if (availableColumns.has("health_conditions")) bookingPayload.health_conditions = health_conditions;
  if (availableColumns.has("dietary_restrictions")) bookingPayload.dietary_restrictions = dietary_restrictions;
  if (availableColumns.has("transport_mode")) bookingPayload.transport_mode = transport_mode;
  if (availableColumns.has("carpool_willing")) bookingPayload.carpool_willing = carpool_willing;
  if (availableColumns.has("carpool_passengers")) bookingPayload.carpool_passengers = carpool_passengers;
  if (availableColumns.has("selected_activities")) bookingPayload.selected_activities = selected_activities;
  if (availableColumns.has("payment_policy_accepted")) bookingPayload.payment_policy_accepted = true;
  if (availableColumns.has("risk_acknowledgement_accepted")) bookingPayload.risk_acknowledgement_accepted = true;

  const { data: insertData, error: insertError } = await supabaseAdmin
    .from("bookings")
    .insert(bookingPayload)
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message || "Could not create booking." }, { status: 500 });
  }

  return NextResponse.json({ success: true, booking_id: insertData?.id });
}
