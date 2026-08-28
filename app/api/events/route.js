import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminRequest } from "@/lib/adminAuth";

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: events, error } = await supabaseAdmin
    .from("events")
    .select("id, title, description, location, event_date, event_time, event_end_time, capacity, image_url, category_id, difficulty, address, meeting_instructions, short_description, full_description, created_at")
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });

  if (error) {
    if (error.message?.includes("image_url")) {
      return NextResponse.json(
        { error: "Run the latest supabase/schema.sql migration to enable event images." },
        { status: 500 }
      );
    }
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
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.formData().catch(() => new FormData());
  const title = (body.get("title") || "").trim();
  const description = (body.get("description") || "").trim();
  const short_description = (body.get("short_description") || "").trim();
  const full_description = (body.get("full_description") || "").trim();
  const location = (body.get("location") || "").trim();
  const address = (body.get("address") || "").trim();
  const meeting_instructions = (body.get("meeting_instructions") || "").trim();
  const category_id = body.get("category_id") || null;
  const difficulty = (body.get("difficulty") || "All Levels").trim();
  const event_date = body.get("event_date");
  const event_time = body.get("event_time");
  const event_end_time = body.get("event_end_time") || null;
  const capacity = parseInt(body.get("capacity"), 10);
  const image = body.get("image");

  if (image && image.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Event images must be 5 MB or smaller." }, { status: 400 });
  }

  if (image && !["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
    return NextResponse.json({ error: "Event images must be JPG, PNG, or WebP files." }, { status: 400 });
  }

  if (!title || !event_date || !event_time || !capacity || capacity < 1) {
    return NextResponse.json(
      { error: "Title, date, time, and a capacity of at least 1 are required." },
      { status: 400 }
    );
  }

  let image_url = null;
  if (image && image.size > 0) {
    const storage = supabaseAdmin.storage;
    const { data: buckets, error: bucketsError } = await storage.listBuckets();

    if (bucketsError) {
      return NextResponse.json({ error: "Could not check event image storage." }, { status: 500 });
    }

    if (!(buckets || []).some((bucket) => bucket.name === "event-images")) {
      const { error: createBucketError } = await storage.createBucket("event-images", {
        public: true,
        fileSizeLimit: "5MB",
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      });

      if (createBucketError && !createBucketError.message.toLowerCase().includes("already exists")) {
        return NextResponse.json({ error: "Could not create event image storage." }, { status: 500 });
      }
    }

    const filePath = `${crypto.randomUUID()}.${image.type.split("/")[1].replace("jpeg", "jpg")}`;
    const { error: uploadError } = await storage
      .from("event-images")
      .upload(filePath, Buffer.from(await image.arrayBuffer()), {
        contentType: image.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: "Could not upload the event image." }, { status: 500 });
    }
    image_url = storage.from("event-images").getPublicUrl(filePath).data.publicUrl;
  }

  const { data, error } = await supabaseAdmin
    .from("events")
    .insert({
      title,
      description: description || null,
      location: location || null,
      event_date,
      event_time,
      event_end_time,
      capacity,
      image_url,
      category_id,
      difficulty,
      address: address || null,
      meeting_instructions: meeting_instructions || null,
      short_description: short_description || null,
      full_description: full_description || description || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}
