import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import Index from "./pages/Index";

// Lazy load less frequently accessed pages
const CalendarPage = lazy(() => import("./pages/Calendar"));
const NIP19Page = lazy(() => import("./pages/NIP19Page").then(m => ({ default: m.NIP19Page })));
const Notifications = lazy(() => import("./pages/Notifications"));
const RelaySettings = lazy(() => import("./pages/RelaySettings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Hashtag = lazy(() => import("./pages/Hashtag"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const CreateCommunityPage = lazy(() => import("./pages/CreateCommunityPage"));
const CommunityBrowsePage = lazy(() => import("./pages/CommunityBrowsePage"));
const PostDetailPage = lazy(() => import("./pages/PostDetailPage"));
const CommunityPostDetailPage = lazy(() => import("./pages/CommunityPostDetailPage"));
const ModeratorPanel = lazy(() => import("./components/communities/ModeratorPanel").then(m => ({ default: m.ModeratorPanel })));

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings/relays" element={<RelaySettings />} />
        <Route path="/t/:tag" element={<Hashtag />} />
        <Route path="/calendar" element={<CalendarPage />} />
        {/* Community Routes */}
        <Route path="/communities" element={<CommunityBrowsePage />} />
        <Route path="/community/:communityId" element={<CommunityPage />} />
        <Route path="/community/:communityId/post/:postId" element={<CommunityPostDetailPage />} />
        <Route path="/community/:communityId/moderate" element={<ModeratorPanel />} />
        <Route path="/create-community" element={<CreateCommunityPage />} />
        <Route path="/create-community/:communityId" element={<CreateCommunityPage />} />
        {/* NIP-19 route for npub1, note1, naddr1, nevent1, nevent1, nprofile1 */}
        <Route path="/:nip19" element={<NIP19Page />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;