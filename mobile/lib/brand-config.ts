import type { ImageSourcePropType } from "react-native";

/**
 * White-Label Logistics & Delivery OS — Multi-Tenant Brand & Vertical Engine
 *
 * Default Tenant #1 (First Right of Refusal): Preferred Solutions Transport (PST)
 * Exact Brand Tokens from preferred-delivery-hub-1/src/index.css:
 * - Background: Pure White (#FFFFFF) / Muted (#F4F4F5) / Foreground (#09090B)
 * - Primary: Electric Cobalt Blue (#064AF9 / hsl(217 96% 50%))
 * - Secondary: Electric Magenta (#AE05F8 / hsl(277 94% 50%))
 * - Accent: Volt Lime (#CCF427 / hsl(69 86% 56%)) with black foreground (#09090B)
 *
 * Architectural Rule (The "90/10" Sleek White-Label Standard):
 * - 90% of the UI is invariant structural calm (#FFFFFF sheet, #F4F4F5 soft zinc,
 *   #09090B obsidian ink, #71717A slate subtitle, desaturated Positron map).
 * - 10% is surgical tenant identity & domain intelligence: logo/wordmark,
 *   primary brand color on CTAs & active badges, and vertical-specific nomenclature.
 */

export type UserRole = "recipient" | "driver" | "dispatcher" | "admin";

export type LogisticsVertical =
  | "commercial_courier"
  | "medical_stat"
  | "parts_runner"
  | "box_truck_freight";

export interface VerticalVehicleLabel {
  title: string;
  subtitle: string;
}

export interface VerticalQuickPlace {
  label: string;
  subtitle: string;
  address: string;
}

export interface VerticalMetadata {
  key: LogisticsVertical;
  name: string;
  shortBadge: string;
  cargoNoun: string;
  heroHeadline: string;
  searchPrompt: string;
  custodyBadge: string;
  referenceLabel: string;
  referencePlaceholder: string;
  defaultInstructionsPlaceholder: string;
  description: string;
  vehicleLabels: {
    sedan: VerticalVehicleLabel;
    suv: VerticalVehicleLabel;
    cargo_van: VerticalVehicleLabel;
  };
  quickPlaces: VerticalQuickPlace[];
  defaultPalette: {
    primary: string;
    primarySoft: string;
    secondary: string;
    secondarySoft: string;
    accent: string;
    accentForeground: string;
  };
}

export const BRAND_COLOR_SWATCHES: {
  label: string;
  primary: string;
  primarySoft: string;
}[] = [
  { label: "Cobalt", primary: "#064AF9", primarySoft: "#EEF3FF" },
  { label: "Obsidian", primary: "#09090B", primarySoft: "#F4F4F5" },
  { label: "Clinical", primary: "#0D9488", primarySoft: "#ECFDF5" },
  { label: "Hotshot", primary: "#EA580C", primarySoft: "#FFF7ED" },
  { label: "Indigo", primary: "#4F46E5", primarySoft: "#EEF2FF" },
  { label: "Crimson", primary: "#E11D48", primarySoft: "#FFF1F2" },
];

