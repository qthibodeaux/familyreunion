# Guestbook v2 Specification (Short-Form Post Drawer)

## Concept

The Guestbook is a **short-form social post wall** on every profile. Think early Facebook wall posts or Twitter @-mentions — lightweight, ephemeral, human. Visitors drop by and leave a brief note. No long-form tributes, no essays. Just a quick "thinking of you" or "remember when…" that lives on that person's page.

**Core constraint:** Every post is **240 characters max**. This forces brevity and keeps the tone casual.

---

## Post Structure

```typescript
interface GuestbookPost {
  id: UUID;
  profile_id: UUID;        // whose wall this is posted on
  author_id: UUID;         // who wrote it
  content: string;          // max 240 chars, plain text + emoji
  tagged_profiles: UUID[];  // @mentions of family members
  location: string | null;  // optional: "Atlanta, GA" or free text
  event_date: string | null; // optional: ISO date for "remember when"
  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;
  likes_count: number;     // aggregated, not a separate table for v1
  is_reported: boolean;    // moderation flag
}
```

### Content Rules
- **240 characters hard limit** — frontend enforced, backend validated
- **Plain text + emoji only** — no markdown, no HTML, no links auto-rendered
- **@mentions** — typing `@` triggers a family member search; stored as `tagged_profiles` array
- **#hashtags** — optional, purely cosmetic for now (e.g., `#Reunion2026`)
- **Location** — free text or pick from profile's known cities (autocomplete)
- **Event Date** — optional date picker for "remember when we…" nostalgia posts

---

## Interactions

| Action | Who Can Do It | Behavior |
|--------|--------------|----------|
| **Write Post** | Any authenticated user, on any profile *except their own* | 240-char text input, inline @mention, optional location/date |
| **Like Post** | Any authenticated user | Heart icon, toggle on/off, `likes_count` increments/decrements |
| **Report Post** | Any authenticated user | Flag icon → "Report this post?" confirmation → sets `is_reported = true` |
| **Delete Own Post** | Post author | Removes immediately, no confirmation for now |
| **View Posts** | Anyone (public) | Chronological, newest first, paginated |
| **View on Own Profile** | Profile owner | Read-only; cannot post on self |

### Permission Matrix (Guestbook-specific)

```javascript
const canPost = session && !isCurrentUser;           // logged in, not your own page
const canLike = session;                             // any logged-in user
const canReport = session;                           // any logged-in user
const canDelete = session && auth.uid === author_id; // your own post only
```

---

## Expanded Drawer View (Full-Screen)

When tapped, the Guestbook tile expands to 80% height. The expanded view is a **social feed** — a vertically scrollable list of post cards with an inline composer at the top (if permitted). The hero photo shrinks to 20% and the other tiles are displaced downward.

### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  ← Back    Guestbook              💬 12 notes       │  ← sticky header
│           Quick notes from family & friends          │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │  [Avatar] Author Name              2h ago   │   │
│  │                                             │   │
│  │  ┌─────────────────────────────────────┐      │   │
│  │  │  Post content goes here, up to    │      │   │  ← speech bubble
│  │  │  240 characters. Can include        │      │   │     left-aligned
│  │  │  @mentions like @Sarah Johnson    │      │   │
│  │  └─────────────────────────────────────┘      │   │
│  │                                             │   │
│  │  📍 Atlanta, GA  ·  📅 Remembering: Jun 12  │   │  ← metadata row
│  │                                             │   │
│  │  ♥ 12  ·  💬 Reply  ·  🚩 Report            │   │  ← action row
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │  [Avatar] Mike Thompson              5h ago │   │
│  │                                             │   │
│  │  ┌─────────────────────────────────────┐      │   │
│  │  │  Happy birthday! Hope you have a    │      │   │
│  │  │  great day! 🎉                      │      │   │
│  │  └─────────────────────────────────────┘      │   │
│  │                                             │   │
│  │  ♥ 3  ·  💬 Reply  ·  🚩 Report  ·  🗑 Delete│   │  ← Delete shown for own posts
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │  [Avatar] Lisa Carter             Yesterday   │   │
│  │                                             │   │
│  │  ┌─────────────────────────────────────┐      │   │
│  │  │  Remembering that time at the       │      │   │
│  │  │  family reunion in 2019. Good       │      │   │
│  │  │  times! @Mike Thompson              │      │   │
│  │  └─────────────────────────────────────┘      │   │
│  │                                             │   │
│  │  📍 Family Reunion, Orlando  ·  📅 Jun 15, 2019│  │
│  │                                             │   │
│  │  ♥ 8  ·  💬 Reply  ·  🚩 Report            │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│              ─── Load more notes ───                 │
│                                                      │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐   │  ← inline composer (if canPost)
│  │  [Your Avatar]  Write a quick note...       │   │
│  │  ─────────────────────────────────────────  │   │
│  │  @mention  📍 location  📅 date      [Post] │   │
│  │  0 / 240                                    │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

