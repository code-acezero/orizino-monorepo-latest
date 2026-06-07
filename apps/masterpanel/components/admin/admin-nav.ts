"use client";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  Star,
  Image,
  Settings,
  MessageSquare,
  Layers,
  Home,
  Megaphone,
  Tag,
  Truck,
  Headphones,
  Key,
  KeyRound,
  Bot,
  Gift,
  Percent,
  Palette,
  Globe,
  Smartphone,
  Phone,
  Building2,
  Bug,
  RotateCcw,
  Activity,
  FileText,
  TrendingUp,
  Eye,
  BarChart3,
  Search,
  Type,
  Sparkles,
  Workflow,
  Layout,
  Receipt,
  Mail,
  Send,
  AtSign,
  ShieldCheck,
  ClipboardList,
  Briefcase,
  Users2,
  LayoutGrid,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavChild {
  title: string;
  url: string;
  description?: string;
  keywords?: string;
}

export type StaffSectionKey =
  | "products"
  | "orders"
  | "offline_orders"
  | "customers"
  | "affiliate"
  | "seo"
  | "storefront_ui"
  | "portfolio"
  | "ai"
  | "analytics"
  | "employees"
  | "settings";

export interface AdminNavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  section?: StaffSectionKey;
  description?: string;
  keywords?: string;
  children?: AdminNavChild[];
}

export interface AdminNavSection {
  label: string;
  items: AdminNavItem[];
}

