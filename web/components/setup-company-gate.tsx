"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useCompany } from "@/hooks/use-api";

const ALLOWED_WITHOUT_COMPANY = /^\/settings\/general(\/|$)/;

export function SetupCompanyGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, isPending, isSuccess, isError } = useCompany();

  useEffect(() => {
    if (isPending || isError || !isSuccess) return;
    if (data?.data != null) return;
    if (pathname && ALLOWED_WITHOUT_COMPANY.test(pathname)) return;
    router.replace("/settings/general");
  }, [data, isPending, isSuccess, isError, pathname, router]);

  return <>{children}</>;
}
