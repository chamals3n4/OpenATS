import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

/** Only the careers pages are for search engines */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/careers", disallow: "/" },
    sitemap: `${appUrl()}/careers/sitemap.xml`,
  };
}
