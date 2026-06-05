/* ── 20 Rich Theme Palettes ── */

export interface ThemePalette {
  id: string;
  name: string;
  preview: string[]; // 6 hex colors for admin preview
  dark: Record<string, string>;
  light: Record<string, string>;
}

function gen(
  id: string, name: string, preview: string[],
  pH: number, pS: number, pL: number,
  aH: number, aS: number, aL: number,
  bgHue: number,
): ThemePalette {
  const bs = Math.min(pS, 15);
  const bsm = Math.min(pS, 12);
  const pfg = pL > 55 ? `${bgHue} 15% 8%` : "0 0% 98%";
  const lpL = Math.min(pL + 5, 52);
  const laL = Math.min(aL + 8, 55);

  return {
    id, name, preview,
    dark: {
      "--background": `${bgHue} ${bs}% 6%`,
      "--foreground": `${bgHue} 10% 90%`,
      "--card": `${bgHue} ${bsm}% 9%`,
      "--card-foreground": `${bgHue} 10% 90%`,
      "--popover": `${bgHue} ${bsm}% 9%`,
      "--popover-foreground": `${bgHue} 10% 90%`,
      "--primary": `${pH} ${pS}% ${pL}%`,
      "--primary-foreground": pfg,
      "--secondary": `${bgHue} ${bs}% 14%`,
      "--secondary-foreground": `${bgHue} 10% 85%`,
      "--muted": `${bgHue} ${Math.min(pS, 10)}% 12%`,
      "--muted-foreground": `${bgHue} 8% 50%`,
      "--accent": `${aH} ${aS}% ${aL}%`,
      "--accent-foreground": "0 0% 95%",
      "--destructive": "0 72% 51%",
      "--destructive-foreground": "0 0% 98%",
      "--border": `${bgHue} ${bsm}% 16%`,
      "--input": `${bgHue} ${bsm}% 16%`,
      "--ring": `${pH} ${pS}% ${pL}%`,
      "--gradient-primary": `linear-gradient(135deg, hsl(${pH} ${pS}% ${pL}%), hsl(${aH} ${aS}% ${aL}%))`,
      "--gradient-accent": `linear-gradient(135deg, hsl(${aH} ${aS}% ${aL}%), hsl(${pH} ${Math.max(pS - 20, 30)}% ${Math.max(pL - 10, 20)}%))`,
      "--gradient-glow": `radial-gradient(ellipse at center, hsl(${pH} ${pS}% ${pL}% / 0.15), transparent 70%)`,
      "--glass-bg": `${bgHue} ${bsm}% 10% / 0.6`,
      "--glass-border": `${bgHue} ${Math.min(pS, 10)}% 25% / 0.3`,
      "--glass-shadow": "0 8px 32px hsl(0 0% 0% / 0.5)",
      "--sidebar-background": `${bgHue} ${bs}% 7%`,
      "--sidebar-foreground": `${bgHue} 10% 85%`,
      "--sidebar-primary": `${pH} ${pS}% ${pL}%`,
      "--sidebar-primary-foreground": pfg,
      "--sidebar-accent": `${bgHue} ${bs}% 13%`,
      "--sidebar-accent-foreground": `${bgHue} 10% 85%`,
      "--sidebar-border": `${bgHue} ${bsm}% 16%`,
      "--sidebar-ring": `${pH} ${pS}% ${pL}%`,
    },
    light: {
      "--background": `${bgHue} ${Math.min(pS, 12)}% 97%`,
      "--foreground": `${bgHue} 20% 10%`,
      "--card": "0 0% 100%",
      "--card-foreground": `${bgHue} 20% 10%`,
      "--popover": "0 0% 100%",
      "--popover-foreground": `${bgHue} 20% 10%`,
      "--primary": `${pH} ${pS}% ${lpL}%`,
      "--primary-foreground": "0 0% 100%",
      "--secondary": `${bgHue} 14% 92%`,
      "--secondary-foreground": `${bgHue} 20% 15%`,
      "--muted": `${bgHue} 12% 94%`,
      "--muted-foreground": `${bgHue} 10% 45%`,
      "--accent": `${aH} ${Math.min(aS, 60)}% ${laL}%`,
      "--accent-foreground": "0 0% 100%",
      "--destructive": "0 72% 51%",
      "--destructive-foreground": "0 0% 98%",
      "--border": `${bgHue} 12% 88%`,
      "--input": `${bgHue} 12% 88%`,
      "--ring": `${pH} ${pS}% ${lpL}%`,
      "--gradient-primary": `linear-gradient(135deg, hsl(${pH} ${pS}% ${lpL}%), hsl(${aH} ${Math.min(aS, 60)}% ${laL}%))`,
      "--gradient-accent": `linear-gradient(135deg, hsl(${aH} ${Math.min(aS, 60)}% ${laL}%), hsl(${pH} ${Math.max(pS - 10, 40)}% ${Math.min(pL + 10, 55)}%))`,
      "--gradient-glow": `radial-gradient(ellipse at center, hsl(${pH} ${pS}% ${lpL}% / 0.1), transparent 70%)`,
      "--glass-bg": "0 0% 100% / 0.7",
      "--glass-border": `${bgHue} 12% 80% / 0.4`,
      "--glass-shadow": "0 8px 32px hsl(0 0% 0% / 0.08)",
      "--sidebar-background": `${bgHue} ${Math.min(pS, 10)}% 98%`,
      "--sidebar-foreground": `${bgHue} 20% 15%`,
      "--sidebar-primary": `${pH} ${pS}% ${lpL}%`,
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": `${bgHue} 12% 94%`,
      "--sidebar-accent-foreground": `${bgHue} 20% 15%`,
      "--sidebar-border": `${bgHue} 12% 88%`,
      "--sidebar-ring": `${pH} ${pS}% ${lpL}%`,
    },
  };
}

