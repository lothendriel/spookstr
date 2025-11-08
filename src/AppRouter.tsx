import { lazy } from "react";
import { BrowserRouter, Route, Routes, useParams } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import Index from "./pages/Index";

// Lazy load less frequently accessed pages
const CalendarPage = lazy(() => import("./pages/Calendar"));
const NIP19Page = lazy(() => import("./pages/NIP19Page").then(m => ({ default: m.NIP19Page })));
const Notifications = lazy(() => import("./pages/Notifications"));
const RelaySettings = lazy(() => import("./pages/RelaySettings"));
const UserSettings = lazy(() => import("./pages/UserSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Hashtag = lazy(() => import("./pages/Hashtag"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const CreateCommunityPage = lazy(() => import("./pages/CreateCommunityPage"));
const CommunityBrowsePage = lazy(() => import("./pages/CommunityBrowsePage"));
const PostDetailPage = lazy(() => import("./pages/PostDetailPage"));
const CommunityPostDetailPage = lazy(() => import("./pages/CommunityPostDetailPage"));
const ModeratorPanel = lazy(() => import("./components/ModerationPanel").then(m => ({ default: m.ModerationPanel })));
const ParanormalMapPage = lazy(() => import("./pages/ParanormalMap"));

// Wrapper component to pass route params to ModerationPanel
function ModeratorPanelWrapper() {
  const { communityId } = useParams<{ communityId: string }>();

  if (!communityId) {
    return <div>Community ID not found</div>;
  }

  return <ModerationPanel communityId={communityId} />;
}


export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings/relays" element={<RelaySettings />} />
        <Route path="/settings/user" element={<UserSettings />} />
        <Route path="/t/:tag" element={<Hashtag />} />
        <Route path="/calendar" element={<CalendarPage />} />

        {/* Community Routes */}
        <Route path="/communities" element={<CommunityBrowsePage />} />
        <Route path="/community/:communityId" element={<CommunityPage />} />
        <Route path="/community/:communityId/post/:postId" element={<CommunityPostDetailPage />} />
        <Route path="/community/:communityId/moderate" element={
          <ModeratorPanelWrapper />
        } />
        <Route path="/create-community" element={<CreateCommunityPage />} />
        <Route path="/create-community/:communityId" element={<CreateCommunityPage />} />
        <Route path="/paranormal-map" element={<ParanormalMapPage />} />
        {/* NIP-19 route for npub1, note1, naddr1, nevent1, nevent1, nprofile1 */}
        <Route path="/:nip19" element={<NIP19Page />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;