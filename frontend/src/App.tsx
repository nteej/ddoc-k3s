
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import LoginPage from "@/components/LoginPage";
import SignupPage from "@/components/SignupPage";
import ForgotPasswordPage from "@/components/ForgotPasswordPage";
import ResetPasswordPage from "@/components/ResetPasswordPage";
import ProtectedLayout from "@/components/ProtectedLayout";
import DocumentsPage from "@/components/DocumentsPage";
import SettingsPage from "@/components/SettingsPage";
import ProfilePage from "@/components/ProfilePage";
import BatchPage from "@/components/BatchPage";
import FilesPage from "@/components/FilesPage";
import ApiPage from "@/components/ApiPage";
import GeneratePage from "@/components/GeneratePage";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import ArchitecturePage from "./pages/ArchitecturePage";
import OrganizationPage from "./pages/OrganizationPage";
import InvitationPage from "./pages/InvitationPage";
import ApiKeysPage from "./pages/ApiKeysPage";
import WebhooksPage from "./pages/WebhooksPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/" element={<LandingPage />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
            <Route path="/documents" element={
              <ProtectedLayout>
                <DocumentsPage />
              </ProtectedLayout>
            } />
            <Route path="/batch" element={
              <ProtectedLayout>
                <BatchPage />
              </ProtectedLayout>
            } />
            <Route path="/files" element={
              <ProtectedLayout>
                <FilesPage />
              </ProtectedLayout>
            } />
            <Route path="/generate" element={
              <ProtectedLayout>
                <GeneratePage />
              </ProtectedLayout>
            } />
            <Route path="/api" element={
              <ProtectedLayout>
                <ApiPage />
              </ProtectedLayout>
            } />
            <Route path="/settings" element={
              <ProtectedLayout>
                <SettingsPage />
              </ProtectedLayout>
            } />
            <Route path="/profile" element={
              <ProtectedLayout>
                <ProfilePage />
              </ProtectedLayout>
            } />
            <Route path="/organization" element={
              <ProtectedLayout>
                <OrganizationPage />
              </ProtectedLayout>
            } />
            <Route path="/invitations/:token" element={<InvitationPage />} />
            <Route path="/api-keys" element={
              <ProtectedLayout>
                <ApiKeysPage />
              </ProtectedLayout>
            } />
            <Route path="/webhooks" element={
              <ProtectedLayout>
                <WebhooksPage />
              </ProtectedLayout>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
