import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { realtimeService } from "@/lib/realtime";
import { supabase, type Notification, type Profile } from "@/lib/supabase";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PublicRoute from "@/components/auth/PublicRoute";
import CookieConsent from "@/components/CookieConsent";
import IncomingCallOverlay from "@/components/IncomingCallOverlay";
import CallFloatingWidget from "@/components/CallFloatingWidget";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ConfirmEmail from "./pages/ConfirmEmail";
import Stream from "./pages/Stream";
import StreamHistory from "./pages/StreamHistory";
import Chat from "./pages/Chat";
import ChatDetail from "./pages/ChatDetail";
import GroupChatDetail from "./pages/GroupChatDetail";
import CreateGroup from "./pages/CreateGroup";
import FriendStream from "./pages/FriendStream";
import GroupStream from "./pages/GroupStream";
import ProfilePage from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import Explore from "./pages/Explore";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

// New pages
import Plans from "./pages/Plans";
import About from "./pages/About";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import SafetyCenter from "./pages/SafetyCenter";
import BlockedUsers from "./pages/BlockedUsers";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CommunityGuidelines from "./pages/CommunityGuidelines";
import CookiePolicy from "./pages/CookiePolicy";
import Checkout from "./pages/Checkout";

const queryClient = new QueryClient();

const AppInner = () => {
  const { checkAuth, user } = useAuthStore();
  const { addNotification, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Global real-time notification subscription
  useEffect(() => {
    if (!user) return;

    // Fetch existing notifications on login
    fetchNotifications(user.id);

    // Subscribe to new notifications in real-time
    realtimeService.subscribeToNotifications(user.id, async (raw: unknown) => {
      const notif = raw as Notification;
      // Fetch from_user profile if present
      if (notif.from_user_id) {
        const { data: fromUser } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", notif.from_user_id)
          .maybeSingle();
        notif.from_user = (fromUser as Profile) || undefined;
      }
      addNotification(notif);
    });

    // Track online presence
    realtimeService.trackPresence(user.id);

    return () => {
      realtimeService.unsubscribeFromNotifications();
      realtimeService.untrackPresence();
    };
  }, [user, addNotification, fetchNotifications]);

  return (
    <>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Landing />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/safety" element={<SafetyCenter />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/community-guidelines" element={<CommunityGuidelines />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />

        {/* Auth pages – redirect to /stream if already logged in */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/confirm-email"
          element={
            <PublicRoute>
              <ConfirmEmail />
            </PublicRoute>
          }
        />

        {/* Protected pages */}
        <Route
          path="/stream"
          element={
            <ProtectedRoute>
              <Stream />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stream/history"
          element={
            <ProtectedRoute>
              <StreamHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:userId"
          element={
            <ProtectedRoute>
              <ChatDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups/create"
          element={
            <ProtectedRoute>
              <CreateGroup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups/:groupId"
          element={
            <ProtectedRoute>
              <GroupChatDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stream/friend/:odierUserId"
          element={
            <ProtectedRoute>
              <FriendStream />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stream/group/:groupId"
          element={
            <ProtectedRoute>
              <GroupStream />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/edit"
          element={
            <ProtectedRoute>
              <ProfileEdit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:username"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/explore"
          element={
            <ProtectedRoute>
              <Explore />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/blocked-users"
          element={
            <ProtectedRoute>
              <BlockedUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout/:plan"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
      <CookieConsent />
      <IncomingCallOverlay />
      <CallFloatingWidget />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
