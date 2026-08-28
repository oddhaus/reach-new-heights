import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { formatEventDate, formatEventTime } from "@/lib/format";
import TopBar from "@/components/TopBar";

export const revalidate = 0; // always fetch fresh booking counts

async function getUpcomingEvents() {
  const today = new Date().toISOString().slice(0, 10);

  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, description, location, event_date, event_time, capacity")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });

  if (error) throw new Error(error.message);
  if (!events || events.length === 0) return [];

  const { data: counts_rows, error: countsError } = await supabase
    .from("event_booking_counts")
    .select("event_id, booked")
    .in(
      "event_id",
      events.map((e) => e.id)
    );

  if (countsError) throw new Error(countsError.message);

  const counts = {};
  (counts_rows || []).forEach((row) => {
    counts[row.event_id] = row.booked;
  });

  return events.map((e) => ({
    ...e,
    booked: counts[e.id] || 0,
  }));
}

export default async function HomePage() {
  const events = await getUpcomingEvents();

  return (
    <>
      <TopBar tag="Upcoming events" />
      <main className="container">
        <h1 className="hero-heading">Book your spot</h1>
        <p className="hero-sub">
          Pick an upcoming session below. Spots are limited, so grab yours
          before it fills up.
        </p>

        {events.length === 0 ? (
          <div className="empty-state">
            No upcoming events right now — check back soon.
          </div>
        ) : (
          <ul className="event-list">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function EventCard({ event }) {
  const spotsLeft = Math.max(event.capacity - event.booked, 0);
  const isFull = spotsLeft === 0;
  const pct = Math.min((event.booked / event.capacity) * 100, 100);

  return (
    <li>
      <Link href={`/events/${event.id}`} className="event-card">
        <span className="event-date-chip">
          {formatEventDate(event.event_date)} &middot;{" "}
          {formatEventTime(event.event_time)}
        </span>
        <h2 className="event-title">{event.title}</h2>
        <p className="event-meta">{event.location}</p>
        <div className="capacity-row">
          <div className="capacity-track">
            <div
              className={`capacity-fill${isFull ? " full" : ""}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`status-pill ${isFull ? "full" : "open"}`}>
            {isFull ? "Full" : `${spotsLeft} spots left`}
          </span>
        </div>
      </Link>
    </li>
  );
}
