import {
  RouterProvider,
  Outlet,
  createHashRouter,
  Route,
  createRoutesFromElements,
} from 'react-router-dom';
import { Layout as LayoutAnt } from 'antd';
import {
  AntAvatar,
  Avatar,
  Hero,
  Home,
  Navbar,
  NavButton,
  Profile,
  ProfileEdit,
  Register,
  ScrollTree,
  Welcome,
  YearTree,
} from './components/index';
import {
  ConnectionForm,
  CreateForm,
  MainAncestorForm,
  MemberSearchForm,
  ResidenceForm,
  ParentForm,
  ProfileForm,
} from './components/forms/index';
import { AuthProvider } from './useSession';
import Test from './components/Test';

const { Content } = LayoutAnt;

//<Route path="/profileform/:type" element={<ProfileForm />} />

const routing = createHashRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />}>
      <Route path="/" element={<Home />} />
      <Route path="/profile" element={<Profile />} />

      <Route path="/profileform/:type" element={<ProfileForm />}>
        <Route path=":userid" element={<ProfileForm />} />
      </Route>

      <Route path="/register" element={<Register />} />
      <Route path="/scrolltree" element={<ScrollTree />} />
      <Route path="/yeartree" element={<YearTree />} />
      <Route path="/hero" element={<Hero />} />
      <Route path="/test" element={<Test />} />

      <Route path="/welcome" element={<Welcome />} />
      <Route path="/parentform/:userid" element={<ParentForm />} />
      <Route path="/mainancestorform" element={<MainAncestorForm />} />

      <Route path="profile">
        <Route path=":userId" element={<Profile />} />
      </Route>

      <Route path="profileedit">
        <Route path=":userId" element={<ProfileEdit />} />
      </Route>

      <Route path="connectionform/:type/:userid" element={<ConnectionForm />} />
      <Route path="avatar/:userid" element={<Avatar />} />
      <Route path="antavatar/:userid" element={<AntAvatar />} />
      <Route path="residenceform/:userid" element={<ResidenceForm />} />

      <Route path="membersearch" element={<MemberSearchForm />} />

      <Route path="createform/:type" element={<CreateForm />} />
    </Route>
  )
);

function App() {
  return <RouterProvider router={routing} />;
}

export default App;

function Layout() {
  return (
    <AuthProvider>
      <LayoutAnt>
        <Content style={{ minHeight: '100vh' }}>
          <Navbar />
          <Outlet />
          <NavButton />
        </Content>
      </LayoutAnt>
    </AuthProvider>
  );
}
