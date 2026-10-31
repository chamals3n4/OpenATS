import { notFound } from "next/navigation";

// Keeps unknown careers addresses out of the dashboard's catch-all, which asks for a sign in
export default function MissingCareersPage() {
  notFound();
}
