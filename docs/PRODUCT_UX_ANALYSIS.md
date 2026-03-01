# Core School — Product & UX Analysis + Step-by-Step Implementation Plan

---

## Part 1: What Makes Core School Unique

### 1.1 Unique Features

| # | Feature | How it works now | Why it's distinctive |
|---|---------|-----------------|----------------------|
| 1 | **Subject-first navigation** | Hero shows 4 class cards (Math, Bio, AI, CS). Click → `class.html?class=mathematics`. | Users think "I need Math help," not "I need to search 39,000 tutors." Opposite of Preply's global search. |
| 2 | **Multi-subject tutors** | Admin assigns subjects via checkboxes. Tutor stored with `subjects: ["math","ai"]`. API filters by subject. | One tutor appears on multiple class pages — only where relevant. No irrelevant results. |
| 3 | **Curated catalog** | Admin-only tutor management (JWT + admin check). No self-registration. | "We choose our tutors" — trust through curation, not through volume. |
| 4 | **3-step enrollment** | Class page → pick tutor → Schedule page → Enroll. No basket, no packages. | Low-friction "school" flow vs Preply's trial → package → subscription. |
| 5 | **Integrated Calendly** | Contact section embeds Calendly widget directly. | Users can book a consultation without leaving the site. |
| 6 | **Interactive hero** | Floating math symbols (Permanent Marker font), cursor-chase physics, section-snap scrolling. | Memorable "whiteboard" feel that no competitor has. |

### 1.2 Brand Identity Elements

| Element | Where | Signal |
|---------|-------|--------|
| Name "Core School" | Navbar, `<title>`, hero | "School" = structured education. "Core" = essentials. |
| Primary blue `#0077ff` | All buttons, links, borders, navbar on scroll, card hover | Consistent, friendly, educational. |
| Permanent Marker font + floating symbols | Hero section | Hand-written, human, classroom — not corporate. |
| Inter font | Body text | Clean, modern, readable. |
| CTA wording: "Enroll" / "Enroll Now" | Everywhere | School language, not marketplace ("Book a lesson"). |
| Section order: Hero → Classes → About → Tutors → Contact | `index.html` | Story: what we offer → who we are → who teaches → how to reach us. |

### 1.3 What Sets Us Apart From Generic Platforms

- **Scale:** 4 focused subjects vs "everything for everyone."
- **Discovery:** Subject → class page → filtered tutors. No global search bar, no 20+ filters.
- **Trust model:** Curation (admin picks tutors) vs open marketplace + reviews.
- **Flow:** 3 clicks to enrollment. No trial → package → subscription funnel.
- **Audience:** Students/parents looking for a school, not "any learner, any language."

---

## Part 2: Preply's Strengths (What Works & Why)

### 2.1 Tutor Search & Filtering

Preply shows filters: price range, country, availability, specialties, "also speaks," native speaker, and sort ("Our top picks"). Result count: "39,386 English teachers available."

**Why it works:**
- Filters reduce overwhelm by letting users narrow by budget, time, and style.
- Result count creates social proof: "lots of tutors = trustworthy platform."
- Sort gives users control over which tutors appear first.

### 2.2 Trust-Building Card Elements

| Element | What Preply shows | UX/Conversion role |
|---------|-------------------|---------------------|
| **Star rating** | "5" (gold star + number) | Instant quality signal — objective, scannable. |
| **Review count** | "12 reviews" | Social proof: more reviews = more trust. |
| **Active students** | "21 students" | Shows tutor is currently in demand. |
| **Lessons taught** | "874 lessons" | Experience proof without reading bio. |
| **Languages spoken** | "English (Native), Danish (Native)" | Fit check. For Core School this maps to "Subjects taught." |
| **Short pitch** | One-line tagline: "Certified English tutor with 10 years of experience" | Quick value proposition — encourages card click. |
| **Dual CTA** | "Book trial lesson" (primary) + "Send message" (secondary) | Primary action is clear; secondary lowers barrier for hesitant users. |

**Why these work together:**
They answer three questions in under 3 seconds: "Is this tutor good?" (rating + reviews), "Are they experienced?" (students + lessons), and "What should I do next?" (CTA). This reduces decision friction and increases conversion.

---

## Part 3: Preply vs Core School — Direct Comparison