export const themePalettes: ThemePalette[] = [
  // 1 — DEFAULT: Crimson Drive — deep teal backgrounds + crimson primary + copper/gold accents
  {
    id: "crimson_drive",
    name: "Crimson Drive",
    preview: ["#BF0111", "#751011", "#0B4858", "#04181E", "#A43B10", "#C7A069"],
    dark: {
      "--background": "192 78% 7%",           // #04181E deep ocean
      "--foreground": "190 15% 88%",
      "--card": "192 55% 10%",                 // #0B2530 dark teal card
      "--card-foreground": "190 15% 88%",
      "--popover": "192 55% 10%",
      "--popover-foreground": "190 15% 88%",
      "--primary": "355 99% 38%",              // Crimson red
      "--primary-foreground": "0 0% 98%",
      "--secondary": "192 40% 13%",            // #0B3545 muted teal
      "--secondary-foreground": "190 12% 82%",
      "--muted": "192 35% 11%",
      "--muted-foreground": "190 12% 48%",
      "--accent": "24 83% 35%",                // #A43B10 burnt copper
      "--accent-foreground": "0 0% 95%",
      "--destructive": "0 72% 51%",
      "--destructive-foreground": "0 0% 98%",
      "--border": "192 30% 16%",
      "--input": "192 30% 16%",
      "--ring": "355 99% 38%",
      "--gradient-primary": "linear-gradient(135deg, hsl(355 99% 38%), hsl(24 83% 35%))",
      "--gradient-accent": "linear-gradient(135deg, hsl(24 83% 35%), hsl(36 42% 58%))",
      "--gradient-glow": "radial-gradient(ellipse at center, hsl(355 99% 38% / 0.15), transparent 70%)",
      "--glass-bg": "192 40% 12% / 0.55",
      "--glass-border": "190 20% 28% / 0.35",
      "--glass-shadow": "0 8px 32px hsl(192 80% 3% / 0.6)",
      "--sidebar-background": "192 70% 8%",
      "--sidebar-foreground": "190 12% 85%",
      "--sidebar-primary": "355 99% 38%",
      "--sidebar-primary-foreground": "0 0% 98%",
      "--sidebar-accent": "192 40% 13%",
      "--sidebar-accent-foreground": "190 12% 85%",
      "--sidebar-border": "192 30% 16%",
      "--sidebar-ring": "355 99% 38%",
    },
    light: {
      "--background": "190 12% 97%",
      "--foreground": "192 20% 10%",
      "--card": "0 0% 100%",
      "--card-foreground": "192 20% 10%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "192 20% 10%",
      "--primary": "355 99% 43%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "190 14% 92%",
      "--secondary-foreground": "192 20% 15%",
      "--muted": "190 12% 94%",
      "--muted-foreground": "192 10% 45%",
      "--accent": "24 60% 43%",
      "--accent-foreground": "0 0% 100%",
      "--destructive": "0 72% 51%",
      "--destructive-foreground": "0 0% 98%",
      "--border": "190 12% 88%",
      "--input": "190 12% 88%",
      "--ring": "355 99% 43%",
      "--gradient-primary": "linear-gradient(135deg, hsl(355 99% 43%), hsl(24 60% 43%))",
      "--gradient-accent": "linear-gradient(135deg, hsl(24 60% 43%), hsl(355 80% 33%))",
      "--gradient-glow": "radial-gradient(ellipse at center, hsl(355 99% 43% / 0.1), transparent 70%)",
      "--glass-bg": "0 0% 100% / 0.7",
      "--glass-border": "190 12% 80% / 0.4",
      "--glass-shadow": "0 8px 32px hsl(0 0% 0% / 0.08)",
      "--sidebar-background": "190 10% 98%",
      "--sidebar-foreground": "192 20% 15%",
      "--sidebar-primary": "355 99% 43%",
      "--sidebar-primary-foreground": "0 0% 100%",
      "--sidebar-accent": "190 12% 94%",
      "--sidebar-accent-foreground": "192 20% 15%",
      "--sidebar-border": "190 12% 88%",
      "--sidebar-ring": "355 99% 43%",
    },
  },

  // 2 — 1st screenshot: amber rocks
  gen("amber_rocks", "Amber Rocks", ["#3B2B24", "#210E02", "#673612", "#B25A16", "#C3712F", "#D9AE84"],
    27, 79, 39, 24, 62, 47, 25),

  // 3 — 2nd screenshot: tiger jungle
  gen("jungle_prowl", "Jungle Prowl", ["#6B9948", "#2E4B2C", "#372211", "#604329", "#926133", "#AF8557"],
    94, 35, 44, 24, 48, 39, 90),

  // 4 — 4th screenshot: desert mountains
  gen("desert_mirage", "Desert Mirage", ["#ECE1CF", "#D8D2C0", "#B9AC9B", "#6A786B", "#1F403A", "#DB7252"],
    13, 65, 59, 170, 35, 19, 30),

  // 5 — 5th screenshot: sunset city
  gen("ember_city", "Ember City", ["#F48C56", "#F96A27", "#C0400C", "#48362F", "#737574", "#D8D8D6"],
    20, 95, 56, 18, 89, 40, 20),

  // 6 — 6th screenshot: pink flower
  gen("rose_petal", "Rose Petal", ["#ECBAD0", "#DC82A3", "#B25681", "#91759C", "#31294C", "#0F0924"],
    330, 38, 51, 340, 54, 55, 330),

  // 7 — 7th screenshot: obsidian copper
  gen("obsidian_copper", "Obsidian Copper", ["#824D33", "#5D301D", "#0F1116", "#3D4959", "#666261", "#969BA0"],
    20, 43, 35, 215, 19, 29, 215),

  // 8 — 8th screenshot: gilded vault
  gen("gilded_vault", "Gilded Vault", ["#AEBC24", "#616435", "#414033", "#2B2C2F", "#1C1C1C", "#283D70"],
    67, 68, 44, 222, 48, 30, 60),

  // 9 — 9th screenshot: tidal flame
  gen("tidal_flame", "Tidal Flame", ["#96BCBD", "#558893", "#0B4858", "#04181E", "#A43B10", "#C7A069"],
    190, 27, 45, 18, 83, 35, 190),

  // 10 — 10th screenshot: volcanic dusk
  gen("volcanic_dusk", "Volcanic Dusk", ["#7A9BA0", "#455960", "#292F35", "#2B100B", "#7A2D16", "#BD4132"],
    5, 58, 47, 187, 16, 55, 5),

  // 11 — Midnight Orchid (deep purples)
  gen("midnight_orchid", "Midnight Orchid", ["#7B2D8E", "#5C1A6E", "#3A0F47", "#1A0826", "#D4A5E0", "#F0D6F7"],
    285, 65, 50, 320, 55, 45, 280),

  // 12 — Arctic Aurora (icy cyan + green)
  gen("arctic_aurora", "Arctic Aurora", ["#2DD4BF", "#0EA5E9", "#0C4A6E", "#083344", "#A7F3D0", "#ECFDF5"],
    174, 72, 50, 200, 88, 48, 195),

  // 13 — Sandstorm (warm beige/tan)
  gen("sandstorm", "Sandstorm", ["#C2956B", "#A07548", "#6B4C30", "#3D2B1A", "#E8D5BF", "#F5EDE3"],
    30, 45, 48, 25, 42, 38, 30),

  // 14 — Neon Pulse (electric)
  gen("neon_pulse", "Neon Pulse", ["#FF2D78", "#00F0FF", "#7B00FF", "#0A0A1A", "#FF6B9D", "#C1F0FB"],
    340, 100, 50, 185, 100, 50, 260),

  // 15 — Forest Canopy (deep greens)
  gen("forest_canopy", "Forest Canopy", ["#2D6A4F", "#1B4332", "#081C15", "#40916C", "#74C69D", "#B7E4C7"],
    152, 42, 38, 150, 38, 42, 150),

  // 16 — Sapphire Deep (rich blues)
  gen("sapphire_deep", "Sapphire Deep", ["#1E40AF", "#1E3A8A", "#172554", "#3B82F6", "#93C5FD", "#DBEAFE"],
    224, 72, 52, 250, 65, 55, 225),

  // 17 — Terracotta Sun (earthy warm)
  gen("terracotta_sun", "Terracotta Sun", ["#C2410C", "#9A3412", "#7C2D12", "#431407", "#FB923C", "#FED7AA"],
    18, 88, 40, 28, 70, 50, 18),

  // 18 — Lavender Dream (soft purple)
  gen("lavender_dream", "Lavender Dream", ["#A78BFA", "#8B5CF6", "#6D28D9", "#4C1D95", "#C4B5FD", "#EDE9FE"],
    263, 50, 62, 290, 45, 55, 260),

  // 19 — Carbon Fiber (monochrome sophisticated)
  gen("carbon_fiber", "Carbon Fiber", ["#6B7280", "#4B5563", "#374151", "#1F2937", "#9CA3AF", "#D1D5DB"],
    215, 18, 46, 215, 14, 34, 215),

  // 20 — Emerald Night (green/dark)
  gen("emerald_night", "Emerald Night", ["#10B981", "#059669", "#047857", "#064E3B", "#6EE7B7", "#D1FAE5"],
    160, 84, 45, 280, 70, 55, 160),
];

/** Quick lookup map */
export const themeMap = new Map(themePalettes.map((t) => [t.id, t]));

/** All CSS vars that themes may set */
export const allThemeVars = [
  "--background", "--foreground", "--card", "--card-foreground",
  "--popover", "--popover-foreground", "--primary", "--primary-foreground",
  "--secondary", "--secondary-foreground", "--muted", "--muted-foreground",
  "--accent", "--accent-foreground", "--destructive", "--destructive-foreground",
  "--border", "--input", "--ring",
  "--gradient-primary", "--gradient-accent", "--gradient-glow",
  "--glass-bg", "--glass-border", "--glass-shadow",
  "--sidebar-background", "--sidebar-foreground",
  "--sidebar-primary", "--sidebar-primary-foreground",
  "--sidebar-accent", "--sidebar-accent-foreground",
  "--sidebar-border", "--sidebar-ring",
];