export const VERTICAL_TEMPLATES: Record<LogisticsVertical, VerticalMetadata> = {
  commercial_courier: {
    key: "commercial_courier",
    name: "Commercial & On-Demand Courier",
    shortBadge: "Same-Day Courier",
    cargoNoun: "Parcel / Shipment",
    heroHeadline: "Same-day delivery,\nsimplified.",
    searchPrompt: "Where are we delivering?",
    custodyBadge: "PIN + Photo Proof",
    referenceLabel: "PO / Reference #",
    referencePlaceholder: "PO-IND-88501",
    defaultInstructionsPlaceholder: "Suite, reception desk, or gate code...",
    description:
      "On-demand B2B parcels, legal & title closings, inter-office pouches, and scheduled routes",
    vehicleLabels: {
      sedan: {
        title: "Courier Car",
        subtitle: "4 min away · Envelopes & parcels up to 50 lbs",
      },
      suv: {
        title: "Mid-Size SUV",
        subtitle: "6 min away · Multi-box loads up to 250 lbs",
      },
      cargo_van: {
        title: "Cargo Van",
        subtitle: "9 min away · Commercial skids up to 2,500 lbs",
      },
    },
    quickPlaces: [
      {
        label: "Keystone Crossing",
        subtitle: "8702 Keystone Crossing, Indianapolis",
        address: "8702 Keystone Crossing, Indianapolis, IN 46240",
      },
      {
        label: "Airport Logistics Hub",
        subtitle: "2500 Airport Expy, Indianapolis",
        address: "2500 Airport Expy, Indianapolis, IN 46241",
      },
      {
        label: "Downtown Tower",
        subtitle: "400 W Maryland St, Indianapolis",
        address: "400 W Maryland St, Indianapolis, IN 46225",
      },
      {
        label: "Avon Distribution",
        subtitle: "9708 E US Highway 36, Avon",
        address: "9708 E US Highway 36, Avon, IN 46123",
      },
    ],
    defaultPalette: {
      primary: "#064AF9",
      primarySoft: "#EEF3FF",
      secondary: "#AE05F8",
      secondarySoft: "#F8ECFF",
      accent: "#CCF427",
      accentForeground: "#09090B",
    },
  },
  medical_stat: {
    key: "medical_stat",
    name: "Medical, Lab Specimen & Pharmacy STAT",
    shortBadge: "Medical STAT",
    cargoNoun: "Specimen / Medical Tote",
    heroHeadline: "STAT medical courier,\non demand.",
    searchPrompt: "Which clinic, lab, or hospital?",
    custodyBadge: "HIPAA Chain-of-Custody",
    referenceLabel: "Manifest / Accession #",
    referencePlaceholder: "STAT-LAB-4092",
    defaultInstructionsPlaceholder:
      "Ambient or refrigerated tote · Lab intake desk...",
    description:
      "HIPAA-verified lab specimens, hospital-to-lab STAT runs, pharmacy & cold-chain custody",
    vehicleLabels: {
      sedan: {
        title: "STAT Medical Sedan",
        subtitle: "3 min away · Ambient & chilled specimen totes",
      },
      suv: {
        title: "Clinical Transfer SUV",
        subtitle: "6 min away · Multi-tote & surgical instrument kits",
      },
      cargo_van: {
        title: "Temp-Controlled Van",
        subtitle: "10 min away · Bulk pharmacy & hospital supply carts",
      },
    },
    quickPlaces: [
      {
        label: "IU Health Pathology Lab",
        subtitle: "350 W 11th St, Indianapolis",
        address: "350 W 11th St, Indianapolis, IN 46202",
      },
      {
        label: "St. Vincent Oncology",
        subtitle: "2001 W 86th St, Indianapolis",
        address: "2001 W 86th St, Indianapolis, IN 46260",
      },
      {
        label: "Carmel Specialty Pharmacy",
        subtitle: "11725 N Illinois St, Carmel",
        address: "11725 N Illinois St, Carmel, IN 46032",
      },
      {
        label: "Methodist ER Intake",
        subtitle: "1701 N Senate Blvd, Indianapolis",
        address: "1701 N Senate Blvd, Indianapolis, IN 46202",
      },
    ],
    defaultPalette: {
      primary: "#0D9488",
      primarySoft: "#ECFDF5",
      secondary: "#0284C7",
      secondarySoft: "#E0F2FE",
      accent: "#99F6E4",
      accentForeground: "#0F172A",
    },
  },
  parts_runner: {
    key: "parts_runner",
    name: "Auto, HVAC & Industrial Parts Hotshot",
    shortBadge: "Parts Hotshot",
    cargoNoun: "Parts / Assembly",
    heroHeadline: "Job-site parts,\non the clock.",
    searchPrompt: "Which supply house or job site?",
    custodyBadge: "Foreman Sign-Off",
    referenceLabel: "Work Order / PO #",
    referencePlaceholder: "WO-77319-HVAC",
    defaultInstructionsPlaceholder:
      "Parts counter bay # or site foreman phone...",
    description:
      "Dealership parts, HVAC/plumbing supply houses, electrical distributors & contractor site drops",
    vehicleLabels: {
      sedan: {
        title: "Parts Runner Car",
        subtitle: "4 min away · Alternators, fittings & small cartons",
      },
      suv: {
        title: "Field Service SUV",
        subtitle: "6 min away · Compressors, motors & toolboxes",
      },
      cargo_van: {
        title: "Hotshot Cargo Van",
        subtitle: "8 min away · HVAC units, conduit & job-site skids",
      },
    },
    quickPlaces: [
      {
        label: "Avon HVAC Supply Counter",
        subtitle: "9708 E US Highway 36, Avon",
        address: "9708 E US Highway 36, Avon, IN 46123",
      },
      {
        label: "Keystone Job Site Gate 2",
        subtitle: "8702 Keystone Crossing, Indianapolis",
        address: "8702 Keystone Crossing, Indianapolis, IN 46240",
      },
      {
        label: "Southside Auto Parts Hub",
        subtitle: "6910 Bluff Rd, Indianapolis",
        address: "6910 Bluff Rd, Indianapolis, IN 46217",
      },
      {
        label: "Plainfield Industrial Park",
        subtitle: "2150 Allpoints Pkwy, Plainfield",
        address: "2150 Allpoints Pkwy, Plainfield, IN 46168",
      },
    ],
    defaultPalette: {
      primary: "#EA580C",
      primarySoft: "#FFF7ED",
      secondary: "#18181B",
      secondarySoft: "#F4F4F5",
      accent: "#FDE047",
      accentForeground: "#09090B",
    },
  },
  box_truck_freight: {
    key: "box_truck_freight",
    name: "Sprinter, Box Truck & Pallet Freight",
    shortBadge: "Dock & Freight",
    cargoNoun: "Skids / Pallets",
    heroHeadline: "Dock-to-dock freight,\nsimplified.",
    searchPrompt: "Enter pickup & receiving dock",
    custodyBadge: "Signed BOL + Seal",
    referenceLabel: "BOL / PRO #",
    referencePlaceholder: "BOL-992041",
    defaultInstructionsPlaceholder:
      "Dock door #, liftgate needed, or pallet jack on site...",
    description:
      "Sprinter van, box truck, palletized LTL, warehouse-to-warehouse & regional hotshot runs",
    vehicleLabels: {
      sedan: {
        title: "Hotshot Courier",
        subtitle: "5 min away · Urgent parts & critical documents",
      },
      suv: {
        title: "High-Roof Sprinter",
        subtitle: "8 min away · Up to 2 standard pallets (1,500 lbs)",
      },
      cargo_van: {
        title: "Liftgate Box Freight",
        subtitle: "12 min away · Palletized skids up to 2,500 lbs",
      },
    },
    quickPlaces: [
      {
        label: "Airport Cargo Terminal",
        subtitle: "2500 Airport Expy, Indianapolis",
        address: "2500 Airport Expy, Indianapolis, IN 46241",
      },
      {
        label: "Plainfield Fulfillment Dock",
        subtitle: "2150 Allpoints Pkwy, Plainfield",
        address: "2150 Allpoints Pkwy, Plainfield, IN 46168",
      },
      {
        label: "Bluff Rd Cross-Dock",
        subtitle: "6910 Bluff Rd, Indianapolis",
        address: "6910 Bluff Rd, Indianapolis, IN 46217",
      },
      {
        label: "Whitestown Logistics Park",
        subtitle: "5100 S Indianapolis Rd, Whitestown",
        address: "5100 S Indianapolis Rd, Whitestown, IN 46075",
      },
    ],
    defaultPalette: {
      primary: "#1D4ED8",
      primarySoft: "#EFF6FF",
      secondary: "#B45309",
      secondarySoft: "#FFFBEB",
      accent: "#FCD34D",
      accentForeground: "#09090B",
    },
  },
};

