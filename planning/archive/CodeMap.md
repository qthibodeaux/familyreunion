📂 Directory & File Map
Entry Points & Configuration


index.js
 — Entry point rendering the React App.


App.js
 — Defines layouts, registers the HashRouter routes, and wraps the app in the global authentication context provider.


package.json
 — Lists dependencies including React 18, React Router v6, Ant Design (AntD), AntD Mobile, and Supabase.
Authentication & State


supabaseClient.js
 — Initializes the Supabase client.


useSession.js
 — Context provider (AuthProvider) and custom hook (useSession) managing user login sessions, redirecting incomplete profiles, and handling real-time database updates.
Key Components (

src/components
)
Pages: 

Home.js
 (landing screen), 

Profile.js
, 

ProfileEdit.js
, and 

Register.js
.
Visualizations: 

FamilyTimeline.js
 (historical timeline), 

CalendarTree.js
 (calendar-style tree), and 

ScrollTree.js
 (horizontal scrollable tree).
Helper Components: 

FirstBranch.js
 (displays member grid for the first family branch), and 

Test.js
 (handles parallax containers).
Forms (

src/components/forms
)
Handles data entry, including 

ProfileForm.js
, 

ParentForm.js
, 

MainAncestorForm.js
, and 

ResidenceForm.js
.
Database & Supabase (

supabase/
)


config.toml
 — Local development settings.


20240623194638_usermanagement.sql
 — Migration schema creating the tables, functions, and Row-Level Security (RLS) policies.
🔄 Data & Authentication Flow
Auth State: <App /> mounts <AuthProvider /> -> listens to Supabase authentication state -> fetches/synchronizes profile data in real-time.
Routing: React Router maps paths like /profile/:userId or /yeartree to their components, with route guards check-in using <RequireAuth />.
Data Mutations: Forms interact directly with local Supabase tables through the 

supabaseClient.js
 interface.