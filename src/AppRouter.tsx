import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import Index from "./pages/Index";
import CalendarPage from "./pages/Calendar";
import { NIP19Page } from "./pages/NIP19Page";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import Hashtag from "./pages/Hashtag";
import CommunityPage from "./pages/CommunityPage";
import CreateCommunityPage from "./pages/CreateCommunityPage";
import CommunityBrowsePage from "./pages/CommunityBrowsePage";
import PostDetailPage from "./pages/PostDetailPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/t/:tag" element={<Hashtag />} />
        <Route path="/calendar" element={<CalendarPage />} />
        {/* Community Routes */}
        <Route path="/communities" element={<CommunityBrowsePage />} />
        <Route path="/community/:communityId" element={<CommunityPage />} />
        <Route path="/community/:communityId/post/:postId" element={<PostDetailPage />} />
        <Route path="/create-community" element={<CreateCommunityPage />} />
        {/* NIP-19 route for npub1, note1, naddr1, nevent1, nevent1, nprofile1 */}
        <Route path="/:nip19" element={<NIP19Page />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;