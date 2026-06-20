import { createHashRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./useSession";

import {
  Avatar,
  AntAvatar,
  ProfileEdit,
  Register,
  ScrollTree,
  YearTree,
  FirstBranchPage,
  AncestorProfilePage,
} from "./components/index";

import {
  ProfileWizard,
  ParentForm,
  MainAncestorForm,
  ConnectionForm,
  ResidenceForm,
  CreateForm,
} from "./components/forms/index";

import FamilyTimeline from "./components/timeline/FamilyTimeline";
import CalendarTree from "./components/CalendarTree";
import NewLayout from "./newComponents/NewLayout";
import NewHome from "./newComponents/NewHome";
import InteractiveFormPage from "./newComponents/InteractiveFormPage";
import ApiTestPage from "./newComponents/ApiTestPage";
import NewProfile from "./newComponents/NewProfile";
import Onboarding from "./newComponents/Onboarding";
import NotificationsPage from "./newComponents/NotificationsPage";
import RecentMilestonesPage from "./newComponents/RecentMilestonesPage";
import RecentMediaPage from "./newComponents/RecentMediaPage";
import RecentGuestbookPage from "./newComponents/RecentGuestbookPage";
import InteractiveMemberSearch from "./newComponents/InteractiveMemberSearch";

const router = createHashRouter([
  {
    path: "/",
    element: <AuthProvider><NewLayout /></AuthProvider>,
    children: [
      { index: true, element: <NewHome /> },

      { path: "interactive-form/:mode/:anchorId", element: <InteractiveFormPage /> },
      { path: "test-api", element: <ApiTestPage /> },
      { path: "onboarding", element: <Onboarding /> },
      { path: "profile", element: <NewProfile /> },
      { path: "profile/:userId", element: <NewProfile /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "milestones", element: <RecentMilestonesPage /> },
      { path: "media", element: <RecentMediaPage /> },
      { path: "guestbook", element: <RecentGuestbookPage /> },
      { path: "branch/:branchId", element: <FirstBranchPage /> },
      {
        path: "profileform/:type",
        children: [
          { index: true, element: <ProfileWizard /> },
          { path: ":userid", element: <ProfileWizard /> },
        ],
      },
      { path: "register", element: <Register /> },
      { path: "scrolltree", element: <ScrollTree /> },
      { path: "yeartree", element: <YearTree /> },
      { path: "ancestor", element: <AncestorProfilePage /> },
      { path: "parentform/:type/:userid", element: <ParentForm /> },
      { path: "mainancestorform", element: <MainAncestorForm /> },
      { path: "profileedit/:userId", element: <ProfileEdit /> },
      { path: "connectionform/:type/:userid", element: <ConnectionForm /> },
      { path: "avatar/:userid", element: <Avatar /> },
      { path: "antavatar/:userid", element: <AntAvatar /> },
      { path: "residenceform/:userid", element: <ResidenceForm /> },
      { path: "membersearch", element: <InteractiveMemberSearch /> },
      { path: "timeline", element: <FamilyTimeline /> },
      { path: "tree", element: <CalendarTree /> },
      { path: "createform/:type", element: <CreateForm /> },
    ],
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  }
});

function App() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}

export default App;
