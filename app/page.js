import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { formatEventDate, formatEventTime } from "@/lib/format";
import { getEventImage } from "@/lib/eventImages";
import TopBar from "@/components/TopBar";

export const revalidate = 0; // always fetch fresh booking counts

async function getUpcomingEvents() {
  const today = new Date().toISOString().slice(0, 10);

  let { data: events, error } = await supabase
    .from("events")
    .select("id, title, description, location, event_date, event_time, event_end_time, capacity, image_url, category_id, difficulty, address, meeting_instructions, short_description, full_description, category:categories(name)")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });

  if (error?.message?.includes("image_url")) {
    const fallback = await supabase
      .from("events")
      .select("id, title, description, location, event_date, event_time, capacity")
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true });
    events = fallback.data;
    error = fallback.error;
  }
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
      <main className="container events-container">
        <div className="events-intro">
          <div>
            <p className="section-kicker">Move with purpose</p>
            <h1 className="hero-heading">Find your next session</h1>
            <p className="hero-sub">
              Pick an upcoming session below. Spots are limited, so grab yours
              before it fills up.
            </p>
          </div>
          <span className="event-count">{events.length} upcoming</span>
        </div>

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
  const image = event.image_url ? { src: event.image_url, category: event.category?.name || getEventImage(event.title).category } : { ...getEventImage(event.title), category: event.category?.name || getEventImage(event.title).category };

  return (
    <li>
      <Link href={`/events/${event.id}`} className="event-card">
        <div className="event-image-wrap">
          <img className="event-image" src={image.src} alt="" />
          <span className="event-category">{image.category}</span>
          <span className={`status-pill ${isFull ? "full" : "open"}`}>
            {isFull ? "Full" : `${spotsLeft} spots free`}
          </span>
        </div>
        <div className="event-card-body">
              <div className="event-card-date">
            <span>{formatEventDate(event.event_date)}</span>
            <span>{formatEventTime(event.event_time)}{event.event_end_time ? ` - ${formatEventTime(event.event_end_time)}` : ""}</span>
          </div>
          <h2 className="event-title">{event.title}</h2>
          <p className="event-meta">{event.location || "Location announced soon"}</p>
          {event.short_description || event.description ? <p className="event-description">{event.short_description || event.description}</p> : null}
          <div className="event-card-footer">
            <div className="capacity-row">
              <div className="capacity-track">
                <div
                  className={`capacity-fill${isFull ? " full" : ""}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span>{event.booked}/{event.capacity}</span>
            </div>
            <span className="event-cta">View session <span aria-hidden="true">&rarr;</span></span>
          </div>
        </div>
      </Link>
    </li>
  );
}

