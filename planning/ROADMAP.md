# Family Reunion Portal — Consolidated Roadmap & Next Steps

This document is the single, unified source of truth for the project's development roadmap. It consolidates active priorities, future ideas, and unimplemented features from legacy planning documents (`ToDo.md`, `IMPROVEMENT_PLAN.md`, `FUTURE_IDEAS.md`, and `QThoughts.md`) into a single focused backlog, updated with latest design decisions.

---

## 🎯 Phase 1: Profile Redesign & Security (Immediate Focus)

The new non-scrolling profile card layout is partially complete, with the database migrations and visual live-tile structures built but not fully integrated.

### 1. Guestbook v2 Integration
*   **Status**: Database and components are ready, but not wired in.
*   **Tasks**:
    *   Open [NewProfile.js](file:///c:/Users/qtiph/OneDrive/Desktop/Deploy/FamilyReunion/familyreunion/src/newComponents/NewProfile.js) and import [GuestbookComposer.js](file:///c:/Users/qtiph/OneDrive/Desktop/Deploy/FamilyReunion/familyreunion/src/newComponents/GuestbookComposer.js), [GuestbookPostCard.js](file:///c:/Users/qtiph/OneDrive/Desktop/Deploy/FamilyReunion/familyreunion/src/newComponents/GuestbookPostCard.js), and [GuestbookLiveTile.js](file:///c:/Users/qtiph/OneDrive/Desktop/Deploy/FamilyReunion/familyreunion/src/newComponents/GuestbookLiveTile.js).
    *   Replace legacy `tribute` database query state, post handlers, and text areas with the new v2 guestbook state and handlers (`guestbookPosts`, `fetchGuestbookPosts`, `handlePostCreated`, `handleLikeToggle`, `handleReportPost`, `handleDeletePost`).
    *   Replace the old tribute drawer content with the v2 composer and post list.
    *   Replace the collapsed preview tile with the `GuestbookLiveTile`.

### 2. Living Almanac (Milestones) Verification
*   **Status**: Milestones backend/storage configured, but needs verification.
*   **Tasks**:
    *   Verify the live tile animations and rotations for [MilestonesLiveTile.js](file:///c:/Users/qtiph/OneDrive/Desktop/Deploy/FamilyReunion/familyreunion/src/newComponents/MilestonesLiveTile.js).
    *   Test creation, photo uploads to the storage bucket, and deletions of milestones inside the expanded drawer.
    *   Audit the Supabase Row Level Security (RLS) rules to guarantee public read capability but strict writer controls (`public.can_edit_profile`).

### 3. Media/Photos Drawer Implementation
*   **Status**: Current drawer is just a placeholder.
*   **Tasks**:
    *   Build out a real media gallery (photo/video uploads, grid layout, delete actions) on the bottom-right tile drawer of the profile page.
    *   **Polaroid Memory Carousel**: Integrate a swipeable, polaroid-styled memory carousel directly inside this opened Media drawer.
    *   **Decade Flashback**: Implement a timeline slider (e.g. `[1990s] -- [2010s] -- [Today]`) inside the expanded Media drawer that filters the uploaded photos by decade.
    *   Utilize a Supabase storage bucket (`profile-media`) and link uploaded items to profiles.

### 4. Navigation & Edit Flow Updates
*   **Status**: Navigation behaviors and editing sections need adjustments.
*   **Tasks**:
    *   **Navbar back button change**: Modify the back button behavior to only toggle open/close. It should **not** force redirect home.
    *   **Nav history**: Explore adding a history-based go-back navigation action.
    *   **Profile Edit Section**: Update the edit form layout `/profileedit/:userId` and profile information editing section to feel premium.
    *   **Renaming**: Rename all instances/labels of "Ancestor Profiles" to "Family Profiles" in navigation and headers.

---

## 🎨 Phase 2: Home Screen Polish & Mosaic Overhaul

The snap-scroll homepage layout is active, with specific roles and updates for each slide.

### 1. Slide-by-Slide Homepage Checklist
*   **Slide 1 (Hero)**: Done / Good.
*   **Slide 2 (ScrollBanner)**: Active. Displays family statistics (youngest/oldest members, count of registered members, and CTA).
*   **Slide 3 (First Branch)**: **Completed / Done.**
*   **Slide 4 (Your Heritage / Your Branch & Branch Info)**: Displays user's lineage mapping, branch statistics, and historical context.
*   **Slide 5 (Mosaic)**: Active. Replaced the legacy RotatingGrid section. Needs visual and animation improvements.
*   **Slide 6 (Member Search)**: Active. Redesign button sizes, placements, and aesthetics to match the gold/plum design language.

### 2. Slide 5 (Mosaic) Execution Improvement
*   **Status**: Concept is good, but current execution feels lacking.
*   **Tasks**:
    *   Implement "Ambient Choreography" features documented in [Mosaic.md](file:///c:/Users/qtiph/OneDrive/Desktop/Deploy/FamilyReunion/familyreunion/Mosaic.md).
    *   Add **State Transformations**: Multi-tile merges (e.g. splitting a large face across a 2x2 or 3x3 coordinate zone), monograms, and silhouette states.
    *   Add **Choreographed Flips**: Wave/ripple sweeps, domino chains, glitch bursts, and diagonal sweeps in [MosaicEffects.js](file:///c:/Users/qtiph/OneDrive/Desktop/Deploy/FamilyReunion/familyreunion/src/newComponents/sections/MosaicEffects.js).
    *   Add **Special Event Modes**: Trigger a giant board-wide hero moment (e.g., flash one giant monochrome image or family-wide alert) every 30-60 seconds.

### 3. Homepage Bulletin Board (Status Updates)
*   **Tasks**:
    *   Design and add new homepage slides or panels to showcase **Site-wide updates**, **Status updates (Bulletin Board)**, and **Media updates**.
    *   Implement a bulletin board categorizing cards by `Youth Sports & Events`, `Graduations & Achievements`, and `Announcements & Milestones` with search and branch-level filters.

---

## 🌳 Phase 3: Navigation Menu Sections & Genealogy Extensions

Re-envision the core genealogy visualizers beyond basic lists.

*   **Geographic Distribution Map (StateTree)**: Add an interactive map showing where family branches live. Moved to become a **section in the main Navigation Menu** (instead of a homepage slide).
*   **Interactive Tree**: An interactive, zoomable, and pannable visual representation of the family lineages.
*   **Calendar Tree**: A specialized event tracker layout mapping family member birthdays, anniversaries, and reunions on a structured calendar grid.
*   **Timeline Tree**: A chronological history map detailing overall family development milestones from founders down to today.

---

## 🧪 Phase 4: Long-Term Wholesome Social Concepts

Features to promote deep connection without addictive mechanics.

*   **Auditory Heritage (Voice Notes)**: Add a drawer to profiles where elders or family members can record 10-second vocal greetings or oral histories.