export const adminNav: AdminNavSection[] = [
  // ─────────────────────────────────────────────────────────────────
  // Overview  (shown at /)
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Overview",
    items: [
      {
        title: "Master Panel",
        url: "/",
        icon: LayoutDashboard,
        description: "Section navigator & KPIs",
      },
      {
        title: "Master Control",
        url: "/master",
        icon: LayoutGrid,
        description: "All sections in one sidebar",
        adminOnly: true,
        children: [
          { title: "Overview",     url: "/master" },
          { title: "Sales",        url: "/admin" },
          { title: "SEO",          url: "/seo" },
          { title: "Affiliate",    url: "/affiliate" },
          { title: "Branding",     url: "/brandconfig" },
          { title: "Backend",      url: "/backend" },
          { title: "Settings",     url: "/settings" },
          { title: "Corporate",    url: "/corporate" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // ADMIN  /admin — sales management
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Admin",
    items: [
      // ── Hub pages (section dashboards) ──
      {
        title: "Sales Dashboard",
        url: "/admin",
        icon: LayoutDashboard,
        section: "orders",
        description: "Sales overview & quick stats",
      },
      {
        title: "Products Management",
        url: "/admin/products-hub",
        icon: Package,
        section: "products",
        description: "Catalogue, promotions & showcase",
        children: [
          { title: "Products",        url: "/admin/products" },
          { title: "Categories",      url: "/admin/categories" },
          { title: "Reviews",         url: "/admin/reviews" },
          { title: "Requests",        url: "/admin/requests" },
          { title: "Coupons",         url: "/admin/coupons" },
          { title: "User Promos",     url: "/admin/user-promos" },
          { title: "Delivery Offers", url: "/admin/delivery-offers" },
          { title: "Showcase",        url: "/admin/showcase" },
        ],
      },
      {
        title: "Customer Support",
        url: "/admin/customers-hub",
        icon: Users,
        section: "customers",
        description: "Customers, support & email",
        children: [
          { title: "Customers",          url: "/admin/customers" },
          { title: "Support Inbox",      url: "/admin/support" },
          { title: "Customer Analytics", url: "/admin/customer-analytics" },
          { title: "Live Activity",      url: "/admin/live-activity" },
          { title: "Announcements",      url: "/seo/announcements" },
          { title: "Email Campaigns",    url: "/seo/email-campaigns" },
        ],
      },
      {
        title: "Payments & Couriers",
        url: "/admin/payments-couriers",
        icon: CreditCard,
        section: "orders",
        adminOnly: true,
        description: "Gateways, shipping & couriers",
        children: [
          { title: "Payment Gateways",  url: "/admin/payment-gateways" },
          { title: "Orders",            url: "/admin/orders" },
          { title: "Returns",           url: "/admin/returns" },
          { title: "Shipping",          url: "/admin/shipping" },
          { title: "Couriers",          url: "/admin/couriers" },
          { title: "Hubs & Pricing",    url: "/admin/courier-management" },
          { title: "Delivery Offers",   url: "/admin/delivery-offers" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // SEO  /seo — marketing & search
  // ─────────────────────────────────────────────────────────────────
  {
    label: "SEO",
    items: [
      {
        title: "SEO",
        url: "/seo",
        icon: Search,
        adminOnly: true,
        section: "seo",
        description: "Search optimization, schema & audit",
        keywords: "seo search meta og structured data sitemap robots schema audit",
        children: [
          { title: "Dashboard",           url: "/seo?tab=dashboard" },
          { title: "Pages",               url: "/seo?tab=pages" },
          { title: "Audit",               url: "/seo?tab=audit" },
          { title: "Global & Verification", url: "/seo?tab=global" },
          { title: "Schema library",      url: "/seo?tab=schema" },
          { title: "Tools",               url: "/seo?tab=tools" },
        ],
      },
      {
        title: "Tracking & Ads",
        url: "/seo/tracking",
        icon: TrendingUp,
        adminOnly: true,
        section: "seo",
        description: "Analytics & pixels",
        children: [
          { title: "Facebook Pixel",  url: "/seo/tracking?tab=facebook" },
          { title: "Google Ads",      url: "/seo/tracking?tab=google-ads" },
          { title: "Search Console",  url: "/seo/tracking?tab=search-console" },
          { title: "Ad Setup",        url: "/seo/tracking?tab=ad-setup" },
        ],
      },
      {
        title: "Announcements",
        url: "/seo/announcements",
        icon: Megaphone,
        section: "customers",
        description: "Site-wide banners",
        children: [
          { title: "Announcements", url: "/seo/announcements?tab=announcements" },
          { title: "Popups",        url: "/seo/announcements?tab=popups" },
        ],
      },
      {
        title: "Email Provider",
        url: "/seo/email-provider",
        icon: KeyRound,
        adminOnly: true,
        section: "customers",
        description: "API keys, webhooks, sender identity",
        keywords: "resend api key webhook smtp",
        children: [
          { title: "Sender identity", url: "/seo/email-provider?tab=sender" },
          { title: "Senders",         url: "/seo/email-provider?tab=senders" },
          { title: "API & webhooks",  url: "/seo/email-provider?tab=keys" },
          { title: "Send test",       url: "/seo/email-provider?tab=test" },
          { title: "Stats",           url: "/seo/email-provider?tab=stats" },
        ],
      },
      {
        title: "Subscribers",
        url: "/seo/email-subscribers",
        icon: AtSign,
        section: "customers",
        description: "Newsletter signups",
      },
      {
        title: "Campaigns",
        url: "/seo/email-campaigns",
        icon: Send,
        section: "customers",
        description: "Bulk email blasts",
      },
      {
        title: "Templates",
        url: "/seo/email-templates",
        icon: FileText,
        section: "customers",
        description: "Reusable designs",
      },
      {
        title: "Automations",
        url: "/seo/email-automations",
        icon: Workflow,
        section: "customers",
        description: "Event-driven emails",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // AFFILIATE  /affiliate
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Affiliate",
    items: [
      {
        title: "Affiliate Hub",
        url: "/affiliate",
        icon: Briefcase,
        section: "affiliate",
        adminOnly: true,
        description: "Partner programs, referral links & commissions",
        keywords: "affiliate referral commission payout marketing hub",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // BRANDCONFIG  /brandconfig — branding & UI
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Brand Config",
    items: [
      {
        title: "Branding",
        url: "/brandconfig",
        icon: Palette,
        adminOnly: true,
        section: "storefront_ui",
        description: "Theme & brand identity",
        children: [
          { title: "Overview",         url: "/brandconfig" },
          { title: "Logo & icon",      url: "/brandconfig?tab=logo" },
          { title: "Shape & effects",  url: "/brandconfig?tab=shape" },
          { title: "Color filter",     url: "/brandconfig?tab=color" },
          { title: "Typography",       url: "/brandconfig?tab=typography" },
          { title: "Brand voice",      url: "/brandconfig?tab=voice" },
          { title: "Site theme",       url: "/brandconfig?tab=theme" },
        ],
      },
      {
        title: "Appearance",
        url: "/brandconfig/appearance",
        icon: Layout,
        adminOnly: true,
        section: "storefront_ui",
        description: "Typography & layout for every surface",
        keywords: "appearance typography layout fonts storefront profile auth signin",
        children: [
          { title: "Storefront",           url: "/brandconfig/appearance?tab=storefront" },
          { title: "Product details",      url: "/brandconfig/appearance?tab=product" },
          { title: "Profile & Settings",   url: "/brandconfig/appearance?tab=profile" },
          { title: "Sign-in / Sign-up",    url: "/brandconfig/appearance?tab=auth" },
        ],
      },
      {
        title: "Banners",
        url: "/brandconfig/banners",
        icon: Image,
        section: "storefront_ui",
        description: "Hero & promo banners",
      },
      {
        title: "Footer",
        url: "/brandconfig/footer",
        icon: Layers,
        section: "storefront_ui",
        adminOnly: true,
        description: "Footer content",
      },
      {
        title: "Mobile UI",
        url: "/brandconfig/mobile-ui",
        icon: Smartphone,
        section: "storefront_ui",
        adminOnly: true,
        description: "Mobile-only widgets",
      },
      {
        title: "Landing Page",
        url: "/brandconfig/landing",
        icon: Globe,
        adminOnly: true,
        section: "portfolio",
        description: "Landing page builder",
        children: [
          { title: "Content",  url: "/brandconfig/landing?tab=content" },
          { title: "Sections", url: "/brandconfig/landing?tab=sections" },
        ],
      },
      {
        title: "Home Page",
        url: "/brandconfig/home",
        icon: Home,
        adminOnly: true,
        section: "portfolio",
        description: "Home page builder",
        children: [
          { title: "Dashboard",         url: "/brandconfig/home?tab=dashboard" },
          { title: "Analytics",         url: "/brandconfig/home?tab=analytics" },
          { title: "Section order",     url: "/brandconfig/home?tab=section-order" },
          { title: "Category sections", url: "/brandconfig/home?tab=cat-sections" },
          { title: "Sales",             url: "/brandconfig/home?tab=sales" },
          { title: "New arrivals",      url: "/brandconfig/home?tab=new-arrivals" },
          { title: "Layout & style",    url: "/brandconfig/home?tab=layout" },
        ],
      },
      {
        title: "CMS Pages",
        url: "/brandconfig/cms-pages",
        icon: FileText,
        section: "portfolio",
        adminOnly: true,
        description: "Custom pages",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // BACKEND  /backend — API & system controls
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Backend",
    items: [
      {
        title: "DB Health",
        url: "/backend/db-health",
        icon: Activity,
        section: "settings",
        adminOnly: true,
        description: "Disk IO, seq scans, cron runs & alerts",
      },
      {
        title: "Debug",
        url: "/backend/debug",
        icon: Bug,
        adminOnly: true,
        section: "settings",
        description: "Developer tools",
        children: [
          { title: "Push",           url: "/backend/debug?tab=push" },
          { title: "Calls",          url: "/backend/debug?tab=calls" },
          { title: "Edge functions", url: "/backend/debug?tab=edge" },
          { title: "Realtime",       url: "/backend/debug?tab=realtime" },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // SETTINGS  /settings — site configuration
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Settings",
    items: [
      {
        title: "General Settings",
        url: "/settings",
        icon: Settings,
        adminOnly: true,
        section: "settings",
        description: "Global preferences",
        children: [
          { title: "General",    url: "/settings?tab=general" },
          { title: "Customizer", url: "/settings?tab=customizer" },
          { title: "Currency",   url: "/settings?tab=currency" },
        ],
      },
      {
        title: "AI Agent",
        url: "/settings/ai-settings",
        icon: Bot,
        section: "ai",
        adminOnly: true,
        description: "AI assistant config",
      },
      {
        title: "Recommendations",
        url: "/settings/recommendations",
        icon: Sparkles,
        section: "ai",
        adminOnly: true,
        description: "Discover engine & AI rerank",
        keywords: "recommendations discover personalization ai rerank",
      },
      {
        title: "Call Center",
        url: "/settings/call-settings",
        icon: Phone,
        section: "settings",
        adminOnly: true,
        description: "Voice / call routing",
      },
      {
        title: "Telegram",
        url: "/settings/telegram",
        icon: Send,
        section: "settings",
        adminOnly: true,
        description: "Bot chats & notification routing",
        keywords: "telegram bot chat notifications",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // CORPORATE  /corporate — teams & staff
  // ─────────────────────────────────────────────────────────────────
  {
    label: "Corporate",
    items: [
      {
        title: "Teams",
        url: "/corporate/teams",
        icon: Users2,
        section: "employees",
        adminOnly: true,
        description: "Create teams, assign members & section access",
        keywords: "teams groups staff access sections permissions",
      },
      {
        title: "My Team",
        url: "/corporate/my-team",
        icon: Briefcase,
        description: "View your team membership and section access",
        keywords: "my team membership sections access teammates",
      },
      {
        title: "Employees",
        url: "/corporate/employees",
        icon: Users,
        section: "employees",
        adminOnly: true,
        description: "Team members, presets & section access",
        keywords: "employees staff team roles access sections permissions",
        children: [
          { title: "All employees", url: "/corporate/employees?tab=members" },
          { title: "Staff",         url: "/corporate/staff" },
          { title: "Audit Log",     url: "/corporate/audit-log" },
        ],
      },
    ],
  },
];

export const allAdminItems: AdminNavItem[] = adminNav.flatMap((s) =>
  s.items.map((i) => ({ ...i, keywords: `${i.keywords ?? ""} ${s.label}`.trim() }))
);

export const allAdminDestinations: Array<{
  title: string;
  url: string;
  section: string;
  parent?: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  description?: string;
  keywords?: string;
}> = adminNav.flatMap((s) =>
  s.items.flatMap((i) => [
    {
      title: i.title,
      url: i.url,
      section: s.label,
      icon: i.icon,
      adminOnly: i.adminOnly,
      description: i.description,
      keywords: i.keywords,
    },
    ...(i.children ?? []).map((c) => ({
      title: c.title,
      url: c.url,
      section: s.label,
      parent: i.title,
      icon: i.icon,
      adminOnly: i.adminOnly,
      description: c.description,
      keywords: c.keywords,
    })),
  ])
);

export const mobilePrimary: Array<{ title: string; url: string; icon: LucideIcon; section?: string }> = [
  { title: "Panel",     url: "/",                          icon: LayoutDashboard },
  { title: "Sales",     url: "/admin",                     icon: ShoppingCart,    section: "orders" },
  { title: "Products",  url: "/admin/products-hub",        icon: Package,         section: "products" },
  { title: "Customers", url: "/admin/customers-hub",       icon: Users,           section: "customers" },
  { title: "Support",   url: "/admin/support",             icon: Headphones,      section: "customers" },
  { title: "Settings",  url: "/settings",                  icon: Settings,        section: "settings" },
];

export { Eye, BarChart3, Search, Type, Sparkles, Layout, Receipt, Mail, Send, AtSign, ShieldCheck, ClipboardList, Briefcase };
