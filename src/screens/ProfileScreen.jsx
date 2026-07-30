import { useState, useEffect, useRef } from "react";
import { uploadAvatar, getCachedCustomExercises } from "../storage";
import { sessionVolume, fmtVolume, fmtDuration } from "../utils/volume";
import { defaultExercises } from "../data/exerciseLibrary";
import { supabase, callFunction } from "../lib/supabase";
import WeightChart from "../components/WeightChart";
import BodyHeatmap from "../components/BodyHeatmap";
import CropModal from "../components/CropModal";
import "./ProfileScreen.css";

const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 1 / KG_TO_LBS;
const INCH_TO_CM = 2.54;

const GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

const WEEK_START_OPTIONS = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
];

const TARGET_DAYS_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

const ACTIVITY_OPTIONS = [
  { label: "Sedentary", value: "sedentary", sub: "Little to no exercise" },
  { label: "Light", value: "light", sub: "1–3 days / week" },
  { label: "Moderate", value: "moderate", sub: "3–5 days / week" },
  { label: "Active", value: "active", sub: "6–7 days / week" },
  { label: "Very Active", value: "very_active", sub: "Twice daily" },
];

function cmToFtIn(cm) {
  if (cm == null) return { ft: "", in: "" };
  const totalInches = cm / INCH_TO_CM;
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { ft: String(ft), in: String(inches) };
}

function ftInToCm(ft, inches) {
  const f = parseFloat(ft) || 0;
  const i = parseFloat(inches) || 0;
  if (f === 0 && i === 0) return null;
  return (f * 12 + i) * INCH_TO_CM;
}

function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="20"
      height="20"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  )
}

function AvatarContent({ avatarUrl, avatarUploading, profile, initials, onError }) {
  if (avatarUploading) return <span className="profile-avatar-spinner" />;
  if (!profile) return <span className="profile-avatar-skeleton" />;
  if (avatarUrl)
    return (
      <>
        <span className="profile-avatar-initials" aria-hidden="true">{initials}</span>
        <img
          src={avatarUrl}
          alt="Profile"
          className="profile-avatar-img profile-avatar-img--overlay"
          onError={onError}
        />
      </>
    );
  return initials;
}

