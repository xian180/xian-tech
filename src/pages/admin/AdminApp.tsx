import { useState } from "react";
import { isAuthenticated } from "@/auth/adminAuth";
import { AdminLogin } from "./AdminLogin";
import { AdminDashboard } from "./AdminDashboard";

export function AdminApp() {
  const [authed, setAuthed] = useState(isAuthenticated());

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />;
  }
  return <AdminDashboard onLogout={() => setAuthed(false)} />;
}
