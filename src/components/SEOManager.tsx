import { useEffect } from "react";
import { useLocation } from "react-router-dom";

type SeoConfig = {
  title: string;
  description: string;
  indexable: boolean;
};

const BASE_TITLE = "GlimseConnect";
const DEFAULT_DESCRIPTION =
  "The next-generation stranger video platform with AI safety, smart matching, and a social experience unlike anything you've seen before.";

const ROUTE_SEO: Record<string, SeoConfig> = {
  "/": {
    title: "GlimseConnect — Meet Anyone. Anywhere. Instantly.",
    description: DEFAULT_DESCRIPTION,
    indexable: true,
  },
  "/about": {
    title: "About GlimseConnect",
    description:
      "Learn the story and mission behind GlimseConnect, the safer way to meet new people through live video.",
    indexable: true,
  },
  "/plans": {
    title: "Plans & Pricing — GlimseConnect",
    description:
      "Explore Free, Premium, and VIP plans on GlimseConnect and choose the features that fit your experience.",
    indexable: true,
  },
  "/faq": {
    title: "FAQ — GlimseConnect",
    description:
      "Get answers to common questions about GlimseConnect, including safety, privacy, streaming, and subscriptions.",
    indexable: true,
  },
  "/contact": {
    title: "Contact GlimseConnect",
    description:
      "Reach out to the GlimseConnect team for support, privacy inquiries, and general questions.",
    indexable: true,
  },
  "/safety": {
    title: "Safety Center — GlimseConnect",
    description:
      "Understand GlimseConnect safety tools, reporting options, and best practices for safer conversations.",
    indexable: true,
  },
  "/privacy": {
    title: "Privacy Policy — GlimseConnect",
    description:
      "Read the GlimseConnect Privacy Policy and how we handle your data, sessions, and platform security.",
    indexable: true,
  },
  "/terms": {
    title: "Terms of Service — GlimseConnect",
    description:
      "Review the GlimseConnect Terms of Service, platform rules, and legal conditions for using the app.",
    indexable: true,
  },
  "/community-guidelines": {
    title: "Community Guidelines — GlimseConnect",
    description:
      "Learn GlimseConnect community standards and expected behavior to keep the platform respectful and safe.",
    indexable: true,
  },
  "/cookie-policy": {
    title: "Cookie Policy — GlimseConnect",
    description:
      "See how GlimseConnect uses cookies and tracking technologies and how to manage cookie preferences.",
    indexable: true,
  },
  "/login": {
    title: "Login — GlimseConnect",
    description: "Log in to your GlimseConnect account.",
    indexable: false,
  },
  "/register": {
    title: "Register — GlimseConnect",
    description: "Create your GlimseConnect account and start streaming.",
    indexable: false,
  },
  "/confirm-email": {
    title: "Confirm Email — GlimseConnect",
    description:
      "Confirm your email address to activate your GlimseConnect account.",
    indexable: false,
  },
  "/confirm-otp": {
    title: "Confirm OTP — GlimseConnect",
    description: "Enter your one-time code to securely continue.",
    indexable: false,
  },
};

const DYNAMIC_NO_INDEX_PREFIXES = [
  "/stream",
  "/chat",
  "/groups",
  "/profile",
  "/explore",
  "/settings",
  "/notifications",
  "/blocked-users",
  "/checkout",
];

const getSeoConfig = (pathname: string): SeoConfig => {
  if (ROUTE_SEO[pathname]) return ROUTE_SEO[pathname];

  if (DYNAMIC_NO_INDEX_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return {
      title: `${BASE_TITLE} App`,
      description: "Private GlimseConnect app area.",
      indexable: false,
    };
  }

  return {
    title: `${BASE_TITLE} — Page Not Found`,
    description:
      "The page you're looking for could not be found on GlimseConnect.",
    indexable: false,
  };
};

const upsertMetaTag = (
  attribute: "name" | "property",
  key: string,
  content: string,
) => {
  let tag = document.head.querySelector(
    `meta[${attribute}="${key}"]`,
  ) as HTMLMetaElement | null;

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
};

const SEOManager = () => {
  const location = useLocation();

  useEffect(() => {
    const { pathname } = location;
    const seo = getSeoConfig(pathname);
    const canonicalUrl = `${window.location.origin}${pathname}`;

    document.title = seo.title;

    upsertMetaTag("name", "description", seo.description);
    upsertMetaTag("property", "og:title", seo.title);
    upsertMetaTag("property", "og:description", seo.description);
    upsertMetaTag("property", "og:url", canonicalUrl);
    upsertMetaTag("name", "twitter:title", seo.title);
    upsertMetaTag("name", "twitter:description", seo.description);
    upsertMetaTag(
      "name",
      "robots",
      seo.indexable ? "index, follow" : "noindex, nofollow",
    );

    let canonical = document.head.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;

    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }

    canonical.setAttribute("href", canonicalUrl);
  }, [location]);

  return null;
};

export default SEOManager;
