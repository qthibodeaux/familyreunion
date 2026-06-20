# Family Reunion - Source Code Map

> Overview of the React application architecture and file organization

---

## 📁 Directory Structure

```
src/
├── App.js                 # Main app component with router configuration
├── index.js               # Application entry point
├── index.css              # Base CSS styles
├── supabaseClient.js      # Supabase client initialization
├── useSession.js          # Authentication context & session management
├── assets/                # Static images & assets
├── components/            # React components
│   ├── forms/             # Form components
│   ├── partial/           # Reusable card components
│   ├── profile/           # Profile display components
│   ├── timeline/          # Timeline components
│   ├── director/          # Custom hooks for directing state
│   └── utils/             # Component utilities
├── context/               # React context (if any)
├── theme/                 # Styling & CSS
│   ├── components/        # Component-specific styles
│   ├── global.css         # Global styles
│   ├── variables.css      # CSS variables
│   └── STYLING_GUIDE.md   # Styling documentation
└── utils/                 # Utility functions
    └── familyTree.js      # Family tree manipulation helpers
```

---

## 🚀 Entry Points

| File | Purpose |
|------|---------|
| `src/index.js` | React app entry - renders `<App />` into DOM |
| `src/App.js` | Main component - sets up router & auth provider |
| `src/supabaseClient.js` | Initializes Supabase client |

---

## 🔐 Authentication & Session

### `useSession.js`
Custom React hook and context provider for authentication.

**Exports:**
- `useSession()` - Hook to access session state
- `AuthProvider` - Context provider component
- `AuthConsumer` - Default context consumer

**Features:**
- Session management via Supabase Auth
- Profile data fetching & real-time updates
- Auto-redirect if profile incomplete

---

## 🧩 Components

### Main Pages (from `components/index.js`)

| Component | File | Description |
|-----------|------|-------------|
| `Home` | `Home.js` | Landing page with hero & navigation |
| `Profile` | `Profile.js` | User profile view page |
| `ProfileEdit` | `ProfileEdit.js` | Edit profile page |
| `Register` | `Register.js` | User registration page |
| `AncestorProfilePage` | `AncestorProfilePage.js` | Ancestor profile display |
| `FirstBranchPage` | `FirstBranchPage.js` | Branch detail page |
| `ScrollTree` | `ScrollTree.js` | Horizontal scrolling family tree |
| `YearTree` | `YearTree.js` | Year-based tree view |
| `CalendarTree` | `CalendarTree.js` | Calendar-based tree visualization |
| `Avatar` / `AntAvatar` | `Avatar.js` / `AntAvatar.js` | Avatar upload components |
| `Navigation` | `Navigation.js` | App navigation bar |
| `Hero` / `HeroSection` | `Hero.js` / `HeroSection.js` | Hero banner components |
| `MemberSection` | `MemberSection.js` | Member listing section |
| `RootSection` / `RootBranch` | `RootSection.js` / `RootBranch.js` | Root ancestor display |
| `ScrollBanner` / `WelcomeBanner` | `ScrollBanner.js` / `WelcomeBanner.js` | Banner components |
| `YourBranch` / `FirstBranchSection` | `YourBranch.js` / `FirstBranchSection.js` | Branch components |
| `FamilyTree` | `FamilyTree.js` | Family tree component |
| `Navbar` / `NavButton` | `Navbar.js` / `NavButton.js` | Navigation elements |
| `RequireAuth` | `RequireAuth.js` | Auth route guard |
| `AuthCallbackHandler` | `AuthCallbackHandler.js` | OAuth callback handler |

---

### Forms (`components/forms/`)

| Component | Purpose |
|-----------|---------|
| `ProfileForm` | Main profile creation/editing form |
| `ParentForm` | Parent relationship form |
| `MainAncestorForm` | Main ancestor creation form |
| `ConnectionForm` | Family connection management |
| `ResidenceForm` | Residence/location form |
| `MemberSearchForm` | Member search interface |
| `CreateForm` | Generic creation form |
| `FirstNameForm` | First name editing |
| `LastNameForm` | Last name editing |
| `NameForm` | General name editing |
| `NickNameForm` | Nickname editing |
| `SmithSideForm` | Smith family side selector |
| `SunriseForm` / `SunsetForm` | Birth/death date forms |

---

### Partial Components (`components/partial/`)

Reusable card/UI components:

| Component | Purpose |
|-----------|---------|
| `AddConnectionsCard` | Add connection UI |
| `BranchSection` | Branch display section |
| `CarouselCard` | Carousel item card |
| `CompleteProfileCard` | Profile completion prompt |
| `ConfirmCard` | Confirmation dialog |
| `ConnectionsCard` | Display connections |
| `MainAncestorCard` | Main ancestor card |
| `ParentCard` | Parent info card |
| `ProfileCard` | Profile summary card |
| `ProfileSearchCard` | Profile search result card |
| `RootCard` | Root ancestor card |
| `SearchCard` | Search result card |
| `RotatingGrid` | Animated grid component |
| `TimelineBanner` | Timeline header banner |

---

