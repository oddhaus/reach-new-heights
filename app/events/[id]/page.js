import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatEventDate, formatEventTime, formatCurrency } from "@/lib/format";
import { getEventImage } from "@/lib/eventImages";
import TopBar from "@/components/TopBar";
import BookingForm from "@/components/BookingForm";
import ShareLinkButton from "@/components/ShareLinkButton";

export const revalidate = 0;

async function getEvent(id) {
  let { data: event, error } = await supabase
    .from("events")
    .select("id, slug, title, description, location, event_date, event_time, event_end_time, capacity, image_url, category_id, difficulty, address, meeting_instructions, short_description, full_description, base_price, extra_activities, category:categories(name)")
    .eq("id", id)
    .maybeSingle();

  if (!event) {
    const slugMatch = await supabase
      .from("events")
      .select("id, slug, title, description, location, event_date, event_time, event_end_time, capacity, image_url, category_id, difficulty, address, meeting_instructions, short_description, full_description, base_price, extra_activities, category:categories(name)")
      .eq("slug", id)
      .maybeSingle();

    event = slugMatch.data;
    error = slugMatch.error;
  }

  if (
    error && (
      error.message?.includes("image_url") ||
      error.message?.includes("base_price") ||
      error.message?.includes("extra_activities") ||
      error.message?.includes("slug") ||
      error.message?.includes("column \"slug\"")
    )
  ) {
    const fallback = await supabase
      .from("events")
      .select("id, title, description, location, event_date, event_time, capacity")
      .eq("id", id)
      .maybeSingle();
    event = fallback.data;
    error = fallback.error;
  }

  if (error || !event) return null;

  const { data: countRow } = await supabase
    .from("event_booking_counts")
    .select("booked")
    .eq("event_id", event.id)
    .maybeSingle();

  return { ...event, booked: countRow?.booked || 0 };
}

export default async function EventPage({ params }) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const spotsLeft = Math.max(event.capacity - event.booked, 0);
  const isFull = spotsLeft === 0;
  const pct = Math.min((event.booked / event.capacity) * 100, 100);
  const image = event.image_url ? { src: event.image_url, category: event.category?.name || getEventImage(event.title).category } : { ...getEventImage(event.title), category: event.category?.name || getEventImage(event.title).category };
  const extraActivities = Array.isArray(event.extra_activities) ? event.extra_activities : [];
  const basePrice = Number(event.base_price ?? 0);

  return (
    <>
      <TopBar tag="Event details" />
      <main className="container event-detail-container">
        <div className="event-detail-nav">
          <Link href="/" className="back-link">
            &larr; All events
          </Link>
          <div className="event-detail-date-actions">
            <div className="event-card-date">
              <span>{formatEventDate(event.event_date)}</span>
              <span>{formatEventTime(event.event_time)}{event.event_end_time ? ` - ${formatEventTime(event.event_end_time)}` : ""}</span>
            </div>
            <ShareLinkButton eventId={event.id} eventSlug={event.slug} title={event.title} copyOnly />
          </div>
        </div>

        <div className="event-detail-hero">
          <img className="event-detail-image" src={image.src} alt="" />
          <div className="event-detail-overlay">
            <span className="event-category">{image.category}</span>
            <span className={`status-pill ${isFull ? "full" : "open"}`}>
              {isFull ? "Fully booked" : `${spotsLeft} spots free`}
            </span>
          </div>
        </div>

        <div className="event-detail-layout">
          <section className="event-detail-copy">
            <h1 className="hero-heading">{event.title}</h1>
            <p className="event-detail-location">
              <span aria-hidden="true">+</span> {event.location || "Location announced soon"}
            </p>
            <div className="event-detail-facts">
              {event.difficulty ? <span>Difficulty <strong>{event.difficulty}</strong></span> : null}
              {event.address ? <span>Address <strong>{event.address}</strong></span> : null}
              {event.meeting_instructions ? <span>Meeting point <strong>{event.meeting_instructions}</strong></span> : null}
              {basePrice > 0 ? <span className="event-detail-price">Price <strong>{formatCurrency(basePrice)}</strong></span> : null}
            </div>
            <p className="event-detail-description">
              {event.full_description || event.description || "A focused session designed to help you move stronger, feel better, and keep your momentum going."}
            </p>

            {extraActivities.length > 0 ? (
              <div className="form-card optional-addons-panel" style={{ marginTop: 24 }}>
                <p className="section-kicker">Optional add-ons</p>
                <ul className="optional-addons-list" style={{ margin: "12px 0 0", paddingLeft: 18, display: "grid", gap: 8 }}>
                  {extraActivities.map((activity, index) => (
                    <li key={`${activity.name}-${index}`}>
                      <strong>{activity.name}</strong>
                      <span
                        className="optional-addon-divider"
                        aria-hidden="true"
                        style={{ width: "100%", height: 1, backgroundColor: "var(--reference-cyan)" }}
                      />
                      <strong>{formatCurrency(activity.price || 0)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="event-detail-capacity">
              <div className="capacity-heading">
                <span>Session capacity</span>
                <strong>{event.booked} / {event.capacity} booked</strong>
              </div>
              <div className="capacity-track">
                <div
                  className={`capacity-fill${isFull ? " full" : ""}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </section>

          <section className="event-booking-panel">
            <p className="section-kicker">Save your place</p>
            <h2>Ready to move?</h2>
            {basePrice > 0 ? (
              <p className="helper-text" style={{ marginTop: 0, marginBottom: 12 }}>
                Main event: <strong>{formatCurrency(basePrice)}</strong>
              </p>
            ) : null}
            {isFull ? (
              <>
                <p className="booking-status">This event is fully booked.</p>
                <p className="helper-text">Check back in case a spot opens up.</p>
              </>
            ) : (
              <BookingForm eventId={event.id} spotsLeft={spotsLeft} extraActivities={extraActivities} />
            )}
          </section>
        </div>
      </main>
    </>
  );
}