const RULLER_DEFAULT_TENANT_SLUG = "ruller-os";
const PST_TENANT_SLUG = "preferred-solutions-transport";
const PST_LOGO_ASSET: ImageSourcePropType = require("../assets/pst-logo.png");

export interface BrandConfig {
  tenantSlug: string;
  companyName: string;
  shortName: string;
  orderPrefix: string;
  vertical: LogisticsVertical;
  tagline: string;
  bundleId: string;
  scheme: string;
  supportEmail: string;
  supportPhone: string;
  websiteUrl: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
  /** True only when a bespoke wordmark asset is registered in brand-config.ts */
  hasCustomLogoAsset: boolean;
  defaultCoordinates: {
    city: string;
    latitude: number;
    longitude: number;
  };
  defaultPricing: {
    baseFee: number;
    perMileRate: number;
    fuelPct: number;
    minimumCharge: number;
    driverCommissionRate: number;
    hipaaComplianceMode: boolean;
    currency: string;
  };
  theme: {
    primary: string;
    primarySoft: string;
    secondary: string;
    secondarySoft: string;
    accent: string;
    accentForeground: string;
    success: string;
    warning: string;
    destructive: string;
    background: string;
    surface: string;
    border: string;
    foreground: string;
  };
  demoAccounts: {
    role: UserRole;
    label: string;
    email: string;
    password: string;
    description: string;
  }[];
}

