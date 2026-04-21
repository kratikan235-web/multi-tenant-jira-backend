import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./state/auth/ProtectedRoute";
import { AppLayout } from "./ui/layout/AppLayout";
import { LoginPage } from "./ui/pages/LoginPage";
import { SignupPage } from "./ui/pages/SignupPage";
import { AcceptInvitePage } from "./ui/pages/AcceptInvitePage";
import { AuthRedirectPage } from "./ui/pages/AuthRedirectPage";
import { DashboardPage } from "./ui/pages/DashboardPage";
import { ProjectsPage } from "./ui/pages/ProjectsPage";
import { TasksPage } from "./ui/pages/TasksPage";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  { path: "/signup", element: <SignupPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/accept-invite", element: <AcceptInvitePage /> },
  { path: "/auth-redirect", element: <AuthRedirectPage /> },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/projects", element: <ProjectsPage /> },
      { path: "/tasks", element: <TasksPage /> }
    ]
  }
]);

