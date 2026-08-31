"use client";

import { useMemo, useState } from "react";

export default function BookingForm({ eventId, spotsLeft, extraActivities = [] }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [healthConditions, setHealthConditions] = useState("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [transportMode, setTransportMode] = useState("Group Bus");
  const [carpoolWilling, setCarpoolWilling] = useState("No");
  const [carpoolPassengers, setCarpoolPassengers] = useState("");
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [paymentPolicyAccepted, setPaymentPolicyAccepted] = useState(false);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const summaryActivities = useMemo(
    () => (selectedActivities.length > 0 ? selectedActivities.map((id) => extraActivities.find((activity) => activity.name === id)?.name || id).filter(Boolean) : ["None"]),
    [selectedActivities, extraActivities]
  );

  function validatePersonalInfo() {
    if (!name.trim() || !age.trim() || !phone.trim()) {
      setErrorMsg("Please provide your full name, age, and phone number.");
      setStatus("error");
      return false;
    }

    if (!email.trim()) {
      setErrorMsg("Please provide your email address.");
      setStatus("error");
      return false;
    }

    setErrorMsg("");
    setStatus("idle");
    return true;
  }

  function goToNextStep() {
    if (!validatePersonalInfo()) return;
    setStep(2);
  }

  function toggleActivity(activityName) {
    setSelectedActivities((current) =>
      current.includes(activityName)
        ? current.filter((item) => item !== activityName)
        : [...current, activityName]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    if (!paymentPolicyAccepted) {
      setErrorMsg("Please confirm that you understand and accept the payment and cancellation policy.");
      setStatus("error");
      return;
    }

    if (!riskAcknowledged) {
      setErrorMsg("Please confirm the hiking risk acknowledgment.");
      setStatus("error");
      return;
    }

    try {
      const payload = {
        event_id: eventId,
        name: name.trim(),
        age: age.trim(),
        phone: phone.trim(),
        email: email.trim(),
        health_conditions: healthConditions.trim() || "None",
        dietary_restrictions: dietaryRestrictions.trim() || "None",
        transport_mode: transportMode,
        carpool_willing: transportMode === "Private Vehicle" ? carpoolWilling : "N/A",
        carpool_passengers: transportMode === "Private Vehicle" && carpoolWilling === "Yes" ? Number(carpoolPassengers || 0) : 0,
        selected_activities: extraActivities
          .filter((activity) => selectedActivities.includes(activity.name))
          .map((activity) => ({ name: activity.name, price: Number(activity.price || 0) })),
        payment_policy_accepted: true,
        risk_acknowledgement_accepted: true,
      };

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMsg("Couldn't reach the server. Check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="alert alert-success">
        You're booked, {name.split(" ")[0]}! See you there. 🎉
      </div>
    );
  }

  const transportOptions = ["Group Bus", "Private Vehicle"];

  return (
    <form onSubmit={handleSubmit}>
      {status === "error" && <div className="alert alert-error">{errorMsg}</div>}

      {step === 1 && (
        <>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ama Owusu" />
          </div>

          <div className="field">
            <label htmlFor="age">Age</label>
            <input id="age" type="number" min="1" required value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 24" />
          </div>

          <div className="field">
            <label htmlFor="phone">WhatsApp / phone number</label>
            <input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 024 123 4567" />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>

          <button type="button" className="btn btn-primary btn-block" onClick={goToNextStep}>
            Continue to safety info
          </button>
          <p className="helper-text" style={{ marginTop: 10 }}>
            {spotsLeft} spot{spotsLeft === 1 ? "" : "s"} left
          </p>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ marginBottom: 18 }}>
            <p className="section-kicker" style={{ marginBottom: 8 }}>Health &amp; Safety Information</p>
          </div>

          <div className="field">
            <label htmlFor="health_conditions">Known Health Conditions?</label>
            <p className="helper-text" style={{ margin: "0 0 8px" }}>
              This information will be kept confidential and is requested to ensure your safety during the hike.
            </p>
            <textarea
              id="health_conditions"
              rows="4"
              required
              value={healthConditions}
              onChange={(e) => setHealthConditions(e.target.value)}
              placeholder="Please type 'None' if you have none. e.g., asthma, heart conditions, diabetes"
            />
          </div>

          <div className="field">
            <label htmlFor="dietary_restrictions">Food Allergies or Dietary Restrictions</label>
            <p className="helper-text" style={{ margin: "0 0 8px" }}>
              This helps us plan meals or snacks if provided.
            </p>
            <textarea
              id="dietary_restrictions"
              rows="4"
              required
              value={dietaryRestrictions}
              onChange={(e) => setDietaryRestrictions(e.target.value)}
              placeholder="Please type 'None' if you have none. e.g., nut allergies, gluten-free, vegetarian"
            />
          </div>

          <div className="btn-row booking-actions">
            <button type="button" className="btn btn-back" onClick={() => setStep(1)} aria-label="Go back">
              &larr;
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
              Continue
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div style={{ marginBottom: 18 }}>
            <p className="section-kicker" style={{ marginBottom: 8 }}>Transportation Preference</p>
          </div>

          <div className="field">
            <label>How will you be traveling to the hiking location?</label>
            <div className="option-grid">
              {transportOptions.map((option) => (
                <label key={option} className={`choice-option ${transportMode === option ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="transportMode"
                    checked={transportMode === option}
                    onChange={() => setTransportMode(option)}
                    style={{ display: "none" }}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>

          {transportMode === "Private Vehicle" && (
            <>
              <div className="field">
                <label>If driving, would you be willing to carpool with others?</label>
                <div className="option-grid compact-grid">
                  {['Yes', 'No'].map((option) => (
                    <label key={option} className={`choice-option ${carpoolWilling === option ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="carpoolWilling"
                        checked={carpoolWilling === option}
                        onChange={() => setCarpoolWilling(option)}
                        style={{ display: "none" }}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {carpoolWilling === "Yes" && (
                <div className="field">
                  <label htmlFor="carpoolPassengers">If yes, how many passengers can you accommodate?</label>
                  <input
                    id="carpoolPassengers"
                    type="number"
                    min="1"
                    value={carpoolPassengers}
                    onChange={(e) => setCarpoolPassengers(e.target.value)}
                    placeholder="e.g. 4"
                  />
                </div>
              )}
            </>
          )}

          <div className="btn-row booking-actions">
            <button type="button" className="btn btn-back" onClick={() => setStep(2)} aria-label="Go back">
              &larr;
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(extraActivities.length > 0 ? 4 : 5)}>
              Continue
            </button>
          </div>
        </>
      )}

      {step === 4 && extraActivities.length > 0 && (
        <>
          <div style={{ marginBottom: 18 }}>
            <p className="section-kicker" style={{ marginBottom: 8 }}>Optional Activities</p>
          </div>

          <div className="field">
            <label>Select which activities you would like to participate in</label>
            <div className="activity-list">
              {extraActivities.map((activity) => (
                <label key={activity.name} className={`activity-item ${selectedActivities.includes(activity.name) ? "selected" : ""}`}>
                  <input
                    type="checkbox"
                    checked={selectedActivities.includes(activity.name)}
                    onChange={() => toggleActivity(activity.name)}
                  />
                  <span className="activity-copy">
                    <strong>{activity.name}</strong>
                    {activity.price ? <em>{Number(activity.price).toFixed(2)} GHS</em> : <em>Included</em>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="btn-row booking-actions">
            <button type="button" className="btn btn-back" onClick={() => setStep(3)} aria-label="Go back">
              &larr;
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(5)}>
              Continue
            </button>
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <div style={{ marginBottom: 18 }}>
            <p className="section-kicker" style={{ marginBottom: 8 }}>Payment and Cancellation Policy</p>
          </div>

          <div className="field" style={{ marginBottom: 18 }}>
            <p className="helper-text" style={{ margin: "0 0 10px" }}><strong>Policy:</strong> Submitting this form without payment does not guarantee a seat. Payments must be received within 24hrs after registration to confirm participation.</p>
            <p className="helper-text" style={{ margin: "0 0 10px" }}><strong>Non-Refundable Clause:</strong> Payments are non-refundable if you cancel within three days of the event or after Aug 31, 2026 1:28 pm or fail to attend (no-show).</p>
          </div>

          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, color: "var(--reference-white)", marginBottom: 18 }}>
            <input type="checkbox" checked={paymentPolicyAccepted} onChange={(e) => setPaymentPolicyAccepted(e.target.checked)} />
            <span>I understand and agree to the payment and cancellation policy.</span>
          </label>

          <div className="btn-row booking-actions">
            <button type="button" className="btn btn-back" onClick={() => setStep(extraActivities.length > 0 ? 4 : 3)} aria-label="Go back">
              &larr;
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(6)}>
              Continue
            </button>
          </div>
        </>
      )}

      {step === 6 && (
        <>
          <div style={{ marginBottom: 18 }}>
            <p className="section-kicker" style={{ marginBottom: 8 }}>Acknowledgement</p>
          </div>

          <div className="field">
            <p className="helper-text" style={{ margin: "0 0 12px" }}>
              I understand that hiking involves physical activity and potential risks, and I confirm that I am physically capable of participating or will inform the organizers of any limitations.
            </p>
          </div>

          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, color: "var(--reference-white)", marginBottom: 18 }}>
            <input type="checkbox" checked={riskAcknowledged} onChange={(e) => setRiskAcknowledged(e.target.checked)} />
            <span>I understand and agree to the acknowledgment above.</span>
          </label>

          <div className="btn-row booking-actions">
            <button type="button" className="btn btn-back" onClick={() => setStep(5)} aria-label="Go back">
              &larr;
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(7)}>
              Review summary
            </button>
          </div>
        </>
      )}

      {step === 7 && (
        <>
          <div style={{ marginBottom: 18 }}>
            <p className="section-kicker" style={{ marginBottom: 8 }}>Summary</p>
          </div>

          <div className="form-card" style={{ background: "rgba(15, 16, 20, 0.7)", borderColor: "rgba(0,194,223,0.28)", color: "var(--reference-white)", marginBottom: 18 }}>
            <p style={{ margin: "0 0 10px" }}><strong>Full name:</strong> {name || "—"}</p>
            <p style={{ margin: "0 0 10px" }}><strong>Age:</strong> {age || "—"}</p>
            <p style={{ margin: "0 0 10px" }}><strong>Email:</strong> {email || "—"}</p>
            <p style={{ margin: "0 0 10px" }}><strong>Phone:</strong> {phone || "—"}</p>
            <p style={{ margin: "0 0 10px" }}><strong>Known Health Conditions:</strong> {healthConditions || "None"}</p>
            <p style={{ margin: "0 0 10px" }}><strong>Allergies:</strong> {dietaryRestrictions || "None"}</p>
            <p style={{ margin: "0 0 10px" }}><strong>Transportation Preferences:</strong> {transportMode}</p>
            {transportMode === "Private Vehicle" && (
              <p style={{ margin: "0 0 10px" }}><strong>Car pool:</strong> {carpoolWilling === "Yes" ? `Yes & Number of people: ${carpoolPassengers || 0}` : "No"}</p>
            )}
            <p style={{ margin: "0 0 10px" }}><strong>Chosen activities:</strong> {summaryActivities.join(", ")}</p>
          </div>

          <div className="form-card" style={{ background: "rgba(15, 16, 20, 0.7)", borderColor: "rgba(0,194,223,0.28)", color: "var(--reference-white)", marginBottom: 18 }}>
            <p style={{ margin: "0 0 12px" }}><strong>Payment Information</strong></p>
            <p style={{ margin: "0 0 8px" }}><strong>MoMo Details</strong></p>
            <p style={{ margin: "0 0 6px" }}>• Mobile Money (Telecel) Number: 020 597 9964</p>
            <p style={{ margin: "0 0 6px" }}>• Name: Emmanuel Kwabena Boafo Owusu-Addo</p>
            <p style={{ margin: "0 0 12px" }}><strong>Bank Details</strong></p>
            <p style={{ margin: "0 0 6px" }}>• Name: Emmanuel Kwabena Boafo Owusu-Addo</p>
            <p style={{ margin: "0 0 6px" }}>• Account number: 1091010020778</p>
            <p style={{ margin: "0 0 12px" }}>• Bank: Ghana Commercial Bank</p>
            <p style={{ margin: "0 0 0" }}>Please confirm your payment using the provided MoMo number or bank details. Contact support via WhatsApp at 0555363505 for assistance.</p>
          </div>

          <div className="btn-row booking-actions">
            <button type="button" className="btn btn-back" onClick={() => setStep(6)} aria-label="Go back">
              &larr;
            </button>
            <button type="submit" className="btn btn-primary" disabled={status === "submitting"}>
              {status === "submitting" ? "Booking..." : "Complete registration"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