export function getTenantLogoAsset(tenantSlug: string): ImageSourcePropType | null {
  if (tenantSlug === PST_TENANT_SLUG) {
    return PST_LOGO_ASSET;
  }
  return null;
}

export function buildTenantBrandConfig(input: {
  tenantSlug: string;
  companyName: string;
  shortName: string;
  orderPrefix: string;
  vertical: LogisticsVertical;
  tagline?: string;
  city?: string;
  supportPhone?: string;
  emailDomain?: string;
  baseFee?: number;
  perMileRate?: number;
  minimumCharge?: number;
  driverCommissionRate?: number;
  hipaaComplianceMode?: boolean;
  primaryColor?: string;
  primarySoftColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}): BrandConfig {
  const cleanPrefix =
    input.orderPrefix
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 5) || "ORD";
  const domain =
    input.emailDomain ||
    `${input.tenantSlug.replace(/[^a-z0-9]/gi, "").toLowerCase() || "courier"}.com`;
  const verticalMeta = VERTICAL_TEMPLATES[input.vertical];
  const palette = verticalMeta.defaultPalette;
  const isDefaultPst = input.tenantSlug === PST_TENANT_SLUG;
  const defaultSiteUrl = isDefaultPst
    ? process.env.EXPO_PUBLIC_API_BASE_URL || `https://${domain}`
    : `https://${domain}`;

  const matchedSwatch = BRAND_COLOR_SWATCHES.find(
    (s) => s.primary.toLowerCase() === input.primaryColor?.toLowerCase()
  );

  return {
    tenantSlug: input.tenantSlug,
    companyName: input.companyName.trim(),
    shortName: input.shortName.trim() || input.companyName.trim(),
    orderPrefix: cleanPrefix,
    vertical: input.vertical,
    tagline:
      input.tagline ||
      "Enterprise logistics dispatch connecting customers, dispatchers, and drivers in real time.",
    bundleId: `com.${input.tenantSlug.replace(/[^a-z0-9]/gi, "").toLowerCase()}.app`,
    scheme: input.tenantSlug.replace(/[^a-z0-9]/gi, "").toLowerCase() || "rulleros",
    supportEmail: `dispatch@${domain}`,
    supportPhone: input.supportPhone || "317-555-0199",
    websiteUrl: defaultSiteUrl,
    privacyPolicyUrl: `${defaultSiteUrl}/privacy`,
    termsOfServiceUrl: `${defaultSiteUrl}/terms`,
    hasCustomLogoAsset: isDefaultPst,
    defaultCoordinates: {
      city: input.city || "Indianapolis, IN",
      latitude: 39.7684,
      longitude: -86.1581,
    },
    defaultPricing: {
      baseFee: input.baseFee ?? 50.0,
      perMileRate: input.perMileRate ?? 2.0,
      fuelPct: 0.085,
      minimumCharge: input.minimumCharge ?? 25.0,
      driverCommissionRate: input.driverCommissionRate ?? 0.7,
      hipaaComplianceMode:
        input.hipaaComplianceMode ?? input.vertical === "medical_stat",
      currency: "usd",
    },
    theme: {
      primary: input.primaryColor || palette.primary,
      primarySoft:
        input.primarySoftColor || matchedSwatch?.primarySoft || palette.primarySoft,
      secondary: input.secondaryColor || palette.secondary,
      secondarySoft: palette.secondarySoft,
      accent: input.accentColor || palette.accent,
      accentForeground: palette.accentForeground,
      success: "#16A34A",
      warning: "#D97706",
      destructive: "#E11D48",
      background: "#FFFFFF",
      surface: "#F4F4F5",
      border: "#E4E4E7",
      foreground: "#09090B",
    },
    demoAccounts: [
      {
        role: "recipient",
        label: "Customer Quote",
        email: `customer@${domain}`,
        password: "Customer123!",
        description: "Instant distance & SLA pricing, checkout, and live GPS tracking",
      },
      {
        role: "driver",
        label: "Driver Portal",
        email: `driver@${domain}`,
        password: "Driver123!",
        description: "Claim open runs, broadcast GPS telemetry, and capture signature PoD",
      },
      {
        role: "dispatcher",
        label: "Dispatch Portal",
        email: `dispatcher@${domain}`,
        password: "Dispatcher123!",
        description: "Control fleet in real time, assign drivers, and monitor active runs",
      },
      {
        role: "admin",
        label: "Admin Portal",
        email: `admin@${domain}`,
        password: "Admin123!",
        description: "Configure rates, driver splits, B2B accounts, and white-label skins",
      },
    ],
  };
}