### Profile Components (`components/profile/`)

| Component | Purpose |
|-----------|---------|
| `AncestorInfo` | Ancestor information display |
| `AvatarInfo` | Avatar information display |
| `ConnectionsInfo` | Connections info display |
| `ProfileInfo` | Profile information section |
| `SmithParentInfo` | Smith parent information |

---

### Timeline Components (`components/timeline/`)

| Component | Purpose |
|-----------|---------|
| `FamilyTimeline` | Family timeline visualization |
| `FamilyTimeline.css` | Timeline styles |

---

### Director Hooks (`components/director/`)

Custom hooks for managing complex state logic:

| Hook | Purpose |
|------|---------|
| `useParentDirector` | Manages parent-related state/actions |
| `useProfileDirector` | Manages profile form state/actions |

---

### Utilities (`components/utils/`)

| File | Purpose |
|------|---------|
| `cropImage.js` | Image cropping utility |

---

## 🎨 Theme & Styling

### Global Styles

| File | Purpose |
|------|---------|
| `theme/global.css` | Global CSS rules, imports |
| `theme/variables.css` | CSS custom properties (colors, spacing, etc.) |
| `theme/STYLING_GUIDE.md` | Documentation for styling conventions |

### Component Styles (`theme/components/`)

| File | Components Styled |
|------|-------------------|
| `FamilyTree.css` | Family tree |
| `FirstBranchSection.css` | First branch section |
| `Forms.css` | Form elements |
| `HeroSection.css` | Hero section |
| `Home.css` | Home page |
| `MemberSection.css` | Member section |
| `Root.css` / `RootBranch.css` / `RootSection.css` | Root components |
| `ScrollBanner.css` | Scroll banner |
| `WelcomeBanner.css` | Welcome banner |
| `YourBranch.css` | Your branch section |

---

## 🛠 Utilities

### `utils/familyTree.js`

Family tree manipulation utilities:

| Function | Purpose |
|----------|---------|
| `updateFamilyBranch(profileId, newBranch, processed)` | Recursively updates branch numbers |
| `updateAncestorReference(profileId, ancestorId, processed)` | Recursively updates ancestor references |

---

## 🖼 Assets (`assets/`)

Static image files for ancestors and UI:

**Ancestor Photos:**
- `alma.jpg`, `ben.jpg`, `bobbie.jpg`, `camedit.jpg`
- `hazel.jpg`, `james.jpg`, `john.jpg`, `joyce.jpg`
- `lorene.jpg`, `loretta.jpg`, `mary.jpg`
- `sylvester.jpg`, `modder.jpg`

**UI Assets:**
- `root.png`, `TreeIcon.png`, `Palette.png`
- `anc1.png`, `ancestors.jpg`, `coloring.jpg`, `coloring2.jpg`
- `binding-dark.png`, `fabric-plaid.png` (textures)

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         App.js                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  AuthProvider                        │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │              Router (HashRouter)             │   │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────────┐   │   │   │
│  │  │  │  Home   │ │ Profile │ │   Forms     │...│   │   │
│  │  │  └─────────┘ └─────────┘ └─────────────┘   │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  supabaseClient  │
                    │  (Supabase API)  │
                    └──────────────────┘
```

---

## 📝 Routes (from App.js)

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Home` | Landing page |
| `/profile` | `Profile` | Current user profile |
| `/profile/:userId` | `Profile` | View specific user |
| `/branch/:branchId` | `FirstBranchPage` | Branch detail |
| `/profileform/:type` | `ProfileForm` | Create/edit profile |
| `/profileform/:type/:userid` | `ProfileForm` | Edit specific profile |
| `/register` | `Register` | Registration |
| `/scrolltree` | `ScrollTree` | Scrollable tree |
| `/yeartree` | `YearTree` | Year-based tree |
| `/ancestor` | `AncestorProfilePage` | Ancestor view |
| `/parentform/:type/:userid` | `ParentForm` | Parent form |
| `/mainancestorform` | `MainAncestorForm` | Main ancestor form |
| `/profileedit/:userId` | `ProfileEdit` | Edit profile |
| `/connectionform/:type/:userid` | `ConnectionForm` | Connections form |
| `/avatar/:userid` | `Avatar` | Avatar upload |
| `/antavatar/:userid` | `AntAvatar` | Alternative avatar |
| `/residenceform/:userid` | `ResidenceForm` | Residence form |
| `/membersearch` | `MemberSearchForm` | Search members |
| `/timeline` | `FamilyTimeline` | Timeline view |
| `/calendartree` | `CalendarTree` | Calendar tree |
| `/createform/:type` | `CreateForm` | Create item |

---

## 🔗 Module Exports

### `components/index.js`
Barrel export for main page components.

### `components/forms/index.js`
Barrel export for all form components.

### `components/partial/index.js`
Barrel export for card/partial components.

---

## 📊 Tech Stack

- **Framework:** React 18
- **Router:** React Router v6 (HashRouter)
- **UI Library:** Ant Design
- **Backend:** Supabase (Auth, Database, Real-time)
- **Styling:** CSS Modules + Global CSS
