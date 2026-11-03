import { useEffect, useState } from "react";
import { Home } from "@/pages/Home";
import { AdminApp } from "@/pages/admin/AdminApp";
import { AmazonReports } from "@/pages/AmazonReports";

/**
 * Lightweight hash-based router.
 *
 * GitHub Pages serves static files, so client-side routing must avoid
 * server-side rewrites. Using `#/admin` (rather than a `/admin` path) means
 * the admin screen works correctly after a real GitHub Pages deployment
 * without any extra server configuration, and it is never linked from the
 * public homepage.
 */
export default function App() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (hash.startsWith("#/admin")) {
    return <AdminApp />;
  }
  if (hash.startsWith("#/amazon")) {
    return <AmazonReports />;
  }
  return <Home />;
}
