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
  type LucideIcon,
} from "lucide-react";

export interface AdminNavChild {
  title: string;
  url: string;
  description?: string;
  keywords?: string;
}

/**
 * `section` is the staff_sections.key this item belongs to.
 * useStaffSections().hasAccess(section) decides whether non-admin staff
 * see the item. Items with no `section` are always shown to admins
 * (and follow the legacy `adminOnly` rule for moderators).
 *
 * Known keys: products, orders, offline_orders, customers, affiliate,
 * seo, storefront_ui, portfolio, ai, analytics, employees, settings.
 */
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
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard, description: "KPIs and activity" },
      { title: "Live Activity", url: "/live-activity", icon: Activity, adminOnly: true, section: "analytics", description: "Realtime ops dashboard", keywords: "live activity realtime orders support visitors" },
    ],
  },
  {
    label: "Catalog",
    items: [
      {
        title: "Products",
        url: "/products",
        icon: Package,
        section: "products",
        description: "Inventory & variants",
        children: [
          { title: "All products", url: "/products?tab=list" },
          { title: "Product settings", url: "/products?tab=settings" },
          { title: "Commerce", url: "/products?tab=commerce" },
        ],
      },
      { title: "Categories", url: "/categories", icon: FolderTree, section: "products", description: "Product taxonomy" },
      { title: "Reviews", url: "/reviews", icon: Star, section: "products", description: "Customer reviews" },
      {
        title: "Requests",
        url: "/requests",
        icon: MessageSquare,
        adminOnly: true,
        section: "products",
        description: "Product requests",
        children: [
          { title: "Requests", url: "/requests?tab=requests" },
          { title: "Imports", url: "/requests?tab=imports" },
        ],
      },
      {
        title: "Showcase",
        url: "/showcase",
        icon: Layers,
        section: "products",
        description: "Featured products",
        children: [
          { title: "Slides", url: "/showcase?tab=slides" },
          { title: "Settings", url: "/showcase?tab=settings" },
          { title: "Effects", url: "/showcase?tab=effects" },
        ],
      },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        title: "Orders",
        url: "/orders",
        icon: ShoppingCart,
        section: "orders",
        description: "All orders",
        children: [
          { title: "All orders", url: "/orders?tab=orders" },
          { title: "Payment verifications", url: "/orders?tab=payments" },
        ],
      },
      { title: "Returns", url: "/returns", icon: RotateCcw, section: "orders", description: "Return requests" },
      { title: "Coupons", url: "/coupons", icon: Tag, section: "orders", description: "Discount codes" },
      { title: "User Promos", url: "/user-promos", icon: Gift, section: "orders", adminOnly: true, description: "Targeted offers" },
      {
        title: "Payments",
        url: "/payment-gateways",
        icon: Key,
        adminOnly: true,
        section: "orders",
        description: "Gateways & keys",
        children: [
          { title: "Personal accounts", url: "/payment-gateways?tab=personal" },
          { title: "Stripe", url: "/payment-gateways?tab=stripe" },
          { title: "Merchant APIs", url: "/payment-gateways?tab=merchant" },
        ],
      },
    ],
  },
  {
    label: "Fulfillment",
    items: [
      { title: "Shipping", url: "/shipping", icon: Truck, section: "orders", adminOnly: true, description: "Shipping zones & rates" },
      {
        title: "Couriers",
        url: "/couriers",
        icon: Truck,
        adminOnly: true,
        section: "orders",
        description: "Courier integrations",
        children: [
          { title: "Pathao", url: "/couriers?tab=pathao" },
          { title: "Steadfast", url: "/couriers?tab=steadfast" },
          { title: "Analytics", url: "/couriers?tab=analytics" },
        ],
      },
      {
        title: "Hubs & Pricing",
        url: "/courier-management",
        icon: Building2,
        adminOnly: true,
        section: "orders",
        description: "Pickup hubs",
        children: [
          { title: "Hubs", url: "/courier-management?tab=hubs" },
          { title: "Pricing rules", url: "/courier-management?tab=pricing" },
        ],
      },
      { title: "Delivery Offers", url: "/delivery-offers", icon: Percent, section: "orders", description: "Free / flat shipping" },
    ],
  },
  {
    label: "Customers",
    items: [
      { title: "Customers", url: "/customers", icon: Users, section: "customers", description: "Customer accounts & contacts" },
      { title: "Customer Analytics", url: "/customer-analytics", icon: BarChart3, section: "analytics", adminOnly: true, description: "Cohorts, churn & engagement", keywords: "analytics cohorts churn retention heatmap" },
      { title: "Support", url: "/support", icon: Headphones, section: "customers", description: "Live chat inbox" },
      { title: "Affiliate Hub", url: "/affiliate-hub", icon: Briefcase, section: "affiliate", adminOnly: true, description: "Standalone affiliate control center", keywords: "affiliate referral commission payout marketing hub" },
      {
        title: "Announcements",
        url: "/announcements",
        icon: Megaphone,
        section: "customers",
        description: "Site-wide banners",
        children: [
          { title: "Announcements", url: "/announcements?tab=announcements" },
          { title: "Popups", url: "/announcements?tab=popups" },
        ],
      },
    ],
  },
  {
    label: "Email Marketing",
    items: [
      {
        title: "Provider (Resend)",
        url: "/email-provider",
        icon: KeyRound,
        adminOnly: true,
        section: "customers",
        description: "API keys, webhooks, sender identity",
        keywords: "resend api key webhook smtp",
        children: [
          { title: "Sender identity", url: "/email-provider?tab=sender" },
          { title: "Senders", url: "/email-provider?tab=senders" },
          { title: "API & webhooks", url: "/email-provider?tab=keys" },
          { title: "Send test", url: "/email-provider?tab=test" },
          { title: "Stats", url: "/email-provider?tab=stats" },
        ],
      },
      { title: "Subscribers", url: "/email-subscribers", icon: AtSign, section: "customers", description: "Newsletter signups" },
      { title: "Campaigns", url: "/email-campaigns", icon: Send, section: "customers", description: "Bulk email blasts" },
      { title: "Templates", url: "/email-templates", icon: FileText, section: "customers", description: "Reusable designs" },
      { title: "Automations", url: "/email-automations", icon: Workflow, section: "customers", description: "Event-driven emails" },
    ],
  },
  {
    label: "Storefront",
    items: [
      {
        title: "Landing",
        url: "/landing",
        icon: Globe,
        adminOnly: true,
        section: "portfolio",
        description: "Landing page builder",
        children: [
          { title: "Content", url: "/landing?tab=content" },
          { title: "Sections", url: "/landing?tab=sections" },
        ],
      },
      {
        title: "Home",
        url: "/home",
        icon: Home,
        adminOnly: true,
        section: "portfolio",
        description: "Home page builder",
        children: [
          { title: "Dashboard", url: "/home?tab=dashboard" },
          { title: "Analytics", url: "/home?tab=analytics" },
          { title: "Section order", url: "/home?tab=section-order" },
          { title: "Category sections", url: "/home?tab=cat-sections" },
          { title: "Sales", url: "/home?tab=sales" },
          { title: "New arrivals", url: "/home?tab=new-arrivals" },
          { title: "Layout & style", url: "/home?tab=layout" },
        ],
      },
      { title: "CMS Pages", url: "/cms-pages", icon: FileText, section: "portfolio", adminOnly: true, description: "Custom pages" },
      { title: "Banners", url: "/banners", icon: Image, section: "storefront_ui", description: "Hero & promo banners" },
      { title: "Footer", url: "/footer", icon: Layers, section: "storefront_ui", adminOnly: true, description: "Footer content" },
      { title: "Mobile UI", url: "/mobile-ui", icon: Smartphone, section: "storefront_ui", adminOnly: true, description: "Mobile-only widgets" },
      {
        title: "Branding",
        url: "/branding",
        icon: Palette,
        adminOnly: true,
        section: "storefront_ui",
        description: "Theme & identity",
        children: [
          { title: "Overview", url: "/branding" },
          { title: "Logo & icon", url: "/branding?tab=logo" },
          { title: "Shape & effects", url: "/branding?tab=shape" },
          { title: "Color filter", url: "/branding?tab=color" },
          { title: "Typography", url: "/branding?tab=typography" },
          { title: "Brand voice", url: "/branding?tab=voice" },
          { title: "Site theme", url: "/branding?tab=theme" },
        ],
      },
      {
        title: "Appearance",
        url: "/appearance",
        icon: Layout,
        adminOnly: true,
        section: "storefront_ui",
        description: "Typography & layout for every surface",
        keywords: "appearance typography layout fonts storefront profile settings auth signin signup",
        children: [
          { title: "Storefront", url: "/appearance?tab=storefront" },
          { title: "Product details layout", url: "/appearance?tab=product" },
          { title: "Profile & Settings", url: "/appearance?tab=profile" },
          { title: "Sign-in / Sign-up", url: "/appearance?tab=auth" },
        ],
      },
    ],
  },
  {
    label: "Growth",
    items: [
      {
        title: "Tracking & Ads",
        url: "/tracking",
        icon: TrendingUp,
        adminOnly: true,
        section: "seo",
        description: "Analytics & pixels",
        children: [
          { title: "Facebook Pixel", url: "/tracking?tab=facebook" },
          { title: "Google Ads", url: "/tracking?tab=google-ads" },
          { title: "Search Console", url: "/tracking?tab=search-console" },
          { title: "Ad Setup", url: "/tracking?tab=ad-setup" },
        ],
      },
      { title: "AI Agent", url: "/ai-settings", icon: Bot, section: "ai", adminOnly: true, description: "AI assistant config" },
      { title: "Recommendations", url: "/recommendations", icon: Sparkles, section: "ai", adminOnly: true, description: "Discover engine & AI rerank", keywords: "recommendations discover personalization ai rerank" },
      { title: "Call Center", url: "/call-settings", icon: Phone, section: "settings", adminOnly: true, description: "Voice / call routing" },
      { title: "Telegram", url: "/telegram", icon: Send, section: "settings", adminOnly: true, description: "Bot chats & notification routing", keywords: "telegram bot chat notifications" },
      {
        title: "SEO",
        url: "/seo",
        icon: Search,
        adminOnly: true,
        section: "seo",
        description: "Search optimization, schema & audit",
        keywords: "seo search meta og structured data sitemap robots schema audit dashboard",
        children: [
          { title: "Dashboard", url: "/seo?tab=dashboard" },
          { title: "Pages", url: "/seo?tab=pages" },
          { title: "Audit", url: "/seo?tab=audit" },
          { title: "Global & Verification", url: "/seo?tab=global" },
          { title: "Schema library", url: "/seo?tab=schema" },
          { title: "Tools", url: "/seo?tab=tools" },
        ],
      },
    ],
  },
  {
    label: "Corporate",
    items: [
      {
        title: "Teams",
        url: "/teams",
        icon: Users2,
        section: "employees",
        adminOnly: true,
        description: "Create teams, assign members & section access",
        keywords: "teams groups staff access sections permissions",
      },
      {
        title: "My Team",
        url: "/my-team",
        icon: Briefcase,
        description: "View your team membership and section access",
        keywords: "my team membership sections access teammates",
      },
      {
        title: "Employees",
        url: "/employees",
        icon: Users,
        section: "employees",
        adminOnly: true,
        description: "Team members, presets & section access",
        keywords: "employees staff team roles access sections permissions",
        children: [
          { title: "All employees", url: "/employees?tab=members" },
          { title: "Staff (legacy)", url: "/corporate/staff" },
          { title: "Audit Log", url: "/corporate/audit-log" },
        ],
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
        adminOnly: true,
        section: "settings",
        description: "Global preferences",
        children: [
          { title: "General", url: "/settings?tab=general" },
          { title: "Customizer", url: "/settings?tab=customizer" },
          { title: "Currency", url: "/settings?tab=currency" },
        ],
      },
      { title: "DB Health", url: "/db-health", icon: Activity, section: "settings",
        adminOnly: true,
        description: "Disk IO, seq scans, cron runs & alerts",
      },
      {
        title: "Debug",
        url: "/debug",
        icon: Bug,
        adminOnly: true,
        section: "settings",
        description: "Developer tools",
        children: [
          { title: "Push", url: "/debug?tab=push" },
          { title: "Calls", url: "/debug?tab=calls" },
          { title: "Edge functions", url: "/debug?tab=edge" },
          { title: "Realtime", url: "/debug?tab=realtime" },
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
  { title: "Home", url: "/", icon: LayoutDashboard },
  { title: "Orders", url: "/orders", icon: ShoppingCart, section: "orders" },
  { title: "Products", url: "/products", icon: Package, section: "products" },
  { title: "Customers", url: "/customers", icon: Users, section: "customers" },
  { title: "Email", url: "/email-campaigns", icon: Mail, section: "customers" },
  { title: "Support", url: "/support", icon: Headphones, section: "customers" },
  { title: "Settings", url: "/settings", icon: Settings, section: "settings" },
];


export { Eye, BarChart3, Search, Type, Sparkles, Layout, Receipt, Mail, Send, AtSign, ShieldCheck, ClipboardList, Briefcase };
