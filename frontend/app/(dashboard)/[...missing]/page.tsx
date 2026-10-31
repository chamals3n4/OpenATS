import { notFound } from "next/navigation";

// Sends unknown addresses to (dashboard)/not-found, so the sidebar stays
export default function MissingDashboardPage() {
  notFound();
}
