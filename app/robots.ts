import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl().origin;
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Nothing here is secret — these routes are already behind auth — but
      // they are worthless in an index and waste crawl budget on a new site.
      disallow: ["/api/", "/dashboard/", "/admin/", "/verify-email"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
