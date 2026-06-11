"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

//import { useCompany, useDepartments } from "@/hooks/use-api";
import { useCompany, useDepartments } from "@/hooks/queries/use-company";

const ALLOWED_WITHOUT_SETUP = /^\/settings\/general(\/|$)/;

export function SetupCompanyGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: companyData, isSuccess: companyReady } = useCompany();
  const { data: deptData, isSuccess: deptReady } = useDepartments();

  const hasCompany = companyData?.data != null;
  const hasDepartments = (deptData?.data?.length ?? 0) > 0;
  const needsSetup =
    companyReady && deptReady && (!hasCompany || !hasDepartments);

  useEffect(() => {
    if (!needsSetup) return;
    if (pathname && ALLOWED_WITHOUT_SETUP.test(pathname)) return;
    router.replace("/settings/general");
  }, [needsSetup, pathname, router]);

  return <>{children}</>;
}