/**
 * Built-in Tenant Presets:
 * - Preset 0 (Canonical Platform Default): Rüller OS ("ruller-os")
 * - Preset 1 (Client Tenant #1 — First Right of Refusal): Preferred Solutions Transport ("preferred-solutions-transport")
 * - Preset 2 ("ruller-courier"): Rüller Express Courier (Box Truck / Hotshot Freight vertical)
 * - Presets 3–5: Medical STAT, Parts Runner, and Box Freight client templates
 */
export const WHITE_LABEL_PRESETS: BrandConfig[] = [
  buildTenantBrandConfig({
    tenantSlug: "ruller-os",
    companyName: "Rüller OS",
    shortName: "Rüller",
    orderPrefix: "RUL",
    vertical: "commercial_courier",
    tagline:
      "White-label dispatch, live tracking, and proof of delivery for independent fleets.",
    city: "Indianapolis, IN",
    supportPhone: "317-555-0100",
    emailDomain: "rulleros.com",
    baseFee: 45.0,
    perMileRate: 2.1,
    minimumCharge: 25.0,
    primaryColor: "#1D4ED8",
    primarySoftColor: "#EFF6FF",
    secondaryColor: "#09090B",
  }),
  buildTenantBrandConfig({
    tenantSlug: "preferred-solutions-transport",
    companyName: "Preferred Solutions Transport",
    shortName: "PST",
    orderPrefix: "PST",
    vertical: "commercial_courier",
    tagline:
      "Same-day commercial courier connecting customers, dispatchers, and drivers in real time.",
    city: "Indianapolis, IN",
    supportPhone: "317-555-0199",
    emailDomain: "preferredsolutionstransport.com",
    baseFee: 50.0,
    perMileRate: 2.0,
    minimumCharge: 25.0,
  }),
  buildTenantBrandConfig({
    tenantSlug: "ruller-courier",
    companyName: "Rüller Express Courier",
    shortName: "Rüller",
    orderPrefix: "RUL",
    vertical: "box_truck_freight",
    tagline:
      "Multi-tenant freight, courier, and last-mile fleet orchestration built on Rüller OS.",
    city: "Chicago, IL",
    supportPhone: "312-555-0180",
    emailDomain: "rulleros.com",
    baseFee: 45.0,
    perMileRate: 2.25,
    minimumCharge: 25.0,
    primaryColor: "#1D4ED8",
    primarySoftColor: "#EFF6FF",
    secondaryColor: "#0F172A",
  }),
  buildTenantBrandConfig({
    tenantSlug: "medstat-express-logistics",
    companyName: "MedStat Express Logistics",
    shortName: "MedStat",
    orderPrefix: "MED",
    vertical: "medical_stat",
    tagline: "HIPAA-Compliant Lab Specimen, Pharmacy & Hospital STAT Courier",
    city: "Indianapolis, IN",
    supportPhone: "317-555-0210",
    emailDomain: "medstatexpress.com",
    baseFee: 45.0,
    perMileRate: 2.65,
    minimumCharge: 45.0,
    hipaaComplianceMode: true,
  }),
  buildTenantBrandConfig({
    tenantSlug: "crossroads-parts-runner",
    companyName: "Crossroads Parts & Supply",
    shortName: "Crossroads",
    orderPrefix: "CRX",
    vertical: "parts_runner",
    tagline: "Rapid B2B Auto, HVAC & Industrial Supply House Delivery",
    city: "Indianapolis, IN",
    supportPhone: "317-555-0340",
    emailDomain: "crossroadsexpress.com",
    baseFee: 35.0,
    perMileRate: 2.15,
    minimumCharge: 30.0,
  }),
  buildTenantBrandConfig({
    tenantSlug: "heartland-hotshot-freight",
    companyName: "Heartland Box Freight",
    shortName: "Heartland",
    orderPrefix: "HHF",
    vertical: "box_truck_freight",
    tagline: "Expedited Sprinter, Box Truck & Dock-to-Dock Pallet Logistics",
    city: "Indianapolis, IN",
    supportPhone: "317-555-0480",
    emailDomain: "heartlandfreight.com",
    baseFee: 65.0,
    perMileRate: 3.1,
    minimumCharge: 75.0,
  }),
];

