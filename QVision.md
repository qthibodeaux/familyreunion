Site Information Architecture — v2

The Core Idea

The site has always had one category of content: Tree — structural, computed-from-facts data (generation, branch, birthdate, lineage). Everything about it is derived automatically from what a profile contains.

This update adds two more concepts, which are related but distinct from each other:


Pulse — exposure for content that already exists on individual profiles but currently has no visibility beyond them. Pulse is not a new content type or a new data model. It is a lens that aggregates two things that already live on profiles — Milestones and Media — and surfaces them across the whole family, so people don't have to stumble onto a specific profile to find out something happened. Pulse is public and about everyone — it doesn't matter whether an item touches you personally.
Notifications — a personal, reactive feed about interactions on your own content specifically: someone liked your milestone or media, someone left a guestbook message on your profile. This is private to you, not a public aggregation. Where Pulse answers "what's new with the family," Notifications answers "did anyone respond to me."


Guestbook itself is intentionally excluded from Pulse. It's a directed, one-to-one note (visitor → profile owner), not a broadcast-shaped event like a milestone or a photo. It stays exactly where it is today: visible only on the profile it belongs to. It DOES, however, feed Notifications — a guestbook message left on your profile should notify you.

So there are three organizing concepts now:


Tree = structure, computed, about everyone, no notion of "new"
Pulse = activity, broadcast, public, about everyone, recency-based
Notifications = activity, reactive, private, about you specifically


This three-way split is the organizing idea for the menu, the homepage, and how profile features connect outward.


1. The Menu

Before

Home
Interactive Tree
Calendar Tree
Timeline Tree
Search Members
Ancestor Profiles

A flat list with no visual grouping — doesn't communicate that two different kinds of things are happening on this site.

After

┌───────────────────────────┐
│  [Avatar]   View Profile    │
│             Sign Out         │
├───────────────────────────┤
│             Home             │
├─────────────┬─────────────┤
│    TREE       │    PULSE     │
├─────────────┼─────────────┤
│ Interactive   │Notifications●│
│    Tree       │              │
├─────────────┼─────────────┤
│  Timeline     │   Family     │
│    Tree       │  Milestones  │
├─────────────┼─────────────┤
│  Calendar     │   Family     │
│    Tree       │    Media     │
├─────────────┼─────────────┤
│   Search      │   Family     │
│  Members      │  Profiles    │
└─────────────┴─────────────┘


Account header (new, top of menu, above everything) — avatar, "View Profile," "Sign Out." This is account-level, not Tree or Pulse — it's the personal anchor of the menu, separate from both navigation categories.
Home — single full-width button, unchanged purpose.
Tree column (left) — Interactive Tree, Timeline Tree, Calendar Tree, Search Members. All existing items, unchanged.
Pulse column (right) — Notifications, Family Milestones, Family Media, Family Profiles (renamed from Ancestor Profiles — cosmetic only, same directory/functionality).


Note that Notifications sits in the Pulse column positionally, but is conceptually its own thing (private/reactive, not public/broadcast like Milestones and Media) — see the Core Idea section above. It's grouped here visually because it's still "the side of the menu about activity," but its actual behavior is closer to an inbox than a feed. The ● next to it represents the unread badge (see section 2a).

The two-column layout itself is doing communication work: opening the menu teaches the visitor "this site has two kinds of things — the family's shape, and the family's recent life" without needing a single word of explanation.


2. Recent Milestones & Recent Media (new pages)

Both are simple, intentionally NOT infinite-scroll, NOT addictive-feed-shaped. The goal is "catch up on what's new," not "scroll forever."

Recent Milestones


Query: most recent N milestone entries across all profiles (e.g. last 30 days, or last 20 entries, whichever is smaller — pick a sane cap).
Each item: who it's about, what kind of milestone (birth, graduation, new job, etc.), when it happened, link to their full profile.
A simple like/heart button on each item (see 2a).
No comments, no infinite scroll. A clean, short list. Think a community bulletin board, not a social feed.


Recent Media


Query: most recent N photos/videos uploaded across all profiles.
Grid layout (photos/video thumbnails), each tagged with whose profile it belongs to.
A simple like/heart button on each item (see 2a).
Tapping opens the media full-size, with a link back to that person's profile.
Same philosophy: recent and bounded, not endless.


Both pages pull from data that already exists on profiles — no new tables, no new content-entry flows beyond the like action itself. They are mostly read-only aggregation views, with one small write action (liking).

2a. Notifications

A personal inbox-style page, distinct from Pulse despite sitting in the same menu column. Surfaces things that happened to your own content:


Someone liked a milestone or media item on your profile.
Someone left a guestbook message on your profile.


Each entry: who did the thing, what they did, when, link to the relevant item. Simple chronological list, same "not infinite scroll" philosophy as the Pulse pages.

Unread indicator: a small badge/counter appears on the menu's Notifications item (and optionally echoed on the avatar in the account header) when there's something new since last viewed. Clears/decrements once the Notifications page is visited.

Data model implication: this requires a likes table (or similar) tracking who liked what item, plus the existing guestbook-message data already feeding into it. This is genuinely new write functionality — not just an aggregation view like Recent Milestones/Media — so it's worth scoping as its own small feature when building, not bundled in as an afterthought of the Pulse pages.


3. Homepage — Before and After

Before (6 sections)


Hero
Root branch blurb + CTA
3×4 grid of first-branch members
Heritage/lineage preview + CTA to Interactive Tree
Family Mosaic
Member search


After (6 sections — same count, rebalanced)


