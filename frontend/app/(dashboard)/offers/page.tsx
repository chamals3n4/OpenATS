import { RoleGuard } from "@/components/guards/role-guard";
import OffersPageClient from "./_components/offers-client";

export default function OffersPage() {
  return (
    <RoleGuard allow="manager" redirectTo="/">
      <OffersPageClient />
    </RoleGuard>
  );
}
