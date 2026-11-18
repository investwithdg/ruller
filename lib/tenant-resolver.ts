/**
 * Multi-Tenant & White-Label Domain Resolution Engine
 *
 * Resolves tenant branding, slugs, and styling based on incoming Host headers
 * (wildcard subdomains e.g. pst.rulleros.com, custom domains e.g. book.preferredsolutions.com,
 * or explicit query parameters ?tenant=pst).
 */

export interface TenantInfo {
  slug: string;
  companyName: string;
  shortName: string;
  orderPrefix: string;
  primaryColor: string;
  accentColor: string;
  supportEmail: string;
  supportPhone: string;
  isWhiteLabel: boolean;
  tagline: string;
}

export const KNOWN_TENANTS: Record<string, TenantInfo> = {
  'preferred-solutions-transport': {
    slug: 'preferred-solutions-transport',
    companyName: 'Preferred Solutions Transport',
    shortName: 'PST',
    orderPrefix: 'PST',
    primaryColor: '#064AF9', // Electric Cobalt Blue
    accentColor: '#CCF427',  // Volt Lime
    supportEmail: 'dispatch@preferredsolutions.com',
    supportPhone: '(317) 555-0199',
    isWhiteLabel: true,
    tagline: 'Reliable Regional Same-Day Logistics & Courier Services',
  },
  'swift-courier': {
    slug: 'swift-courier',
    companyName: 'Swift Regional Courier',
    shortName: 'Swift',
    orderPrefix: 'SWF',
    primaryColor: '#2563EB',
    accentColor: '#10B981',
    supportEmail: 'ops@swiftcourier.com',
    supportPhone: '(312) 555-0144',
    isWhiteLabel: true,
    tagline: 'High-Velocity B2B & Dedicated Fleet Routing',
  },
  'metro-stat': {
    slug: 'metro-stat',
    companyName: 'Metro STAT Medical Logistics',
    shortName: 'MetroSTAT',
    orderPrefix: 'MED',
    primaryColor: '#DC2626',
    accentColor: '#F59E0B',
    supportEmail: 'stat@metromedlogistics.com',
    supportPhone: '(800) 555-STAT',
    isWhiteLabel: true,
    tagline: 'HIPAA-Compliant Specimen, Pharma & Cold-Chain Transport',
  },
  'ruller-os': {
    slug: 'ruller-os',
    companyName: 'Rüller OS',
    shortName: 'Rüller',
    orderPrefix: 'RUL',
    primaryColor: '#09090B',
    accentColor: '#064AF9',
    supportEmail: 'support@rulleros.com',
    supportPhone: '(888) 785-5370',
    isWhiteLabel: false,
    tagline: 'Autonomous Last-Mile Transit & Dispatch Engine',
  },
};

// Aliases for quick matching
const TENANT_ALIASES: Record<string, string> = {
  pst: 'preferred-solutions-transport',
  'preferred-solutions': 'preferred-solutions-transport',
  preferred: 'preferred-solutions-transport',
  swift: 'swift-courier',
  metro: 'metro-stat',
  stat: 'metro-stat',
  ruller: 'ruller-os',
};

// Known custom domain mappings (CNAME records)
const CUSTOM_DOMAIN_MAP: Record<string, string> = {
  'book.preferredsolutionstransport.com': 'preferred-solutions-transport',
  'dispatch.preferredsolutionstransport.com': 'preferred-solutions-transport',
  'delivery.preferredsolutionstransport.com': 'preferred-solutions-transport',
  'book.swiftcourier.com': 'swift-courier',
  'track.swiftcourier.com': 'swift-courier',
};

export const DEFAULT_TENANT = KNOWN_TENANTS['ruller-os'];

export function resolveTenantFromSlug(rawSlug?: string | null): TenantInfo {
  if (!rawSlug) return DEFAULT_TENANT;
  const clean = rawSlug.trim().toLowerCase();
  const canonicalSlug = TENANT_ALIASES[clean] || clean;
  return KNOWN_TENANTS[canonicalSlug] || DEFAULT_TENANT;
}

export function resolveTenantFromHost(hostHeader?: string | null): TenantInfo {
  if (!hostHeader) return DEFAULT_TENANT;

  // Clean host header (strip port)
  const host = hostHeader.split(':')[0].toLowerCase().trim();

  // 1. Direct custom domain match
  if (CUSTOM_DOMAIN_MAP[host]) {
    return resolveTenantFromSlug(CUSTOM_DOMAIN_MAP[host]);
  }

  // 2. Subdomain extraction (*.rulleros.com, *.ruller.app, *.localhost)
  const parts = host.split('.');
  
  // Example: pst.rulleros.com -> parts = ['pst', 'rulleros', 'com']
  // Example: pst.localhost -> parts = ['pst', 'localhost']
  if (parts.length >= 2) {
    const subdomain = parts[0];
    // Ignore reserved / root subdomains
    if (!['www', 'app', 'api', 'admin', 'mail', 'localhost'].includes(subdomain)) {
      return resolveTenantFromSlug(subdomain);
    }
  }

  return DEFAULT_TENANT;
}
