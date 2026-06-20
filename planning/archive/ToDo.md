1. Legacy Sections Deactivated (No Longer Implemented)
These components exist in the codebase but were removed during the migration from the legacy 

Home.js
 to the new snap-scroll homepage:



ScrollBanner.js
: Previously displayed family statistics (youngest/oldest members, count of registered members) and a CTA to explore the tree.


*Implemented:* YourBranch has been completely refactored and integrated as `NewYourBranchSection.js` (Slide 4 on the homepage) showing custom lineage mapping and branch stats.


RotatingGrid.js
: A 3x3 grid of cards rotating between random family profiles and color blocks. It has been deactivated and is not imported in the new homepage layout.
2. Uncompleted Components from 

IMPROVEMENT_PLAN.md
The following components are defined in the improvement plan but do not yet exist in the codebase:

BranchInfo.js (Root Section): Intended to display detailed branch information and historical context.
FirstBranchBlerd.js (First Branch Section): Intended as an interactive visual representation of the first branch.
StateTree.js (Members Section): A geographical/interactive distribution map of family members.
Info.js (Members Section): For member statistics and family milestones.
DidYouKnow.js (Footer Section): Planned for fun family facts and historical tidbits.
Closer.js (Footer Section): Meant as a final footer CTA and contact panel.
Refactoring/Performance updates on 

RotatingGrid.js
: Tasked with adding hover effects and improving performance.
3. Unimplemented Concepts from 

Mosaic.md
The experimental "Ambient Choreography" idea to transform the grid into a living 4x7 board has not been started. All of its key mechanics are currently unimplemented:

State Transformations: Multi-tile merges (e.g. one face split across a 2x2 area), monograms, and silhouette states.
Choreographed Flips: Wave/ripple sweeps, domino chains, glitch bursts, diagonal sweeps, and sliding puzzle animations.
Special Event Modes: Giant hero moments (the entire board becoming monochrome or showing one massive image split across all tiles) triggering every 30–60 seconds.
Summary of Work Done
Reviewed workspace file structure and active components.
Examined 

IMPROVEMENT_PLAN.md
, 

Mosaic.md
, and legacy layout files to map missing or inactive features.
Identified deactivated legacy components and uncreated future components.