| Dimension | Preply | Core School (current) | Core School (recommended) |
|-----------|--------|------------------------|---------------------------|
| **Discovery** | Global search + 8+ filters | Subject → class page → tutors | Keep subject-first + add lightweight sort on class page |
| **Tutor card** | Photo, name, rating, reviews, students, lessons, languages, pitch, 2 CTAs | Photo, name, subjects, bio, "Enroll" | Add: pitch, rating, review count, experience cue. Keep single "Enroll" CTA |
| **Trust signals** | Rating + reviews + lesson count + "Super Tutor" badge | Curation (admin-added), bio text | Add: rating + reviews (even if "No reviews yet" at first) |
| **Card layout** | Dense, horizontal, many data points | Centered, vertical, minimal | Keep vertical + add 2-3 trust lines |
| **Booking** | Trial → package → calendar | Class → tutor → schedule → Enroll | Keep current flow, it's simpler |
| **CTA wording** | "Book trial lesson" | "Enroll" | Keep "Enroll" — it's our brand |

---

## Part 4: Step-by-Step Implementation Plan

### Overview of all changes (6 phases)

```
Phase 1: Backend — add new DB fields + migrate existing data
Phase 2: Backend — update API endpoints to include new fields
Phase 3: Admin panel — add new form fields for pitch, rating, etc.
Phase 4: Class page — redesign tutor cards with trust signals
Phase 5: Homepage — update "Meet Our Tutors" cards to match
Phase 6: Schedule page — show pitch + rating in sidebar
```

---

### PHASE 1: Backend — Database Schema Changes

**File:** `server.js`  
**What:** Add new columns to `tutors` table via migration (same pattern used for `subjects`).

New columns to add:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `pitch` | TEXT | NULL | One-line tagline shown on cards |
| `rating` | REAL | NULL | Average star rating (0–5). NULL = "No reviews yet" |
| `review_count` | INTEGER | 0 | Total number of reviews |
| `students_count` | INTEGER | 0 | Number of distinct enrolled students |
| `lessons_count` | INTEGER | 0 | Total sessions taught |

**Exact location in `server.js`:** Inside the callback after `Tutors table ready.`, right after the existing `subjects` migration block (lines ~89–103).

**What to add:**
```javascript
// After the existing subjects migration, add migrations for:
// pitch, rating, review_count, students_count, lessons_count
// Each: check if column exists via PRAGMA, if not → ALTER TABLE ADD COLUMN
```

**Why this approach:** SQLite doesn't support `ADD COLUMN IF NOT EXISTS`, so we use PRAGMA + conditional ALTER, same pattern already used for `subjects`.

---

### PHASE 2: Backend — Update API Endpoints

**File:** `server.js`

#### 2a. POST `/api/admin/tutors` (create tutor)

**Current** (line ~378): Accepts `name, subjects, bio, image, email, phone`.  
**Change:** Also accept `pitch` from request body.  
**SQL change:** Add `pitch` to the INSERT statement.

> `rating`, `review_count`, `students_count`, `lessons_count` are NOT set from the admin form — they will be computed later when we build the review system. For now they stay at defaults (NULL / 0).

#### 2b. PUT `/api/admin/tutors/:id` (update tutor)

**Current** (line ~398): Accepts same fields.  
**Change:** Also accept and update `pitch`.

#### 2c. GET `/api/tutors` (public)

**Current** (line ~341): Returns `SELECT * FROM tutors` — already includes all columns.  
**Change:** No SQL change needed. The new columns are automatically included in `SELECT *`.  
**Frontend** just needs to read the new fields.

#### 2d. GET `/api/admin/tutors` (admin)

Same as 2c — `SELECT *` already returns everything. No change needed.

---

### PHASE 3: Admin Panel — Add "Short Pitch" Field

**File:** `admin.html`

#### 3a. Add input field to the form

**Where:** After the Bio textarea (line ~332), add a new form group.

**HTML to add:**
```html
<div class="form-group">
  <label for="tutorPitch">Short Pitch (one-line tagline for tutor cards)</label>
  <input type="text" id="tutorPitch" name="pitch"
         placeholder="e.g. Certified math tutor with 5 years of experience"
         maxlength="120" />
</div>
```

#### 3b. Update form submit handler

**Where:** In the `addTutorForm` submit listener (line ~503).  
**Change:** Add `pitch: document.getElementById('tutorPitch').value || null` to the `formData` object.

#### 3c. Update `editTutor()` function

**Where:** `window.editTutor` function (line ~553).  
**Change:** Add `document.getElementById('tutorPitch').value = tutor.pitch || '';`

#### 3d. Update tutors table display

