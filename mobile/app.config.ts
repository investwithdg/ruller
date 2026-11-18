import type { ConfigContext, ExpoConfig } from "expo/config";

const TENANT_APP_PRESETS: Record<
  string,
  {
    name: string;
    slug: string;
    scheme: string;
    bundleId: string;
  }
> = {
  "ruller-os": {
    name: "Rüller OS",
    slug: "ruller-os",
    scheme: "rulleros",
    bundleId: "com.rulleros.app",
  },
  "preferred-solutions-transport": {
    name: "PS Transport",
    slug: "preferred-solutions-transport",
    scheme: "pstransport",
    bundleId: "com.preferredsolutionstransport.app",
  },
  "ruller-courier": {
    name: "Rüller Courier",
    slug: "ruller-courier",
    scheme: "rullercourier",
    bundleId: "com.rullercourier.app",
  },
  "medstat-express-logistics": {
    name: "MedStat Express",
    slug: "medstat-express-logistics",
    scheme: "medstatexpress",
    bundleId: "com.medstatexpress.app",
  },
  "crossroads-parts-runner": {
    name: "Crossroads Parts",
    slug: "crossroads-parts-runner",
    scheme: "crossroadsparts",
    bundleId: "com.crossroadsparts.app",
  },
  "heartland-hotshot-freight": {
    name: "Heartland Freight",
    slug: "heartland-hotshot-freight",
    scheme: "heartlandfreight",
    bundleId: "com.heartlandfreight.app",
  },
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const tenantSlug = (
    process.env.EXPO_PUBLIC_TENANT_SLUG || "ruller-os"
  )
    .trim()
    .toLowerCase();

  const preset = TENANT_APP_PRESETS[tenantSlug] || {
    name: "Rüller OS",
    slug: tenantSlug || "ruller-os",
    scheme: (tenantSlug || "rulleros").replace(/[^a-z0-9]/g, ""),
    bundleId: `com.${(tenantSlug || "rulleros").replace(/[^a-z0-9]/g, "")}.app`,
  };

  const appDisplayName = preset.name;
  const appVariant = process.env.APP_VARIANT || "production";

  return {
    ...config,
    name: appDisplayName,
    slug: preset.slug,
    scheme: preset.scheme,
    version: config.version || "1.0.0",
    orientation: config.orientation || "portrait",
    userInterfaceStyle: "light",
    extra: {
      ...config.extra,
      tenantSlug,
      appVariant,
    },
    ios: {
      ...config.ios,
      bundleIdentifier: preset.bundleId,
      infoPlist: {
        ...config.ios?.infoPlist,
        NSLocationWhenInUseUsageDescription: `${appDisplayName} uses your location to calculate delivery routes, assign nearby drivers, and display live order tracking.`,
        NSLocationAlwaysAndWhenInUseUsageDescription: `${appDisplayName} uses background location while drivers are on duty so dispatchers and customers receive real-time tracking updates.`,
        NSCameraUsageDescription: `${appDisplayName} uses your camera so drivers can capture Proof of Delivery photos at dropoff.`,
        NSPhotoLibraryUsageDescription: `${appDisplayName} accesses your photo library so drivers can attach Proof of Delivery images.`,
      },
    },
    android: {
      ...config.android,
      package: preset.bundleId,
    },
  };
};
