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
      { title: "Dashboard", url: "/origin", icon: LayoutDashboard, description: "KPIs and activity" },
      { title: "Live Activity", url: "/origin/live-activity", icon: Activity, adminOnly: true, section: "analytics", description: "Realtime ops dashboard", keywords: "live activity realtime orders support visitors" },
    ],
  },
  {
    label: "Catalog",
    items: [
      {
        title: "Products",
        url: "/origin/products",
        icon: Package,
        section: "products",
        description: "Inventory & variants",
        children: [
          { title: "All products", url: "/origin/products?tab=list" },
          { title: "Product settings", url: "/origin/products?tab=settings" },
          { title: "Commerce", url: "/origin/products?tab=commerce" },
        ],
      },
      { title: "Categories", url: "/origin/categories", icon: FolderTree, section: "products", description: "Product taxonomy" },
      { title: "Reviews", url: "/origin/reviews", icon: Star, section: "products", description: "Customer reviews" },
      {
        title: "Requests",
        url: "/origin/requests",
        icon: MessageSquare,
        adminOnly: true,
        section: "products",
        description: "Product requests",
        children: [
          { title: "Requests", url: "/origin/requests?tab=requests" },
          { title: "Imports", url: "/origin/requests?tab=imports" },
        ],
      },
      {
        title: "Showcase",
        url: "/origin/showcase",
        icon: Layers,
        section: "products",
        description: "Featured products",
        children: [
          { title: "Slides", url: "/origin/showcase?tab=slides" },
          { title: "Settings", url: "/origin/showcase?tab=settings" },
          { title: "Effects", url: "/origin/showcase?tab=effects" },
        ],
      },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        title: "Orders",
        url: "/origin/orders",
        icon: ShoppingCart,
        section: "orders",
        description: "All orders",
        children: [
          { title: "All orders", url: "/origin/orders?tab=orders" },
          { title: "Payment verifications", url: "/origin/orders?tab=payments" },
        ],
      },
      { title: "Returns", url: "/origin/returns", icon: RotateCcw, section: "orders", description: "Return requests" },
      { title: "Coupons", url: "/origin/coupons", icon: Tag, section: "orders", description: "Discount codes" },
      { title: "User Promos", url: "/origin/user-promos", icon: Gift, section: "orders", adminOnly: true, description: "Targeted offers" },
      {
        title: "Payments",
        url: "/origin/payment-gateways",
        icon: Key,
        adminOnly: true,
        section: "orders",
        description: "Gateways & keys",
        children: [
          { title: "Personal accounts", url: "/origin/payment-gateways?tab=personal" },
          { title: "Stripe", url: "/origin/payment-gateways?tab=stripe" },
          { title: "Merchant APIs", url: "/origin/payment-gateways?tab=merchant" },
        ],
      },
    ],
  },
  {
    label: "Fulfillment",
    items: [
      { title: "Shipping", url: "/origin/shipping", icon: Truck, section: "orders", adminOnly: true, description: "Shipping zones & rates" },
      {
        title: "Couriers",
        url: "/origin/couriers",
        icon: Truck,
        adminOnly: true,
        section: "orders",
        description: "Courier integrations",
        children: [
          { title: "Pathao", url: "/origin/couriers?tab=pathao" },
          { title: "Steadfast", url: "/origin/couriers?tab=steadfast" },
          { title: "Analytics", url: "/origin/couriers?tab=analytics" },
        ],
      },
      {
        title: "Hubs & Pricing",
        url: "/origin/courier-management",
        icon: Building2,
        adminOnly: true,
        section: "orders",
        description: "Pickup hubs",
        children: [
          { title: "Hubs", url: "/origin/courier-management?tab=hubs" },
          { title: "Pricing rules", url: "/origin/courier-management?tab=pricing" },
        ],
      },
      { title: "Delivery Offers", url: "/origin/delivery-offers", icon: Percent, section: "orders", description: "Free / flat shipping" },
    ],
  },
  {
    label: "Customers",
    items: [
      { title: "Customers", url: "/origin/customers", icon: Users, section: "customers", description: "Customer accounts & contacts" },
      { title: "Customer Analytics", url: "/origin/customer-analytics", icon: BarChart3, section: "analytics", adminOnly: true, description: "Cohorts, churn & engagement", keywords: "analytics cohorts churn retention heatmap" },
      { title: "Support", url: "/origin/support", icon: Headphones, section: "customers", description: "Live chat inbox" },
      { title: "Affiliate Hub", url: "/affiliate-hub", icon: Briefcase, section: "affiliate", adminOnly: true, description: "Standalone affiliate control center", keywords: "affiliate referral commission payout marketing hub" },
      {
        title: "Announcements",
        url: "/origin/announcements",
        icon: Megaphone,
        section: "customers",
        description: "Site-wide banners",
        children: [
          { title: "Announcements", url: "/origin/announcements?tab=announcements" },
          { title: "Popups", url: "/origin/announcements?tab=popups" },
        ],
      },
    ],
  },
  {
    label: "Email Marketing",
    items: [
      {
        title: "Provider (Resend)",
        url: "/origin/email-provider",
        icon: KeyRound,
        adminOnly: true,
        section: "customers",
        description: "API keys, webhooks, sender identity",
        keywords: "resend api key webhook smtp",
        children: [
          { title: "Sender identity", url: "/origin/email-provider?tab=sender" },
          { title: "Senders", url: "/origin/email-provider?tab=senders" },
          { title: "API & webhooks", url: "/origin/email-provider?tab=keys" },
          { title: "Send test", url: "/origin/email-provider?tab=test" },
          { title: "Stats", url: "/origin/email-provider?tab=stats" },
        ],
      },
      { title: "Subscribers", url: "/origin/email-subscribers", icon: AtSign, section: "customers", description: "Newsletter signups" },
      { title: "Campaigns", url: "/origin/email-campaigns", icon: Send, section: "customers", description: "Bulk email blasts" },
      { title: "Templates", url: "/origin/email-templates", icon: FileText, section: "customers", description: "Reusable designs" },
      { title: "Automations", url: "/origin/email-automations", icon: Workflow, section: "customers", description: "Event-driven emails" },
    ],
  },
  {
    label: "Storefront",
    items: [
      {
        title: "Landing",
        url: "/origin/landing",
        icon: Globe,
        adminOnly: true,
        section: "portfolio",
        description: "Landing page builder",
        children: [
          { title: "Content", url: "/origin/landing?tab=content" },
          { title: "Sections", url: "/origin/landing?tab=sections" },
        ],
      },
      {
        title: "Home",
        url: "/origin/home",
        icon: Home,
        adminOnly: true,
        section: "portfolio",
        description: "Home page builder",
        children: [
          { title: "Dashboard", url: "/origin/home?tab=dashboard" },
          { title: "Analytics", url: "/origin/home?tab=analytics" },
          { title: "Section order", url: "/origin/home?tab=section-order" },
          { title: "Category sections", url: "/origin/home?tab=cat-sections" },
          { title: "Sales", url: "/origin/home?tab=sales" },
          { title: "New arrivals", url: "/origin/home?tab=new-arrivals" },
          { title: "Layout & style", url: "/origin/home?tab=layout" },
        ],
      },
      { title: "CMS Pages", url: "/origin/cms-pages", icon: FileText, section: "portfolio", adminOnly: true, description: "Custom pages" },
      { title: "Banners", url: "/origin/banners", icon: Image, section: "storefront_ui", description: "Hero & promo banners" },
      { title: "Footer", url: "/origin/footer", icon: Layers, section: "storefront_ui", adminOnly: true, description: "Footer content" },
      { title: "Mobile UI", url: "/origin/mobile-ui", icon: Smartphone, section: "storefront_ui", adminOnly: true, description: "Mobile-only widgets" },
      {
        title: "Branding",
        url: "/origin/branding",
        icon: Palette,
        adminOnly: true,
        section: "storefront_ui",
        description: "Theme & identity",
        children: [
          { title: "Overview", url: "/origin/branding" },
          { title: "Logo & icon", url: "/origin/branding?tab=logo" },
          { title: "Shape & effects", url: "/origin/branding?tab=shape" },
          { title: "Color filter", url: "/origin/branding?tab=color" },
          { title: "Typography", url: "/origin/branding?tab=typography" },
          { title: "Brand voice", url: "/origin/branding?tab=voice" },
          { title: "Site theme", url: "/origin/branding?tab=theme" },
        ],
      },
      {
        title: "Appearance",
        url: "/origin/appearance",
        icon: Layout,
        adminOnly: true,
        section: "storefront_ui",
        description: "Typography & layout for every surface",
        keywords: "appearance typography layout fonts storefront profile settings auth signin signup",
        children: [
          { title: "Storefront", url: "/origin/appearance?tab=storefront" },
          { title: "Product details layout", url: "/origin/appearance?tab=product" },
          { title: "Profile & Settings", url: "/origin/appearance?tab=profile" },
          { title: "Sign-in / Sign-up", url: "/origin/appearance?tab=auth" },
        ],
      },
    ],
  },
  {
    label: "Growth",
    items: [
      {
        title: "Tracking & Ads",
        url: "/origin/tracking",
        icon: TrendingUp,
        adminOnly: true,
        section: "seo",
        description: "Analytics & pixels",
        children: [
          { title: "Facebook Pixel", url: "/origin/tracking?tab=facebook" },
          { title: "Google Ads", url: "/origin/tracking?tab=google-ads" },
          { title: "Search Console", url: "/origin/tracking?tab=search-console" },
          { title: "Ad Setup", url: "/origin/tracking?tab=ad-setup" },
        ],
      },
      { title: "AI Agent", url: "/origin/ai-settings", icon: Bot, section: "ai", adminOnly: true, description: "AI assistant config" },
      { title: "Recommendations", url: "/origin/recommendations", icon: Sparkles, section: "ai", adminOnly: true, description: "Discover engine & AI rerank", keywords: "recommendations discover personalization ai rerank" },
      { title: "Call Center", url: "/origin/call-settings", icon: Phone, section: "settings", adminOnly: true, description: "Voice / call routing" },
      { title: "Telegram", url: "/origin/telegram", icon: Send, section: "settings", adminOnly: true, description: "Bot chats & notification routing", keywords: "telegram bot chat notifications" },
      {
        title: "SEO",
        url: "/origin/seo",
        icon: Search,
        adminOnly: true,
        section: "seo",
        description: "Search optimization, schema & audit",
        keywords: "seo search meta og structured data sitemap robots schema audit dashboard",
        children: [
          { title: "Dashboard", url: "/origin/seo?tab=dashboard" },
          { title: "Pages", url: "/origin/seo?tab=pages" },
          { title: "Audit", url: "/origin/seo?tab=audit" },
          { title: "Global & Verification", url: "/origin/seo?tab=global" },
          { title: "Schema library", url: "/origin/seo?tab=schema" },
          { title: "Tools", url: "/origin/seo?tab=tools" },
        ],
      },
    ],
  },
  {
    label: "Corporate",
    items: [
      {
        title: "Employees",
        url: "/origin/employees",
        icon: Users,
        section: "employees",
        adminOnly: true,
        description: "Team members, presets & section access",
        keywords: "employees staff team roles access sections permissions",
        children: [
          { title: "All employees", url: "/origin/employees?tab=members" },
          { title: "Staff (legacy)", url: "/origin/corporate/staff" },
          { title: "Audit Log", url: "/origin/corporate/audit-log" },
        ],
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        title: "Settings",
        url: "/origin/settings",
        icon: Settings,
        adminOnly: true,
        section: "settings",
        description: "Global preferences",
        children: [
          { title: "General", url: "/origin/settings?tab=general" },
          { title: "Customizer", url: "/origin/settings?tab=customizer" },
          { title: "Currency", url: "/origin/settings?tab=currency" },
        ],
      },
      { title: "DB Health", url: "/origin/db-health", icon: Activity, section: "settings",
        adminOnly: true,
        description: "Disk IO, seq scans, cron runs & alerts",
      },
      {
        title: "Debug",
        url: "/origin/debug",
        icon: Bug,
        adminOnly: true,
        section: "settings",
        description: "Developer tools",
        children: [
          { title: "Push", url: "/origin/debug?tab=push" },
          { title: "Calls", url: "/origin/debug?tab=calls" },
          { title: "Edge functions", url: "/origin/debug?tab=edge" },
          { title: "Realtime", url: "/origin/debug?tab=realtime" },
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
  { title: "Home", url: "/origin", icon: LayoutDashboard },
  { title: "Orders", url: "/origin/orders", icon: ShoppingCart, section: "orders" },
  { title: "Products", url: "/origin/products", icon: Package, section: "products" },
  { title: "Customers", url: "/origin/customers", icon: Users, section: "customers" },
  { title: "Email", url: "/origin/email-campaigns", icon: Mail, section: "customers" },
  { title: "Support", url: "/origin/support", icon: Headphones, section: "customers" },
  { title: "Settings", url: "/origin/settings", icon: Settings, section: "settings" },
];


export { Eye, BarChart3, Search, Type, Sparkles, Layout, Receipt, Mail, Send, AtSign, ShieldCheck, ClipboardList, Briefcase };