export default function ProfileScreen({
  profile,
  sessions,
  checkIns,
  settings,
  authUser,
  onSaveProfile,
  bodyWeightLogs,
  onLogWeight,
  onDeleteWeightLog,
  onAvatarUpdate,
  onRecalibrate,
  onOpenSettings,
}) {
  const unit = settings?.unit ?? "lbs";
  const isImperial = unit === "lbs";

  const fileInputRef = useRef(null);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const [cropFile, setCropFile] = useState(null);
  const [view, setView] = useState("main"); // 'main' | 'edit'

  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryText, setSummaryText] = useState(null)
  const [summaryError, setSummaryError] = useState(false)

  async function handleGenerateSummary() {
    setSummaryOpen(true)
    setSummaryText(null)
    setSummaryError(false)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const allEx = [...defaultExercises, ...getCachedCustomExercises()]
    const allFinished = (sessions ?? [])
      .filter(s => s.finishedAt)
      .sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt))
    const recent = allFinished.filter(s => new Date(s.finishedAt) >= weekAgo)

    const toSessionData = s => ({
      date: s.finishedAt?.slice(0, 10),
      templateName: s.template?.name ?? 'Workout',
      durationMins: s.duration ? Math.round(s.duration / 60) : null,
      exercises: (s.logs ?? []).map(l => allEx.find(e => e.id === l.exerciseId)?.name).filter(Boolean),
    })

    let body
    if (recent.length > 0) {
      body = { sessions: recent.map(toSessionData), goal: profile?.goal ?? '', unit, mode: 'weekly' }
    } else if (allFinished.length > 0) {
      const daysSince = Math.round((Date.now() - new Date(allFinished[0].finishedAt).getTime()) / 86400000)
      body = { sessions: allFinished.slice(0, 5).map(toSessionData), goal: profile?.goal ?? '', unit, mode: 'returning', daysSince }
    } else {
      setSummaryText("No workout history yet — pick a template and start your first session!")
      return
    }

    try {
      const { data, error } = await callFunction('generate-weekly-insight', body)
      if (error || !data?.insight) throw new Error('empty')
      setSummaryText(data.insight)
    } catch {
      setSummaryError(true)
    }
  }

  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [heightFt, setHeightFt] = useState(
    () => cmToFtIn(profile?.heightCm).ft,
  );
  const [heightIn, setHeightIn] = useState(
    () => cmToFtIn(profile?.heightCm).in,
  );
  const [heightCm, setHeightCm] = useState(() =>
    profile?.heightCm != null ? String(Math.round(profile.heightCm)) : "",
  );
  const [weight, setWeight] = useState(() => {
    if (profile?.weightKg == null) return "";
    return isImperial
      ? String(Math.round(profile.weightKg * KG_TO_LBS))
      : String(+profile.weightKg.toFixed(1));
  });
  const [birthdate, setBirthdate] = useState(profile?.birthdate ?? "");
  const [gender, setGender] = useState(profile?.gender ?? null);
  const [activityLevel, setActivityLevel] = useState(
    profile?.activityLevel ?? null,
  );
  const [trackWeight, setTrackWeight] = useState(profile?.trackWeight ?? null);
  const [weekStartDay, setWeekStartDay] = useState(profile?.weekStartDay ?? 1);
  const [targetDaysPerWeek, setTargetDaysPerWeek] = useState(
    profile?.targetDaysPerWeek ?? 3,
  );

  useEffect(() => {
    const ftIn = cmToFtIn(profile?.heightCm);
    setHeightFt(ftIn.ft);
    setHeightIn(ftIn.in);
    setHeightCm(
      profile?.heightCm != null ? String(Math.round(profile.heightCm)) : "",
    );
    setWeight(
      profile?.weightKg != null
        ? isImperial
          ? String(Math.round(profile.weightKg * KG_TO_LBS))
          : String(+profile.weightKg.toFixed(1))
        : "",
    );
  }, [isImperial]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profile) return;
    setAvatarUrl(profile.avatarUrl ?? null);
    setDisplayName(profile.displayName ?? "");
    const ftIn = cmToFtIn(profile.heightCm);
    setHeightFt(ftIn.ft);
    setHeightIn(ftIn.in);
    setHeightCm(
      profile.heightCm != null ? String(Math.round(profile.heightCm)) : "",
    );
    setWeight(
      profile.weightKg != null
        ? isImperial
          ? String(Math.round(profile.weightKg * KG_TO_LBS))
          : String(+profile.weightKg.toFixed(1))
        : "",
    );
    setBirthdate(profile.birthdate ?? "");
    setGender(profile.gender ?? null);
    setActivityLevel(profile.activityLevel ?? null);
    setTrackWeight(profile.trackWeight ?? null);
    setWeekStartDay(profile.weekStartDay ?? 1);
    setTargetDaysPerWeek(profile.targetDaysPerWeek ?? 3);
  }, [
    profile?.avatarUrl,
    profile?.displayName,
    profile?.heightCm,
    profile?.weightKg,
    profile?.birthdate,
    profile?.gender,
    profile?.activityLevel,
    profile?.trackWeight,
    profile?.weekStartDay,
    profile?.targetDaysPerWeek,
  ]);

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    e.target.value = "";
  }

  async function handleCropConfirm(croppedFile) {
    setCropFile(null);
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const url = await uploadAvatar(croppedFile);
      setAvatarUrl(url);
      onAvatarUpdate?.(url);
    } catch (err) {
      console.error("Avatar upload failed:", err);
      setAvatarError("Upload failed. Please try a different image.");
    } finally {
      setAvatarUploading(false);
    }
  }

  function buildPayload(overrides = {}) {
    const heightCmVal = isImperial
      ? ftInToCm(heightFt, heightIn)
      : heightCm
        ? parseFloat(heightCm)
        : null;
    const weightKgVal = weight
      ? isImperial
        ? parseFloat(weight) * LBS_TO_KG
        : parseFloat(weight)
      : null;
    return {
      displayName: displayName || null,
      heightCm: heightCmVal || null,
      weightKg: weightKgVal || null,
      birthdate: birthdate || null,
      gender,
      activityLevel,
      trackWeight,
      weekStartDay,
      targetDaysPerWeek,
      ...overrides,
    };
  }

  function handleBlur() {
    onSaveProfile(buildPayload());
  }

  function handlePillSelect(field, value) {
    if (field === "gender") setGender(value);
    if (field === "activityLevel") setActivityLevel(value);
    if (field === "weekStartDay") setWeekStartDay(value);
    if (field === "targetDaysPerWeek") setTargetDaysPerWeek(value);
    onSaveProfile(buildPayload({ [field]: value }));
  }

  async function handleWeightOptIn(accept) {
    setTrackWeight(accept);
    const payload = buildPayload({ trackWeight: accept });
    onSaveProfile(payload);
    if (accept && payload.weightKg) {
      await onLogWeight(payload.weightKg);
    }
  }

  // Lifetime stats
  const finished = (sessions ?? []).filter((s) => s.finishedAt);
  const totalSessions = finished.length;
  const totalVolLbs = finished.reduce((sum, s) => sum + sessionVolume(s), 0);
  const totalDuration = finished.reduce((sum, s) => sum + (s.duration ?? 0), 0);

  const initials = (displayName || authUser?.email || "?")
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  // Display helpers
  const heightDisplay = (() => {
    if (!profile?.heightCm) return null;
    if (isImperial) {
      const { ft, in: ins } = cmToFtIn(profile.heightCm);
      return `${ft}'${ins}"`;
    }
    return `${Math.round(profile.heightCm)} cm`;
  })();

  const weightDisplay = (() => {
    if (!profile?.weightKg) return null;
    return isImperial
      ? `${Math.round(profile.weightKg * KG_TO_LBS)} lbs`
      : `${profile.weightKg.toFixed(1)} kg`;
  })();

  const genderLabel = GENDER_OPTIONS.find((g) => g.value === gender)?.label;
  const activityLabel = ACTIVITY_OPTIONS.find(
    (a) => a.value === activityLevel,
  )?.label;
  const weekStartLabel = WEEK_START_OPTIONS.find(
    (w) => w.value === weekStartDay,
  )?.label;


  // ── Edit view ────────────────────────────────────────────────
  if (view === "edit") {
    return (
      <div className="profile">
        {cropFile && (
          <CropModal
            file={cropFile}
            onConfirm={handleCropConfirm}
            onCancel={() => setCropFile(null)}
          />
        )}

        <div className="profile-edit-header">
          <button className="profile-back-btn" onClick={() => setView("main")}>
            ‹ Back
          </button>
          <h2 className="profile-edit-title">Edit Profile</h2>
        </div>

        {/* Avatar */}
        <div className="profile-edit-avatar-section">
          <div className="profile-avatar-wrap profile-avatar-wrap--lg">
            <button
              className={`profile-avatar profile-avatar--lg${avatarUploading ? " profile-avatar--uploading" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Change profile photo"
            >
              <AvatarContent avatarUrl={avatarUrl} avatarUploading={avatarUploading} profile={profile} initials={initials} onError={() => setAvatarUrl(null)} />
            </button>
            {!avatarUploading && (
              <span className="profile-avatar-edit" aria-hidden="true">
                ✎
              </span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="profile-avatar-input"
            onChange={handleAvatarChange}
          />
          {avatarError && <p className="profile-avatar-error">{avatarError}</p>}
        </div>

        {/* Name */}
        <section className="profile-section">
          <h3 className="profile-section-title">Name</h3>
          <div className="profile-field profile-field--full">
            <input
              className="profile-name-input"
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={handleBlur}
            />
          </div>
        </section>

        {/* Body Metrics */}
        <section className="profile-section">
          <h3 className="profile-section-title">Body Metrics</h3>
          <div className="profile-fields">
            <div className="profile-field">
              <label className="profile-label">Height</label>
              {isImperial ? (
                <div className="profile-height-imperial">
                  <div className="profile-input-unit">
                    <input
                      type="number"
                      inputMode="numeric"
                      className="profile-input"
                      placeholder="5"
                      min="1"
                      max="9"
                      value={heightFt}
                      onChange={(e) => setHeightFt(e.target.value)}
                      onBlur={handleBlur}
                    />
                    <span className="profile-unit">ft</span>
                  </div>
                  <div className="profile-input-unit">
                    <input
                      type="number"
                      inputMode="numeric"
                      className="profile-input"
                      placeholder="10"
                      min="0"
                      max="11"
                      value={heightIn}
                      onChange={(e) => setHeightIn(e.target.value)}
                      onBlur={handleBlur}
                    />
                    <span className="profile-unit">in</span>
                  </div>
                </div>
              ) : (
                <div className="profile-input-unit">
                  <input
                    type="number"
                    inputMode="numeric"
                    className="profile-input"
                    placeholder="175"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    onBlur={handleBlur}
                  />
                  <span className="profile-unit">cm</span>
                </div>
              )}
            </div>

            <div className="profile-field">
              <label className="profile-label">Weight</label>
              <div className="profile-input-unit">
                <input
                  type="number"
                  inputMode="decimal"
                  className="profile-input"
                  placeholder={isImperial ? "165" : "75"}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  onBlur={handleBlur}
                />
                <span className="profile-unit">
                  {isImperial ? "lbs" : "kg"}
                </span>
              </div>
            </div>

            <div className="profile-field">
              <label className="profile-label">Birthdate</label>
              <input
                type="date"
                className="profile-input"
                value={birthdate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setBirthdate(e.target.value)}
                onBlur={handleBlur}
              />
            </div>

            <div className="profile-field profile-field--full">
              <label className="profile-label">Gender</label>
              <div className="profile-pills">
                {GENDER_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    className={`profile-pill${gender === o.value ? " profile-pill--active" : ""}`}
                    onClick={() =>
                      handlePillSelect(
                        "gender",
                        gender === o.value ? null : o.value,
                      )
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="profile-field profile-field--full">
              <label className="profile-label">Activity Level</label>
              <div className="profile-activity-list">
                {ACTIVITY_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    className={`profile-activity-option${activityLevel === o.value ? " profile-activity-option--active" : ""}`}
                    onClick={() =>
                      handlePillSelect(
                        "activityLevel",
                        activityLevel === o.value ? null : o.value,
                      )
                    }
                  >
                    <span className="profile-activity-name">{o.label}</span>
                    <span className="profile-activity-sub">{o.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Training Schedule */}
        <section className="profile-section">
          <h3 className="profile-section-title">Training Schedule</h3>
          <div className="profile-fields">
            <div className="profile-field profile-field--full">
              <label className="profile-label">Week Starts On</label>
              <div className="profile-pills">
                {WEEK_START_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    className={`profile-pill${weekStartDay === o.value ? " profile-pill--active" : ""}`}
                    onClick={() => handlePillSelect("weekStartDay", o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="profile-field profile-field--full">
              <label className="profile-label">Target Days / Week</label>
              <div className="profile-pills">
                {TARGET_DAYS_OPTIONS.map((n) => (
                  <button
                    key={n}
                    className={`profile-pill profile-pill--narrow${targetDaysPerWeek === n ? " profile-pill--active" : ""}`}
                    onClick={() => handlePillSelect("targetDaysPerWeek", n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────
  const computedAge = (() => {
    if (!birthdate) return null
    const today = new Date()
    const dob = new Date(birthdate)
    let a = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--
    return a
  })()

  const hasAboutData =
    heightDisplay || weightDisplay || computedAge || genderLabel || activityLabel;

  return (
    <div className="profile">
      {cropFile && (
        <CropModal
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="profile-avatar-input"
        onChange={handleAvatarChange}
      />

      {/* Profile card */}
      <div className="profile-card">
        <div className="profile-avatar-wrap profile-avatar-wrap--lg">
          <button
            className={`profile-avatar profile-avatar--lg${avatarUploading ? " profile-avatar--uploading" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Change profile photo"
          >
            <AvatarContent avatarUrl={avatarUrl} avatarUploading={avatarUploading} profile={profile} initials={initials} onError={() => setAvatarUrl(null)} />
          </button>
          {!avatarUploading && (
            <span className="profile-avatar-edit" aria-hidden="true">
              ✎
            </span>
          )}
        </div>
        {avatarError && <p className="profile-avatar-error">{avatarError}</p>}

        <h2 className="profile-card-name">
          {displayName || (
            <span className="profile-card-name--empty">Your Name</span>
          )}
        </h2>
        <p className="profile-card-email">{authUser?.email}</p>

        <div className="profile-card-divider" />

        <div className="profile-card-stats">
          <div className="profile-card-stat">
            <span className="profile-card-stat-value">{totalSessions}</span>
            <span className="profile-card-stat-label">Sessions</span>
          </div>
          <div className="profile-card-stat-sep" />
          <div className="profile-card-stat">
            <span className="profile-card-stat-value">
              {fmtVolume(Math.round(totalVolLbs))}
            </span>
            <span className="profile-card-stat-label">lbs lifted</span>
          </div>
          <div className="profile-card-stat-sep" />
          <div className="profile-card-stat">
            <span className="profile-card-stat-value">
              {fmtDuration(totalDuration) || "—"}
            </span>
            <span className="profile-card-stat-label">Total time</span>
          </div>
        </div>
      </div>

      {/* Fitness Profile (AI summary) */}
      {profile?.fitnessProfileSummary && (
        <section className="profile-section">
          <h3 className="profile-section-title">Fitness Profile</h3>
          <div className="profile-fitness-card">
            <p className="profile-fitness-summary">
              {profile.fitnessProfileSummary}
            </p>
            <button className="profile-recalibrate-btn" onClick={onRecalibrate}>
              Recalibrate
            </button>
          </div>
        </section>
      )}

      {/* About */}
      <section className="profile-section">
        <div className="profile-section-row">
          <h3 className="profile-section-title">About</h3>
          <button className="profile-edit-link" onClick={() => setView("edit")}>
            Edit
          </button>
        </div>
        <div className="profile-info-card">
          {hasAboutData ? (
            <>
              {heightDisplay && (
                <InfoRow label="Height" value={heightDisplay} />
              )}
              {weightDisplay && (
                <InfoRow label="Weight" value={weightDisplay} />
              )}
              {computedAge != null && <InfoRow label="Age" value={`${computedAge} yrs`} />}
              {genderLabel && <InfoRow label="Gender" value={genderLabel} />}
              {activityLabel && (
                <InfoRow label="Activity" value={activityLabel} />
              )}
            </>
          ) : (
            <button
              className="profile-info-empty"
              onClick={() => setView("edit")}
            >
              Tap Edit to add your details
            </button>
          )}
        </div>
      </section>

      {/* Training */}
      <section className="profile-section">
        <div className="profile-section-row">
          <h3 className="profile-section-title">Training</h3>
          <button className="profile-edit-link" onClick={() => setView("edit")}>
            Edit
          </button>
        </div>
        <div className="profile-info-card">
          <InfoRow label="Week starts" value={weekStartLabel} />
          <InfoRow label="Target" value={`${targetDaysPerWeek} days / week`} />
        </div>
      </section>

      {/* Muscle Activity */}
      <section className="profile-section">
        <h3 className="profile-section-title">Muscle Activity</h3>
        <BodyHeatmap sessions={sessions ?? []} />
      </section>

      {/* Weight Progress */}
      <section className="profile-section">
        {trackWeight === null ? (
          <div className="profile-weight-optin">
            <p className="profile-weight-optin-title">Track your weight?</p>
            <p className="profile-weight-optin-body">
              See how you progress over time. Private — only visible to you, and
              always optional.
            </p>
            <div className="profile-weight-optin-actions">
              <button
                className="profile-weight-optin-btn profile-weight-optin-btn--yes"
                onClick={() => handleWeightOptIn(true)}
              >
                Yes, track it
              </button>
              <button
                className="profile-weight-optin-btn profile-weight-optin-btn--no"
                onClick={() => handleWeightOptIn(false)}
              >
                No thanks
              </button>
            </div>
          </div>
        ) : trackWeight === true ? (
          <>
            <h3 className="profile-section-title">Weight Progress</h3>
            <WeightChart
              logs={bodyWeightLogs}
              unit={unit}
              onLog={onLogWeight}
              onDelete={onDeleteWeightLog}
            />
          </>
        ) : (
          <div className="profile-weight-disabled">
            <button
              className="profile-weight-enable-btn"
              onClick={() => handleWeightOptIn(true)}
            >
              Enable weight tracking
            </button>
          </div>
        )}
      </section>

      {/* Weekly Summary */}
      <button className="profile-summary-btn" onClick={handleGenerateSummary}>
        <SparkleIcon />
        <span>Weekly Summary</span>
      </button>

      {/* Settings */}
      <button className="profile-settings-row" onClick={onOpenSettings}>
        <span className="profile-settings-row-left">
          <GearIcon />
          <span>Settings</span>
        </span>
        <span className="profile-settings-row-chevron">›</span>
      </button>

      {/* Summary Modal */}
      {summaryOpen && (
        <div className="profile-summary-backdrop" onClick={() => setSummaryOpen(false)}>
          <div className="profile-summary-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-summary-modal-header">
              <span className="profile-summary-modal-title"><SparkleIcon /> Weekly Summary</span>
              <button className="profile-summary-modal-close" onClick={() => setSummaryOpen(false)}>✕</button>
            </div>
            {summaryError ? (
              <div className="profile-summary-modal-error">
                <p>Couldn't generate summary.</p>
                <button className="profile-summary-retry" onClick={handleGenerateSummary}>Retry</button>
              </div>
            ) : summaryText === null ? (
              <div className="profile-summary-skeleton">
                <div className="profile-summary-skeleton-line" style={{ width: '90%' }} />
                <div className="profile-summary-skeleton-line" style={{ width: '75%' }} />
                <div className="profile-summary-skeleton-line" style={{ width: '60%' }} />
              </div>
            ) : (
              <p className="profile-summary-modal-text">{summaryText}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="profile-info-row">
      <span className="profile-info-label">{label}</span>
      <span className="profile-info-value">{value}</span>
    </div>
  );
}