### Sticky Header

- **Back arrow / chevron** — collapses the drawer, returns to neutral tile grid state
- **Title:** "Guestbook" — bold, left-aligned
- **Post count badge** — right side, e.g. "💬 12 notes" or "💬 1 note" (singular/plural)
- **Subtitle:** "Quick notes from family & friends" — smaller, muted, below title
- **Background:** Plum (`#6c254c`) with a subtle bottom border or shadow to separate from scrollable content
- **Behavior:** Header sticks to top as user scrolls through posts

---

### Post Card Anatomy

Each post is a self-contained card with clear visual hierarchy:

#### 1. Author Row (top of card)
```
┌─────────────────────────────────────────────┐
│  [Avatar]  Sarah Johnson          2h ago    │
│            @sarah.johnson                     │  ← optional username handle
└─────────────────────────────────────────────┘
```
- **Avatar** — 40px circle, links to author's profile
- **Name** — bold, links to author's profile
- **Timestamp** — right-aligned, muted gray, relative time ("2h ago", "Yesterday", "Jun 10")
- **Spacing** — 12px padding around the card, 16px between cards

#### 2. Content Bubble (center)
```
┌─────────────────────────────────────────────┐
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  The actual post content lives here.│    │  ← left-aligned speech bubble
│  │  It can wrap to multiple lines and  │    │     with a subtle left border
│  │  include @mentions like @Mike T.    │    │     or background tint
│  │  and #hashtags like #Reunion2026    │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```
- **Speech bubble style** — left border in gold/rose (`#EABEA9`) or a very subtle plum tint background (`#5b1f40`)
- **@mentions** — highlighted in gold/rose, clickable, link to tagged profile
- **#hashtags** — same color as @mentions but not clickable (for now)
- **Text wrapping** — natural wrap, no truncation in expanded view
- **Max height** — if a post somehow exceeds ~6 lines (shouldn't with 240-char limit), fade out with "...see more"

#### 3. Metadata Row (below content, if present)
```
📍 Atlanta, GA  ·  📅 Remembering: Jun 12, 2020
```
- **Location chip** — map pin icon, free text, small font, muted
- **Event date chip** — calendar icon, italicized label "Remembering:" for nostalgic tone
- **Separator** — middle dot (`·`) between chips
- **Conditional** — only shown if the post has location and/or event_date
- **Alignment** — left-aligned, below the content bubble

#### 4. Action Row (bottom of card)
```
♥ 12  ·  💬 Reply  ·  🚩 Report
```
```
♥ 3  ·  💬 Reply  ·  🚩 Report  ·  🗑 Delete
```
- **Like** — heart icon + count. Toggle state: outline (not liked) → filled (liked). Count increments/decrements.
- **Reply** — speech bubble icon + "Reply" text. For v1, this is a placeholder (opens a toast: "Replies coming soon").
- **Report** — flag icon. Tap → confirmation modal: "Report this note?" → sets `is_reported = true`, hides post locally.
- **Delete** — trash icon. Only visible if `auth.uid === author_id`. Immediate delete, no confirmation.
- **Spacing** — evenly spaced or left-aligned with gaps, small font, muted until hovered

---

### Inline Composer (if `canPost`)

Shown at the **bottom** of the expanded drawer, sticky or scrollable with the feed. For v1, place it **above the feed** (top of scrollable area) so it's immediately visible when opening the drawer.

```
┌─────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────┐   │
│  │  [Your Avatar]  Write a quick note...       │   │
│  │  ─────────────────────────────────────────  │   │
│  │                                             │   │
│  │  @mention  📍 location  📅 date      [Post] │   │
│  │  0 / 240                                    │   │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  [Post feed scrolls below]                          │
└─────────────────────────────────────────────────────┘
```

#### Input Field
- **Placeholder:** "Write a quick note for {Firstname}..."
- **Textarea** — auto-resize up to 3 lines, then scrolls internally
- **Character counter** — bottom-right: "0 / 240"
  - **0–200:** white/gray text
  - **201–230:** amber/orange warning
  - **231–240:** red, bold
  - **>240:** red, bold, input blocked (hard stop)
- **Avatar** — your own profile picture, 36px, left of input

#### Action Buttons (below input)
- **@mention** — `@` icon. Tap → search dropdown of family members (search by first/last name). Selected member inserted as `@Firstname Lastname` (stored as UUID in `tagged_profiles`).
- **📍 location** — map pin icon. Tap → free text input or dropdown of known family cities. Stored as string.
- **📅 date** — calendar icon. Tap → date picker. Stored as `event_date`.
- **Post button** — right-aligned, plum background, gold text. Disabled if content empty or >240 chars. Enabled state has hover effect.

#### @mention Dropdown
```
┌─────────────────────────────────┐
│  @sarah                         │  ← typing @ triggers this
├─────────────────────────────────┤
│  [Avatar] Sarah Johnson         │
│  [Avatar] Sarah Williams        │
│  [Avatar] Sarah Chen            │
└─────────────────────────────────┘
```
- **Trigger:** Typing `@` in the input field
- **Search:** Filter family members by first/last name as user types
- **Selection:** Click → inserts `@Firstname Lastname` into text, stores UUID in `tagged_profiles` array
- **Dismiss:** Escape, click outside, or continue typing without selecting

---

### Empty State

Shown when the profile has **zero guestbook posts**:

```
┌─────────────────────────────────────────────────────┐
│  ← Back    Guestbook              💬 0 notes        │
│           Quick notes from family & friends          │
├─────────────────────────────────────────────────────┤
│                                                      │
│                    💬                                │
│                                                      │
│              No notes yet                            │
│                                                      │
│       Be the first to leave a note                 │
│            for {Firstname}!                        │
│                                                      │
│              [Leave a Note]                        │  ← scrolls to composer if present
│                                                      │
└─────────────────────────────────────────────────────┘
```
- **Icon:** Large speech bubble, 48px, muted gold/rose
- **Text:** Centered, friendly, casual tone
- **CTA button:** Only shown if `canPost`. Taps → focuses the composer input field.
- **If cannot post** (self profile or guest): "Notes from family will appear here."

---

### Auth CTA (if unauthenticated)

Shown when a **guest** (not logged in) opens the drawer:

```
┌─────────────────────────────────────────────────────┐
│  ← Back    Guestbook              💬 12 notes       │
│           Quick notes from family & friends          │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [Post feed is visible but truncated —             │
│   show first 3 posts, then blur/fade overlay]        │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │  Sign in to see all notes and              │   │
│  │  leave one for {Firstname}!                │   │
│  │                                             │   │
│  │        [Sign In]  [Register]               │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
└─────────────────────────────────────────────────────┘
```
- **Feed visibility:** First 3 posts visible to tease content, then blurred/faded overlay
- **CTA card:** Centered, prominent, with two buttons
- **Sign In** — navigates to login
- **Register** — navigates to registration
- **No composer** shown for unauthenticated users

---

### Loading State

While posts are fetching:

```
┌─────────────────────────────────────────────────────┐
│  ← Back    Guestbook                               │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │  [Skeleton Avatar]  [Skeleton Name]          │   │
│  │  ┌─────────────────────────────────────┐    │   │
│  │  │  [Skeleton text line 1]             │    │   │
│  │  │  [Skeleton text line 2]             │    │   │
│  │  └─────────────────────────────────────┘    │   │
│  │  [Skeleton actions]                         │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  [Repeat 2-3 skeleton cards]                         │
│                                                      │
└─────────────────────────────────────────────────────┘
```
- **Skeleton cards** — 3 cards with pulsing shimmer animation
- **No composer** shown until data loads (prevents user from posting before seeing existing content)

---

### Error State

If the guestbook posts fail to load:

```
┌─────────────────────────────────────────────────────┐
│  ← Back    Guestbook                               │
├─────────────────────────────────────────────────────┤
│                                                      │
│                    ⚠️                                │
│                                                      │
│         Couldn't load notes                        │
│                                                      │
│    [Try Again]                                     │
│                                                      │
└─────────────────────────────────────────────────────┘
```
- **Retry button** — re-fetches the guestbook data
- **Fallback** — if retry fails, show "Something went wrong. Please check your connection."

---

### Scroll Behavior

- The **expanded drawer itself** is a scrollable container (80% height, `overflow-y: auto`)
- The **hero photo** is fixed at 20% height above the drawer — it does not scroll
- The **other tiles** (Almanac, Connections, Media) are pushed off-screen below the expanded drawer
- **Pull-to-refresh** (optional v2): Swipe down at top of feed to reload posts
- **Infinite scroll** (optional v2): Load more posts as user scrolls near bottom (paginated by `created_at`)

---

### Animation & Transitions

| Transition | Duration | Easing | Description |
|------------|----------|--------|-------------|
| **Drawer expand** | 400ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Guestbook tile grows from square to 80% height, hero shrinks to 20% |
| **Drawer collapse** | 300ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Reverse of expand, slightly faster |
| **Post card enter** | 200ms | `ease-out` | Newly created post slides in from top with fade |
| **Like toggle** | 150ms | `ease-in-out` | Heart fills/unfills with a subtle scale pop (1.0 → 1.2 → 1.0) |
| **Delete** | 200ms | `ease-in` | Post card fades out and collapses height to 0 |
| **Report modal** | 150ms | `ease-out` | Confirmation dialog fades in |
| **@mention dropdown** | 100ms | `ease-out` | Dropdown slides down from input |

---

### Responsive Notes

- **Mobile-first** — this entire spec is designed for the mobile app viewport (the profile card is a fixed viewport component)
- **Desktop** — if viewed on desktop, the drawer could expand to a modal or side panel instead of the 80% slide-up. Out of scope for v1.
- **Safe areas** — respect iOS/Android safe area insets for the composer (don't let it sit under the home indicator)

---

## Guestbook Live Tile Face (Collapsed State)

The Guestbook tile is a **square** in the bottom-left. It rotates through faces inspired by the **Windows Phone Email tile** (count + sender preview) and **Messaging tile** (conversation snippet).

### Face Rotation Pool

| Face | Type | What It Shows | Transition | Duration | Weight |
|------|------|---------------|------------|----------|--------|
| **Latest Post Preview** | `message` | Most recent post content (truncated to ~60 chars), author avatar + name | `slideUp` | 4000ms | 5 |
| **Post Count** | `stat` | Total post count as big number, "notes left" label, latest author name | `flipY` | 3000ms | 3 |
| **Mention Spotlight** | `spotlight` | "@{Firstname} was mentioned by {Author}" with their latest post snippet | `slideLeft` | 3500ms | 4 |
| **Activity Pulse** | `pulse` | "New activity" with 3 mini avatars of recent posters, "tap to read" hint | `fade` | 3000ms | 3 |
| **Nostalgia Moment** | `event` | A post with an `event_date` — "Remembering {date}: {snippet}" | `flipY` | 4000ms | 2 |

### Face Data Model

```typescript
interface GuestbookTileFace {
  id: string;
  type: "message" | "stat" | "spotlight" | "pulse" | "event";
  eyebrow: "Guestbook";           // always static
  headline: string | null;        // primary text
  sub: string | null;             // secondary text
  stat: number | null;            // for stat face
  statLabel: string | null;
  authorAvatar: string | null;    // URL for single-avatar faces
  authorName: string | null;
  miniAvatars: string[] | null;   // for pulse face (3 recent posters)
  eventDate: string | null;       // for nostalgia face
  weight: number;
  transition: "slideUp" | "flipY" | "slideLeft" | "fade";
  duration: number;
  minDataRequired: ("posts" | "mentions" | "event_dates")[];
}
```

### Face Generator Logic

```javascript
function generateGuestbookFaces(guestbookData) {
  const faces = [];
  const posts = guestbookData.posts; // sorted newest first

  if (posts.length > 0) {
    // Face 1: Latest Post Preview (always available if posts exist)
    const latest = posts[0];
    faces.push({
      type: "message",
      headline: truncate(latest.content, 60),
      sub: `— ${latest.author_name}`,
      authorAvatar: latest.author_avatar,
      authorName: latest.author_name,
      weight: 5,
      transition: "slideUp",
      duration: 4000,
      minDataRequired: ["posts"],
    });

    // Face 2: Post Count
    faces.push({
      type: "stat",
      stat: posts.length,
      statLabel: posts.length === 1 ? "note left" : "notes left",
      sub: posts.length > 1 ? `Latest from ${latest.author_name}` : null,
      weight: 3,
      transition: "flipY",
      duration: 3000,
      minDataRequired: ["posts"],
    });

    // Face 3: Activity Pulse (only if 2+ posts in last 30 days)
    const recentPosts = posts.filter(p => isWithinDays(p.created_at, 30));
    if (recentPosts.length >= 2) {
      const recentAuthors = recentPosts.slice(0, 3).map(p => p.author_avatar);
      faces.push({
        type: "pulse",
        headline: "Recent activity",
        sub: `${recentPosts.length} new notes`,
        miniAvatars: recentAuthors,
        weight: 3,
        transition: "fade",
        duration: 3000,
        minDataRequired: ["posts"],
      });
    }

    // Face 4: Nostalgia Moment (only if posts with event_date exist)
    const nostalgiaPosts = posts.filter(p => p.event_date);
    if (nostalgiaPosts.length > 0) {
      const pick = nostalgiaPosts[0]; // most recent nostalgia post
      faces.push({
        type: "event",
        headline: `Remembering ${formatDate(pick.event_date)}`,
        sub: truncate(pick.content, 50),
        authorAvatar: pick.author_avatar,
        weight: 2,
        transition: "flipY",
        duration: 4000,
        minDataRequired: ["posts", "event_dates"],
      });
    }
  }

  // Face 5: Mention Spotlight (only if profile is tagged in posts)
  const mentions = guestbookData.mentions; // posts where this profile is tagged
  if (mentions.length > 0) {
    const latestMention = mentions[0];
    faces.push({
      type: "spotlight",
      headline: `${latestMention.author_name} mentioned you`,
      sub: truncate(latestMention.content, 50),
      authorAvatar: latestMention.author_avatar,
      weight: 4,
      transition: "slideLeft",
      duration: 3500,
      minDataRequired: ["posts", "mentions"],
    });
  }

  return faces;
}
```

### Visual Treatment (Collapsed Square)

The Guestbook tile uses the **Messaging tile aesthetic** — warm, conversational, human:

```
┌─────────────┐
│  💬         │  ← top-left: small speech bubble icon (static)
│             │
│  "So great  │  ← headline: post snippet, 2-3 lines max
│   to see    │
│   everyone! │
│             │
│  — Sarah    │  ← sub: author name, right-aligned or bottom
│  [avatar]   │  ← tiny author avatar, bottom-right
└─────────────┘
```

**Stat face variant:**
```
┌─────────────┐
│  💬         │
│             │
│    12       │  ← big number, centered, bold
│   notes     │  ← label below, smaller
│   left      │
│             │
│  Latest:    │
│  — Mike     │
└─────────────┘
```

**Pulse face variant:**
```
┌─────────────┐
│  💬         │
│  Recent     │
│  activity   │
│             │
│ [a][b][c]   │  ← 3 mini avatars overlapping slightly
│             │
│  3 new      │
│  notes →    │
└─────────────┘
```

**Color:** Plum background (`#6c254c`), gold/rose text (`#EABEA9`), white for the stat number. The speech bubble icon is always present as a subtle branding element.

---

## Guestbook Live Tile Face (Collapsed State)

The Guestbook tile is a **square** in the bottom-left. It rotates through faces inspired by the **Windows Phone Email tile** (count + sender preview) and **Messaging tile** (conversation snippet).

### Face Rotation Pool

| Face | Type | What It Shows | Transition | Duration | Weight |
|------|------|---------------|------------|----------|--------|
| **Latest Post Preview** | `message` | Most recent post content (truncated to ~60 chars), author avatar + name | `slideUp` | 4000ms | 5 |
| **Post Count** | `stat` | Total post count as big number, "notes left" label, latest author name | `flipY` | 3000ms | 3 |
| **Mention Spotlight** | `spotlight` | "@{Firstname} was mentioned by {Author}" with their latest post snippet | `slideLeft` | 3500ms | 4 |
| **Activity Pulse** | `pulse` | "New activity" with 3 mini avatars of recent posters, "tap to read" hint | `fade` | 3000ms | 3 |
| **Nostalgia Moment** | `event` | A post with an `event_date` — "Remembering {date}: {snippet}" | `flipY` | 4000ms | 2 |

### Face Data Model

```typescript
interface GuestbookTileFace {
  id: string;
  type: "message" | "stat" | "spotlight" | "pulse" | "event";
  eyebrow: "Guestbook";           // always static
  headline: string | null;        // primary text
  sub: string | null;             // secondary text
  stat: number | null;            // for stat face
  statLabel: string | null;
  authorAvatar: string | null;    // URL for single-avatar faces
  authorName: string | null;
  miniAvatars: string[] | null;   // for pulse face (3 recent posters)
  eventDate: string | null;       // for nostalgia face
  weight: number;
  transition: "slideUp" | "flipY" | "slideLeft" | "fade";
  duration: number;
  minDataRequired: ("posts" | "mentions" | "event_dates")[];
}
```

### Face Generator Logic

```javascript
function generateGuestbookFaces(guestbookData) {
  const faces = [];
  const posts = guestbookData.posts; // sorted newest first

  if (posts.length > 0) {
    // Face 1: Latest Post Preview (always available if posts exist)
    const latest = posts[0];
    faces.push({
      type: "message",
      headline: truncate(latest.content, 60),
      sub: `— ${latest.author_name}`,
      authorAvatar: latest.author_avatar,
      authorName: latest.author_name,
      weight: 5,
      transition: "slideUp",
      duration: 4000,
      minDataRequired: ["posts"],
    });

    // Face 2: Post Count
    faces.push({
      type: "stat",
      stat: posts.length,
      statLabel: posts.length === 1 ? "note left" : "notes left",
      sub: posts.length > 1 ? `Latest from ${latest.author_name}` : null,
      weight: 3,
      transition: "flipY",
      duration: 3000,
      minDataRequired: ["posts"],
    });

    // Face 3: Activity Pulse (only if 2+ posts in last 30 days)
    const recentPosts = posts.filter(p => isWithinDays(p.created_at, 30));
    if (recentPosts.length >= 2) {
      const recentAuthors = recentPosts.slice(0, 3).map(p => p.author_avatar);
      faces.push({
        type: "pulse",
        headline: "Recent activity",
        sub: `${recentPosts.length} new notes`,
        miniAvatars: recentAuthors,
        weight: 3,
        transition: "fade",
        duration: 3000,
        minDataRequired: ["posts"],
      });
    }

    // Face 4: Nostalgia Moment (only if posts with event_date exist)
    const nostalgiaPosts = posts.filter(p => p.event_date);
    if (nostalgiaPosts.length > 0) {
      const pick = nostalgiaPosts[0]; // most recent nostalgia post
      faces.push({
        type: "event",
        headline: `Remembering ${formatDate(pick.event_date)}`,
        sub: truncate(pick.content, 50),
        authorAvatar: pick.author_avatar,
        weight: 2,
        transition: "flipY",
        duration: 4000,
        minDataRequired: ["posts", "event_dates"],
      });
    }
  }

  // Face 5: Mention Spotlight (only if profile is tagged in posts)
  const mentions = guestbookData.mentions; // posts where this profile is tagged
  if (mentions.length > 0) {
    const latestMention = mentions[0];
    faces.push({
      type: "spotlight",
      headline: `${latestMention.author_name} mentioned you`,
      sub: truncate(latestMention.content, 50),
      authorAvatar: latestMention.author_avatar,
      weight: 4,
      transition: "slideLeft",
      duration: 3500,
      minDataRequired: ["posts", "mentions"],
    });
  }

  return faces;
}
```

### Visual Treatment (Collapsed Square)

The Guestbook tile uses the **Messaging tile aesthetic** — warm, conversational, human:

```
┌─────────────┐
│  💬         │  ← top-left: small speech bubble icon (static)
│             │
│  "So great  │  ← headline: post snippet, 2-3 lines max
│   to see    │
│   everyone! │
│             │
│  — Sarah    │  ← sub: author name, right-aligned or bottom
│  [avatar]   │  ← tiny author avatar, bottom-right
└─────────────┘
```

**Stat face variant:**
```
┌─────────────┐
│  💬         │
│             │
│    12       │  ← big number, centered, bold
│   notes     │  ← label below, smaller
│   left      │
│             │
│  Latest:    │
│  — Mike     │
└─────────────┘
```

**Pulse face variant:**
```
┌─────────────┐
│  💬         │
│  Recent     │
│  activity   │
│             │
│ [a][b][c]   │  ← 3 mini avatars overlapping slightly
│             │
│  3 new      │
│  notes →    │
└─────────────┘
```

**Color:** Plum background (`#6c254c`), gold/rose text (`#EABEA9`), white for the stat number. The speech bubble icon is always present as a subtle branding element.

---

## Database Schema (Supabase)

```sql
-- Drop old tribute table if migrating
-- DROP TABLE IF EXISTS public.tribute;

-- Guestbook posts table
CREATE TABLE IF NOT EXISTS public.guestbook_post (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (LENGTH(content) <= 240),
    tagged_profiles UUID[] DEFAULT '{}',
    location TEXT,
    event_date DATE,
    likes_count INTEGER NOT NULL DEFAULT 0,
    is_reported BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.guestbook_post ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_guestbook_profile_id ON public.guestbook_post(profile_id);
CREATE INDEX idx_guestbook_author_id ON public.guestbook_post(author_id);
CREATE INDEX idx_guestbook_created_at ON public.guestbook_post(created_at DESC);
CREATE INDEX idx_guestbook_tagged_profiles ON public.guestbook_post USING GIN(tagged_profiles);

-- Policies
CREATE POLICY "Anyone can read guestbook posts" ON public.guestbook_post
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can write guestbook posts" ON public.guestbook_post
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.uid() = author_id
        AND auth.uid() != profile_id  -- cannot post on own wall
    );

CREATE POLICY "Users can delete their own guestbook posts" ON public.guestbook_post
    FOR DELETE USING (
        auth.uid() = author_id
    );

CREATE POLICY "Users can update their own guestbook posts" ON public.guestbook_post
    FOR UPDATE USING (
        auth.uid() = author_id
    );

-- Like tracking (simple version: just count, no per-user like table for v1)
-- If we need per-user like state later, add:
-- CREATE TABLE public.guestbook_like (post_id, profile_id, created_at, UNIQUE(post_id, profile_id));
```

---

## API / Frontend Queries

### Fetch Posts (for expanded view + face generation)
```javascript
const { data, error } = await supabase
  .from('guestbook_post')
  .select(`
    id, content, location, event_date, likes_count, is_reported, created_at,
    author:author_id ( id, firstname, lastname, avatar_url ),
    tagged_profiles
  `)
  .eq('profile_id', urlUserId)
  .eq('is_reported', false)  // hide reported posts from public view
  .order('created_at', { ascending: false })
  .limit(50);
```

### Create Post
```javascript
const { error } = await supabase
  .from('guestbook_post')
  .insert({
    profile_id: targetUserId,
    author_id: session.user.id,
    content: trimmedContent,
    tagged_profiles: mentionedUserIds,
    location: locationText || null,
    event_date: eventDate || null,
  });
```

### Like Post (increment count)
```javascript
const { error } = await supabase
  .from('guestbook_post')
  .update({ likes_count: supabase.rpc('increment', { row_id: postId }) })
  .eq('id', postId);
```

### Report Post
```javascript
const { error } = await supabase
  .from('guestbook_post')
  .update({ is_reported: true })
  .eq('id', postId);
```

---

## Migration Notes

- The old `tribute` table (if created) should be dropped or archived.
- Guestbook posts are **not** the same as tributes — tributes were long-form, guestbook is short-form.
- No data migration needed if `tribute` was never populated.
- If `tribute` has data, consider a one-time migration script that truncates messages to 240 chars and moves them to `guestbook_post`.

---

## Summary

| Aspect | Before (Tribute) | After (Guestbook v2) |
|--------|-----------------|----------------------|
| **Length** | Unlimited text | 240 chars max |
| **Tone** | Formal tribute / memorial | Casual wall post / note |
| **Social** | None | Like, @mention, report |
| **Metadata** | None | Location, event date |
| **Tile face** | Single quote | Multi-face rotation (message, stat, pulse, event, spotlight) |
| **Expanded** | Message wall | Post feed + inline composer |
| **Permissions** | Write on any profile | Cannot write on own profile |