export const ACTIVE_TENANT_SLUG = (
  process.env.EXPO_PUBLIC_TENANT_SLUG || RULLER_DEFAULT_TENANT_SLUG
)
  .trim()
  .toLowerCase();

export function resolveTenantBrandConfig(slug?: string | null): BrandConfig {
  const normalized = (slug || ACTIVE_TENANT_SLUG || RULLER_DEFAULT_TENANT_SLUG)
    .trim()
    .toLowerCase();
  const matched = WHITE_LABEL_PRESETS.find(
    (preset) => preset.tenantSlug.toLowerCase() === normalized
  );
  if (matched) {
    return matched;
  }

  const label = normalized
    .split("-")
    .filter(Boolean)
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return buildTenantBrandConfig({
    tenantSlug: normalized,
    companyName: label || "Rüller Logistics",
    shortName: label.split(" ")[0] || "Rüller",
    orderPrefix: (label.replace(/[^A-Za-z0-9]/g, "").slice(0, 3) || "RUL").toUpperCase(),
    vertical: "commercial_courier",
  });
}

// Dynamic boot configuration resolved from EXPO_PUBLIC_TENANT_SLUG
export const BRAND_CONFIG: BrandConfig = resolveTenantBrandConfig(ACTIVE_TENANT_SLUG);
