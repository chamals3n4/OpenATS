import { ManagerGuard } from "@/components/guards/manager-guard";
import OffersPageClient from "./_components/offers-client";

export default function OffersPage() {
  return (
    <ManagerGuard redirectTo="/">
      <OffersPageClient />
    </ManagerGuard>
  );
}