**Where:** In `renderTutors()` (line ~459).  
**Change:** Add a "Pitch" column to the table header and show `tutor.pitch || '—'` in each row.

---

### PHASE 4: Class Page — Redesigned Tutor Cards

**File:** `class.html`

This is the most impactful visual change. Each tutor card currently shows:
- Avatar → Name → Bio → "Enroll" button

**New card structure (top to bottom):**
1. **Avatar** (keep current 100x100 circle)
2. **Name** (keep current)
3. **Pitch** — one line, muted color, max 2 lines with ellipsis
4. **Trust line** — `★ 4.8 · 12 reviews` or `No reviews yet`
5. **Experience line** — `X students · Y sessions` (if > 0)
6. **"Enroll" button** (keep current)

#### 4a. Add CSS for new card elements

**Where:** Inside `<style>` block in `class.html`.

**New classes to add:**
```css
.tutor-pitch {
  font-size: 0.9rem;
  color: #555;
  line-height: 1.4;
  text-align: center;
  margin-bottom: 0.5rem;
  max-width: 220px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tutor-trust {
  font-size: 0.85rem;
  color: #888;
  margin-bottom: 0.3rem;
  text-align: center;
}

.tutor-trust .star {
  color: #f5a623;
  font-weight: 700;
}

.tutor-trust .rating-num {
  font-weight: 600;
  color: #111;
}

.tutor-experience {
  font-size: 0.8rem;
  color: #999;
  margin-bottom: 0.8rem;
  text-align: center;
}
```

#### 4b. Update `renderTutors()` function

**Where:** The `renderTutors(tutors)` function in `<script>` (line ~269).

**Change the `tutorCard.innerHTML` template** to include:

```javascript
// Build pitch line
const pitchHtml = tutor.pitch
  ? `<div class="tutor-pitch">${tutor.pitch}</div>`
  : (tutor.bio ? `<div class="tutor-pitch">${tutor.bio}</div>` : '');

// Build trust line
let trustHtml = '';
if (tutor.rating !== null && tutor.rating !== undefined) {
  trustHtml = `<div class="tutor-trust">
    <span class="star">★</span>
    <span class="rating-num">${Number(tutor.rating).toFixed(1)}</span>
    · ${tutor.review_count || 0} reviews
  </div>`;
} else {
  trustHtml = `<div class="tutor-trust">No reviews yet</div>`;
}

// Build experience line
let expHtml = '';
const parts = [];
if (tutor.students_count > 0) parts.push(`${tutor.students_count} students`);
if (tutor.lessons_count > 0) parts.push(`${tutor.lessons_count} sessions`);
if (parts.length) {
  expHtml = `<div class="tutor-experience">${parts.join(' · ')}</div>`;
}
```

**New card template:**
```html
<div class="tutor-avatar">${avatarContent}</div>
<div class="tutor-name">${tutor.name}</div>
${pitchHtml}
${trustHtml}
${expHtml}
<a href="schedule.html?tutorId=...&class=..." class="enroll-btn">Enroll</a>
```

#### 4c. Remove the old `.tutor-bio` div from the card

The pitch replaces the bio on the card. Full bio is shown on the schedule page.

---

### PHASE 5: Homepage — Update "Meet Our Tutors" Cards

**File:** `index.html`

#### 5a. Update `loadAllTutors()` function

**Where:** The `loadAllTutors()` function (line ~501).

**Change:** Apply the same card structure as Phase 4.

**New card template (inside the forEach):**
```javascript
// pitch or first sentence of bio
const pitch = t.pitch || (t.bio ? t.bio.split('.')[0] + '.' : '');

// trust line
let trustLine = '<span style="color:#888;font-size:0.85rem;">No reviews yet</span>';
if (t.rating !== null && t.rating !== undefined) {
  trustLine = `<span style="color:#f5a623;font-weight:700;">★</span>
    <strong>${Number(t.rating).toFixed(1)}</strong>
    · ${t.review_count || 0} reviews`;
}

card.innerHTML = `
  ${imgHtml}
  <h3>${t.name || "Tutor"}</h3>
  <p class="subject">${subjectText || "Available tutor"}</p>
  <p class="bio" style="-webkit-line-clamp:2;">${pitch}</p>
  <p style="font-size:0.85rem;color:#888;margin-bottom:0.5rem;">${trustLine}</p>
`;
```

> Note: homepage cards don't have "Enroll" buttons currently (they're overview cards). This is fine — the CTA is on the class page.

---