Hero — unchanged.
Root Branch (merged) — combines the old blurb+CTA and the 3×4 grid into one section: a short intro line about the root branch, a smaller preview grid of first-branch members (can shrink from 3×4 to something like 2×4 if needed for space), one CTA button ("Join the Branch" or similar). This frees up a slide.
Heritage / Your Lineage — unchanged, still your direct-line preview + CTA into the Interactive Tree. This is the homepage's Tree ambassador.
Family Mosaic — unchanged functionally, but its surrounding copy/header should now explicitly nod to Pulse, since it's visually built from the same well of activity (profile photos today, media in the future). Something like a small label above it: "Family Pulse" with the mosaic as the visual centerpiece underneath. This is the homepage's Pulse ambassador, paired conceptually with #5.
Pulse Highlights (new) — a calm, simple slide: 2-3 actual recent items pulled live from Milestones/Media (e.g. "Clara graduated high school" + a thumbnail, "3 new photos from the Garcia reunion"), each linking out to Recent Milestones / Recent Media. This is NOT another flashy animated thing — it's the quiet, readable counterpart to the Mosaic's flashy version. Mosaic = the feeling of activity. Pulse Highlights = the substance of it, in plain text you can actually read without waiting for a flip animation.
Member Search — unchanged.


This keeps the homepage at 6 sections, but now sections 3+4 are clearly "Tree side" and sections 4(mosaic)+5 are clearly "Pulse side" — the homepage itself echoes the same two-category structure as the menu, just expressed visually instead of as a list.


4. Profile Page — Confirmed Layout (no changes needed, just documenting for reference)

┌───────────────────────────┐
│                           │
│      Profile Photo        │   <- ~50% of screen height
│                           │
├───────────────────────────┤
│                           │
│    Living Almanac          │   <- full width
│                           │
├───────────────────────────┤
│                           │
│      Connections           │   <- full width
│                           │
├─────────────┬─────────────┤
│             │             │
│  Guestbook  │    Media    │   <- two equal columns
│             │             │
└─────────────┴─────────────┘

This stays as-is. The important architectural note: Living Almanac and Media are the two profile features that feed Pulse. Guestbook does not. Connections continues to feed the Tree (it's how relationships get established and generation/branch get computed) but isn't itself a Pulse-visible thing.


5. Summary — What Feeds What

Profile featureFeeds Tree?Feeds Pulse?Feeds Notifications?Stays profile-only?Name, birthdate, branchYes — computes generation/placementNoNo—Connections (parent/spouse/child)Yes — builds the tree structureNoNo—Living Almanac (milestones)NoYes — Recent Milestones page + homepage Pulse HighlightsYes — if liked—Media (photos/short videos)NoYes — Recent Media page + homepage Pulse Highlights + future Mosaic tilesYes — if liked—GuestbookNoNoYes — a message on your profile notifies youDisplay stays profile-onlyLikes (new)NoNoYes — this is the entire point of the feature—


6. What This Fixes


The Mosaic and the new profile features (Almanac, Media) finally have a site-wide home instead of being either purely decorative (Mosaic) or trapped on individual profiles (Almanac, Media) — Recent Milestones and Recent Media give them a real page, and the homepage gives them real visibility.
The menu visually teaches the site's actual shape (two categories) instead of listing six items with no grouping logic.
Guestbook's privacy-appropriate scope is preserved rather than accidentally being swept into a public aggregation feed.
No new content models, no new data entry flows — everything in Pulse is a read view over data that already exists. This is the cheapest possible way to solve the visibility problem.
The homepage section count doesn't grow, so it doesn't get any more overloaded than it already was — it just gets better organized, with Tree and Pulse each getting a clear "ambassador" pairing (Heritage→Tree, Mosaic+Highlights→Pulse).



7. Open Items for Later (explicitly deferred, not forgotten)


Whether Media tiles get woven into the Mosaic's tile content pool (noted as a future enhancement in the Mosaic spec — not blocking this IA work).
Whether a future "status update" feature (an explicit, opt-in broadcast post) gets added someday — this would be a deliberate new feature, not a retrofit of Guestbook.
Whether Pulse ever needs more than 2 sub-items — the menu grid has visual room to grow without restructuring.
Likes is new write functionality, not just a read aggregation — build/test it as its own small feature (a likes table, an endpoint to toggle a like, the unread-badge logic on Notifications) rather than assuming it falls out "for free" from the Pulse pages.


1. We are always mobile only. never desktop. the menu will be two columns, 4 rows each.  interactive tree, calendar tree, timeline tree, search members, teh right column notificatoins, family milestones, family media, family profiles.

2. kinda like a windows 8 live tile. a bell with the number of notifications that will sometimes flip to one fo the notifications.

3. no. it all fresh. the site is still not launched.

4. the "recent milestones" is what hte helper agent kept suggesting. i want the page to be milestones, we can have a recent cateogriztaion for recent ones...but cn also have like...milestones that happened in this month etc.

5. short videos 6 second clips. we havent discussed this yet. it will be the last thing. vidoes may not make it. we can discuss media last.

7. (did you skip 6?) i want basic notiications. someone likes you milestone, or likes your pic or commentson the pic, or someone leaves a note on your guestbook or likes a message on the guestbook. read and unreadon those. that isthe only like funcitonality for right now. we cn go over in detail how to do it. i wnatit to be simple for right now. no tagging functionlaity is needed.

9. (did you skip 8?) we can spli hte button up into 3 buttons that direct you to one of the trees.
n