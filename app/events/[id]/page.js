import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatEventDate, formatEventTime } from "@/lib/format";
import TopBar from "@/components/TopBar";
import BookingForm from "@/components/BookingForm";

export const revalidate = 0;

async function getEvent(id) {
  const { data: event, error } = await supabase
    .from("events")
    .select("id, title, description, location, event_date, event_time, capacity")
    .eq("id", id)
    .single();

  if (error || !event) return null;

  const { data: countRow } = await supabase
    .from("event_booking_counts")
    .select("booked")
    .eq("event_id", id)
    .maybeSingle();

  return { ...event, booked: countRow?.booked || 0 };
}

export default async function EventPage({ params }) {
  const event = await getEvent(params.id);
  if (!event) notFound();

  const spotsLeft = Math.max(event.capacity - event.booked, 0);
  const isFull = spotsLeft === 0;

  return (
    <>
      <TopBar tag="Event details" />
      <main className="container">
        <Link href="/" className="back-link">
          &larr; All events
        </Link>

        <span className="event-date-chip">
          {formatEventDate(event.event_date)} &middot;{" "}
          {formatEventTime(event.event_time)}
        </span>
        <h1 className="hero-heading">{event.title}</h1>
        <p className="hero-sub">
          {event.location}
          {event.description ? ` — ${event.description}` : ""}
        </p>

        <div className="form-card">
          {isFull ? (
            <>
              <p style={{ margin: 0, fontWeight: 600 }}>
                This event is fully booked.
              </p>
              <p className="helper-text">
                Keep an eye on the group for the next one, or check back in
                case a spot opens up.
              </p>
            </>
          ) : (
            <BookingForm eventId={event.id} spotsLeft={spotsLeft} />
          )}
        </div>
      </main>
    </>
  );
}