### PHASE 6: Schedule Page — Show Pitch + Trust

**File:** `schedule.html`

#### 6a. Add pitch display

**Where:** In `setTutorUI(t)` function (line ~231).

**After** setting `tutorBio`, add:
```javascript
// Show pitch above bio if available
const pitchEl = document.getElementById("tutorPitch");
if (pitchEl) {
  pitchEl.textContent = t.pitch || '';
  pitchEl.style.display = t.pitch ? 'block' : 'none';
}
```

#### 6b. Add HTML element for pitch

**Where:** In the schedule-card HTML (line ~173), after `tutor-subjects` div.

**Add:**
```html
<div class="tutor-pitch-schedule" id="tutorPitch"
     style="color:#0077ff;font-weight:600;font-size:.9rem;margin-top:.3rem;">
</div>
```

#### 6c. Add trust + experience line

**Where:** In the `tutor-meta` section (line ~182).

**Add new lines** after Price:
```html
<div id="tutorTrust" style="display:none;">
  <b>Rating:</b> <span id="tutorRating">—</span>
</div>
<div id="tutorExp" style="display:none;">
  <b>Experience:</b> <span id="tutorExpText">—</span>
</div>
```

**In `setTutorUI(t)`**, add logic to populate these.

---

### PHASE 7 (Later / Optional): Reviews System

This is **not needed now** but outlines the path forward:

#### 7a. New `reviews` table

```sql
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tutorId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tutorId) REFERENCES tutors(id),
  FOREIGN KEY (userId) REFERENCES users(id),
  UNIQUE(tutorId, userId)
);
```

#### 7b. API endpoints

- `POST /api/reviews` — authenticated user submits a review.
- `GET /api/tutors/:id/reviews` — public, returns reviews for a tutor.
- On each new review: recalculate `tutors.rating` (AVG) and `tutors.review_count` (COUNT).

#### 7c. UI

- Show reviews on schedule page (below bio).
- Add "Write a review" button for enrolled students.

---

## Part 5: Files Changed — Quick Reference

| Phase | File | What changes |
|-------|------|-------------|
| 1 | `server.js` | Add migration for 5 new columns in tutors table |
| 2 | `server.js` | Update POST/PUT admin tutor routes to handle `pitch` |
| 3 | `admin.html` | Add pitch input to form; update submit, edit, and table render |
| 4 | `class.html` | New CSS classes; update `renderTutors()` card template |
| 5 | `index.html` | Update `loadAllTutors()` card template |
| 6 | `schedule.html` | Add pitch + trust display in sidebar |
| 7 | `server.js` + new UI | Reviews table + endpoints + UI (later) |

---

## Part 6: What NOT to Do (Brand Protection)

- **Don't** use "Book trial lesson" — keep "Enroll" and "Enroll Now."
- **Don't** add Preply-style "Super Tutor" badges unless you define your own rule (e.g. rating ≥ 4.8 AND reviews ≥ 10).
- **Don't** add dense filter bars — your 4-subject, curated model doesn't need them.
- **Don't** add "Send message" as a secondary CTA until you build a messaging system.
- **Don't** show "0 reviews, 0 students" — show "No reviews yet" instead. Empty numbers look worse than no numbers.
- **Don't** copy Preply's horizontal card layout — keep your vertical, centered cards with hover lift.

---

## Part 7: Remaining Copy Fixes

These are minor text issues to fix for brand consistency:

| File | Current text | Should be |
|------|-------------|-----------|
| `index.html` line 36 | "Personalized Online Math Tutoring" | "Personalized Online Tutoring" (you teach 4 subjects now) |
| `index.html` line 147 | "help you succeed in math" | "help you succeed in every subject" |
| `index.html` line 178 | "mathbridge.tutoring@example.com" | Update to Core School email |

---

## Summary: Priority Order

1. **Phase 1+2** (backend) — 30 min. Add columns + update routes. No visible change yet.
2. **Phase 3** (admin) — 15 min. Admin can now enter pitch for each tutor.
3. **Phase 4** (class page) — 30 min. Users see redesigned cards with trust signals.
4. **Phase 5** (homepage) — 15 min. Homepage cards match class page.
5. **Phase 6** (schedule) — 15 min. Schedule page shows pitch + trust.
6. **Copy fixes** — 5 min. Hero headline, tutors subheading, contact email.
7. **Phase 7** (reviews) — 2-3 hours. Build when you have real students enrolling.

**Total for phases 1–6 + copy fixes: ~2 hours of implementation.**
