import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Share } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase";
import {
  ACTIVE_TENANT_SLUG,
  BRAND_CONFIG,
  VERTICAL_TEMPLATES,
  type BrandConfig,
  type UserRole,
} from "./brand-config";
import type { OrderStatus } from "./database.types";
import {
  calculateDeliveryQuote,
  type AccessorialKey,
  type BillingMode,
  type PricingRules,
  type ServiceLevel,
  type VehicleClass,
} from "./pricing-engine";
import {
  clearOfflineQueue,
  drainOfflineQueue,
  enqueueOfflineMutation,
  loadOfflineQueue,
  subscribeToConnectivity,
  type OfflineQueuedMutation,
} from "./offline-queue";
import {
  distanceBetweenMeters,
  startDriverLocationTracking,
  stopDriverLocationTracking,
  subscribeToTenantRealtime,
} from "./location-tracker";
import {
  exportOrdersToCsv,
  parseImportedClients,
  parseImportedDrivers,
  parseImportedOrders,
  syncOrderLifecycleEvent,
  type CrmConnectorSettings,
  type OpsImportDatasetType,
  type TenantOnboardingState,
} from "./ops-data-portability";

export type DriverShiftStatus = "Offline" | "Available" | "OnDuty";

export type DeliveryStepStage =
  | "en_route_pickup"
  | "arrived_pickup"
  | "cargo_loaded"
  | "en_route_dropoff"
  | "arrived_dropoff"
  | "delivered";

export interface MobileOrder {
  id: string;
  tenantId: string;
  orderNumber: string;
  status: OrderStatus;
  deliveryStage?: DeliveryStepStage;
  exceptionReason?: string | null;
  priceTotal: number;
  driverPayout: number;
  platformMargin: number;
  distanceMi: number;
  weightLb: number;
  vehicleType: VehicleClass;
  serviceLevel: ServiceLevel;
  accessorials: AccessorialKey[];
  billingMode: BillingMode;
  poNumber?: string;
  pickupAddress: string;
  dropoffAddress: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  specialInstructions?: string;
  driverId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  driverVehicle: string | null;
  stripePaid: boolean;
  createdAt: string;
  updatedAt: string;
  driverLat?: number;
  driverLng?: number;
  driverSpeedMph?: number;
  pickupCustodyAt?: string | null;
  pickupCustodyLat?: number | null;
  pickupCustodyLng?: number | null;
  pod?: {
    recipientName: string;
    notes: string;
    photoUrls: string[];
    signatureConfirmed: boolean;
    signatureSvg?: string;
    gpsLat: number;
    gpsLng: number;
    gpsAccuracyMeters: number;
    geofenceVerified: boolean;
    custodyCertificateId: string;
    deliveredAt: string;
  } | null;
}

export interface MobileDriver {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  vehicleDetails: string;
  vehicleType: VehicleClass;
  isAvailable: boolean;
  docVerified: boolean;
  licenseExpiry: string;
  insuranceStatus: "Verified" | "Pending Review";
  activeOrdersCount: number;
  latitude: number;
  longitude: number;
  speedMph: number;
  lastUpdated: string;
}

export interface MobileUserRecord {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  corporateAccountApproved?: boolean;
  createdAt: string;
}

export interface MobileAuditEvent {
  id: string;
  orderId: string | null;
  actor: string;
  eventType: string;
  summary: string;
  createdAt: string;
}

export interface ApiHealthStatus {
  supabaseConfigured: boolean;
  networkOnline: boolean;
  realtimeConnected: boolean;
  pendingOfflineCount: number;
  lastSyncAt: string;
}

export interface SavedPaymentCard {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
  cardholderName: string;
}

export interface SimulationState {
  active: boolean;
  currentStep: number;
  totalSteps: number;
  message: string;
  orderId: string | null;
}

interface AuthContextValue {
  session: Session | null;
  userEmail: string | null;
  userRole: UserRole;
  activeRole: UserRole;
  isDemoMode: boolean;
  isRoleLocked: boolean;
  loading: boolean;
  orders: MobileOrder[];
  drivers: MobileDriver[];
  users: MobileUserRecord[];
  auditEvents: MobileAuditEvent[];
  brandConfig: BrandConfig;
  pricingRules: PricingRules;
  driverShiftStatus: DriverShiftStatus;
  isDriverTrackingGps: boolean;
  isOfflineSimulated: boolean;
  networkOnline: boolean;
  offlineQueue: OfflineQueuedMutation[];
  apiHealth: ApiHealthStatus;
  crmSettings: CrmConnectorSettings;
  onboardingState: TenantOnboardingState;
  savedCards: SavedPaymentCard[];
  selectedPaymentMethodId: string;
  simulationState: SimulationState;
  setActiveRole: (role: UserRole) => void;
  setIsRoleLocked: (locked: boolean) => void;
  toggleRoleLock: () => void;
  setDriverShiftStatus: (nextStatus: DriverShiftStatus) => Promise<void>;
  applyWhiteLabelTenant: (nextBrand: BrandConfig) => Promise<void>;
  exportClientInstallConfig: () => Promise<void>;
  updateCrmSettings: (next: CrmConnectorSettings) => Promise<void>;
  updateOnboardingState: (patch: Partial<TenantOnboardingState>) => void;
  addPaymentCard: (input: {
    number: string;
    expiry: string;
    cvc: string;
    cardholderName: string;
    zip: string;
  }) => SavedPaymentCard;
  selectPaymentMethod: (methodId: string) => void;
  moveOrderInQueue: (orderId: string, direction: "up" | "down") => void;
  toggleOrderPriority: (orderId: string) => void;
  shareBetaAccessInvite: () => Promise<void>;
  sendDriverInviteLink: (
    name: string,
    phone: string,
    vehicleDetails?: string,
    vehicleType?: VehicleClass
  ) => Promise<void>;
  shareCustomerBookingLink: () => Promise<void>;
  importOpsDataset: (
    datasetType: OpsImportDatasetType,
    rawText: string
  ) => Promise<{ importedCount: number; message: string }>;
  exportLedgerCsv: () => Promise<string>;
  resetDemoWorkspace: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithPhone: (
    phone: string,
    otpCode?: string,
    role?: UserRole
  ) => Promise<{ error?: string; role?: UserRole }>;
  signUp: (
    name: string,
    email: string,
    phone: string,
    password: string,
    role: UserRole
  ) => Promise<{ error?: string }>;
  enterDemoMode: (initialRole?: UserRole) => void;
  startLiveRunSimulation: (orderId?: string) => void;
  advanceSimulationStep: () => void;
  stopLiveRunSimulation: () => void;
  signOut: () => Promise<void>;
  deleteOwnAccount: () => Promise<{ error?: string }>;
  refreshOperationalState: () => Promise<void>;
  createOrderFromQuote: (input: {
    pickupAddress: string;
    dropoffAddress: string;
    distanceMi: number;
    weightLb: number;
    vehicleType?: VehicleClass;
    serviceLevel?: ServiceLevel;
    accessorials?: AccessorialKey[];
    billingMode?: BillingMode;
    poNumber?: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    specialInstructions?: string;
  }) => Promise<MobileOrder>;
  assignDriverToOrder: (orderId: string, driverId: string) => Promise<void>;
  autoDispatchNearestDriver: (orderId: string) => Promise<MobileDriver | null>;
  reportOrderException: (orderId: string, reason: string) => Promise<void>;
  resolveOrderException: (orderId: string) => Promise<void>;
  claimOpenOrder: (orderId: string, driverId?: string) => Promise<void>;
  declineOpenOrder: (orderId: string) => Promise<void>;
  confirmPickupCustody: (orderId: string) => Promise<void>;
  advanceDeliveryStage: (orderId: string, stage: DeliveryStepStage) => Promise<void>;
  updateOrderStatus: (orderId: string, nextStatus: OrderStatus, actorLabel?: string) => Promise<void>;
  submitProofOfDelivery: (input: {
    orderId: string;
    recipientName: string;
    notes: string;
    photoUris: string[];
    signatureConfirmed: boolean;
    signatureSvg?: string;
  }) => Promise<void>;
  shareOrderTrackingLink: (order: MobileOrder) => Promise<void>;
  toggleDriverGps: () => void;
  toggleOfflineSimulation: () => void;
  flushOfflineSyncQueue: () => Promise<number>;
  pulseDriverTelemetry: () => void;
  spawnDemoDriverOrder: () => void;
  updatePricingRules: (nextRules: PricingRules) => Promise<void>;
  addFleetDriver: (
    name: string,
    phone: string,
    vehicleDetails: string,
    vehicleType?: VehicleClass
  ) => Promise<void>;
  verifyDriverDocs: (driverId: string, verified: boolean) => Promise<void>;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
}

const DEFAULT_SAMPLE_SIGNATURE_SVG =
  "M28,68 L40,52 L54,74 L68,58 L84,71 L102,49 L118,72 L136,61 L154,69 L174,54 L196,70 L218,63 L242,68";

function getDemoEmail(brand: BrandConfig, role: UserRole): string {
  return (
    brand.demoAccounts.find((acct) => acct.role === role)?.email ||
    `${role}@${brand.tenantSlug}.local`
  );
}

function buildInitialDrivers(brand: BrandConfig): MobileDriver[] {
  const { latitude, longitude } = brand.defaultCoordinates;
  const tenantId = brand.tenantSlug;
  return [
    {
      id: "drv-101",
      tenantId,
      name: "Marcus Vance",
      phone: "317-555-0142",
      vehicleDetails: "2024 Ford Transit 250 High Roof • FLT-4821",
      vehicleType: "cargo_van",
      isAvailable: true,
      docVerified: true,
      licenseExpiry: "2027-09-30",
      insuranceStatus: "Verified",
      activeOrdersCount: 2,
      latitude,
      longitude,
      speedMph: 34,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "drv-102",
      tenantId,
      name: "Devon Brooks",
      phone: "317-555-0188",
      vehicleDetails: "2023 Honda CR-V Hybrid AWD • FLT-9014",
      vehicleType: "suv",
      isAvailable: true,
      docVerified: true,
      licenseExpiry: "2027-04-15",
      insuranceStatus: "Verified",
      activeOrdersCount: 0,
      latitude: Number((latitude + 0.058).toFixed(4)),
      longitude: Number((longitude + 0.012).toFixed(4)),
      speedMph: 28,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "drv-103",
      tenantId,
      name: "Elena Rostova",
      phone: "317-555-0165",
      vehicleDetails: "2024 Toyota Camry Fleet • FLT-3319",
      vehicleType: "sedan",
      isAvailable: true,
      docVerified: true,
      licenseExpiry: "2028-01-20",
      insuranceStatus: "Verified",
      activeOrdersCount: 0,
      latitude: Number((latitude - 0.027).toFixed(4)),
      longitude: Number((longitude - 0.052).toFixed(4)),
      speedMph: 22,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "drv-104",
      tenantId,
      name: "Jalen Carter",
      phone: "317-555-0194",
      vehicleDetails: "2025 Isuzu NPR Box Truck • FLT-7740",
      vehicleType: "cargo_van",
      isAvailable: true,
      docVerified: false,
      licenseExpiry: "2026-12-01",
      insuranceStatus: "Pending Review",
      activeOrdersCount: 0,
      latitude: Number((latitude + 0.021).toFixed(4)),
      longitude: Number((longitude - 0.031).toFixed(4)),
      speedMph: 31,
      lastUpdated: new Date().toISOString(),
    },
  ];
}

function buildInitialOrders(brand: BrandConfig): MobileOrder[] {
  const prefix = brand.orderPrefix;
  const tenantId = brand.tenantSlug;
  const customerEmail = getDemoEmail(brand, "recipient");
  const places = VERTICAL_TEMPLATES[brand.vertical].quickPlaces;
  const p0 = places[0]?.address || "6910 Bluff Rd, Indianapolis, IN 46217";
  const p1 = places[1]?.address || "9708 E US Highway 36, Avon, IN 46123";
  const p2 = places[2]?.address || "400 W Maryland St, Indianapolis, IN 46225";
  const p3 = places[3]?.address || "8702 Keystone Crossing, Indianapolis, IN 46240";
  const { latitude, longitude } = brand.defaultCoordinates;

  return [
    {
      id: "ord-9041",
      tenantId,
      orderNumber: `${prefix}-9041`,
      status: "InTransit",
      deliveryStage: "en_route_dropoff",
      exceptionReason: null,
      priceTotal: 142.8,
      driverPayout: 103.56,
      platformMargin: 39.24,
      distanceMi: 18.0,
      weightLb: 145,
      vehicleType: "cargo_van",
      serviceLevel: "stat_90m",
      accessorials: ["inside_delivery", "heavy_lift"],
      billingMode: "corporate_net_terms",
      poNumber: `${prefix}-PO-88412`,
      pickupAddress: p0,
      dropoffAddress: p1,
      customerName: "Heartland Commercial Operations",
      customerEmail,
      customerPhone: "317-555-0123",
      specialInstructions: "Priority dock drop. Obtain receiver signature & photo proof.",
      driverId: "drv-101",
      driverName: "Marcus Vance",
      driverPhone: "317-555-0142",
      driverVehicle: "2024 Ford Transit 250 High Roof • FLT-4821",
      stripePaid: true,
      createdAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      driverLat: latitude,
      driverLng: longitude,
      driverSpeedMph: 34,
      pickupCustodyAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
      pickupCustodyLat: Number((latitude - 0.09).toFixed(4)),
      pickupCustodyLng: Number((longitude - 0.02).toFixed(4)),
      pod: null,
    },
    {
      id: "ord-9042",
      tenantId,
      orderNumber: `${prefix}-9042`,
      status: "ReadyForDispatch",
      exceptionReason: null,
      priceTotal: 96.5,
      driverPayout: 71.15,
      platformMargin: 25.35,
      distanceMi: 12.0,
      weightLb: 14,
      vehicleType: "sedan",
      serviceLevel: "stat_90m",
      accessorials: ["round_trip", "inside_delivery"],
      billingMode: "corporate_net_terms",
      poNumber: `MATTER-2026-4410`,
      pickupAddress: p2,
      dropoffAddress: p3,
      customerName: "Meridian Corporate Group",
      customerEmail,
      customerPhone: "317-555-0177",
      specialInstructions: "Priority SLA window. Verify chain-of-custody badge at intake.",
      driverId: null,
      driverName: null,
      driverPhone: null,
      driverVehicle: null,
      stripePaid: true,
      createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      pod: null,
    },
    {
      id: "ord-9043",
      tenantId,
      orderNumber: `${prefix}-9043`,
      status: "ReadyForDispatch",
      exceptionReason: "Dock Gate Delayed (15m hold)",
      priceTotal: 118.4,
      driverPayout: 86.48,
      platformMargin: 31.92,
      distanceMi: 16.4,
      weightLb: 110,
      vehicleType: "suv",
      serviceLevel: "urgent_3h",
      accessorials: ["inside_delivery"],
      billingMode: "card",
      poNumber: `${prefix}-AUTO-9921`,
      pickupAddress: p1,
      dropoffAddress: p2,
      customerName: "Crossroads Precision Logistics",
      customerEmail,
      customerPhone: "317-555-0192",
      specialInstructions: "Drop at Receiving Bay 4. Call bay lead on arrival.",
      driverId: null,
      driverName: null,
      driverPhone: null,
      driverVehicle: null,
      stripePaid: true,
      createdAt: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
      pod: null,
    },
    {
      id: "ord-9040",
      tenantId,
      orderNumber: `${prefix}-9040`,
      status: "Assigned",
      deliveryStage: "en_route_pickup",
      exceptionReason: null,
      priceTotal: 128.0,
      driverPayout: 98.0,
      platformMargin: 30.0,
      distanceMi: 22.0,
      weightLb: 95,
      vehicleType: "cargo_van",
      serviceLevel: "urgent_3h",
      accessorials: ["heavy_lift"],
      billingMode: "corporate_net_terms",
      poNumber: `${prefix}-PO-77190`,
      pickupAddress: p3,
      dropoffAddress: p0,
      customerName: "Capitol Commercial Accounts",
      customerEmail,
      customerPhone: "317-555-0192",
      specialInstructions: "12 cartons. Hand-truck required at receiving bay.",
      driverId: "drv-101",
      driverName: "Marcus Vance",
      driverPhone: "317-555-0142",
      driverVehicle: "2024 Ford Transit 250 High Roof • FLT-4821",
      stripePaid: true,
      createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      driverLat: Number((latitude - 0.016).toFixed(4)),
      driverLng: Number((longitude - 0.083).toFixed(4)),
      driverSpeedMph: 0,
      pod: null,
    },
    {
      id: "ord-9038",
      tenantId,
      orderNumber: `${prefix}-9038`,
      status: "Delivered",
      deliveryStage: "delivered",
      exceptionReason: null,
      priceTotal: 84.5,
      driverPayout: 62.75,
      platformMargin: 21.75,
      distanceMi: 8.5,
      weightLb: 22,
      vehicleType: "sedan",
      serviceLevel: "stat_90m",
      accessorials: ["inside_delivery"],
      billingMode: "corporate_net_terms",
      poNumber: `${prefix}-PO-3019`,
      pickupAddress: p2,
      dropoffAddress: p3,
      customerName: "Midwest Corporate Filings",
      customerEmail,
      customerPhone: "317-555-0123",
      specialInstructions: "Verify recipient ID at Suite 210 reception desk.",
      driverId: "drv-102",
      driverName: "Devon Brooks",
      driverPhone: "317-555-0188",
      driverVehicle: "2023 Honda CR-V Hybrid AWD • FLT-9014",
      stripePaid: true,
      createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      pickupCustodyAt: new Date(Date.now() - 160 * 60 * 1000).toISOString(),
      pickupCustodyLat: latitude,
      pickupCustodyLng: longitude,
      pod: {
        recipientName: "Sarah Jenkins, Intake Lead",
        notes: "Handed directly to recipient at Suite 210 Desk. Geofence verified within 14m.",
        photoUrls: ["https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600"],
        signatureConfirmed: true,
        signatureSvg: DEFAULT_SAMPLE_SIGNATURE_SVG,
        gpsLat: Number((latitude + 0.006).toFixed(4)),
        gpsLng: Number((longitude - 0.018).toFixed(4)),
        gpsAccuracyMeters: 8.4,
        geofenceVerified: true,
        custodyCertificateId: `CERT-${prefix}-9038-101`,
        deliveredAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
    },
  ];
}

function buildInitialUsers(brand: BrandConfig): MobileUserRecord[] {
  const tenantId = brand.tenantSlug;
  return [
    {
      id: "usr-admin",
      tenantId,
      email: getDemoEmail(brand, "admin"),
      role: "admin",
      corporateAccountApproved: true,
      createdAt: "2025-11-01T10:00:00Z",
    },
    {
      id: "usr-dispatch",
      tenantId,
      email: getDemoEmail(brand, "dispatcher"),
      role: "dispatcher",
      corporateAccountApproved: true,
      createdAt: "2025-11-01T10:05:00Z",
    },
    {
      id: "usr-driver-1",
      tenantId,
      email: getDemoEmail(brand, "driver"),
      role: "driver",
      corporateAccountApproved: false,
      createdAt: "2025-11-01T10:10:00Z",
    },
    {
      id: "usr-cust-1",
      tenantId,
      email: getDemoEmail(brand, "recipient"),
      role: "recipient",
      corporateAccountApproved: true,
      createdAt: "2025-11-01T10:15:00Z",
    },
  ];
}

function buildInitialAudit(brand: BrandConfig): MobileAuditEvent[] {
  const prefix = brand.orderPrefix;
  return [
    {
      id: "evt-1",
      orderId: "ord-9041",
      actor: "driver:Marcus Vance",
      eventType: "PICKUP_CUSTODY_STAMPED",
      summary: `${prefix}-9041 Pickup BOL & GPS Custody stamped • In Transit`,
      createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    },
    {
      id: "evt-2",
      orderId: "ord-9042",
      actor: "billing:corporate_net_terms",
      eventType: "B2B_ORDER_BROADCAST",
      summary: `${prefix}-9042 (STAT 90m • $71.15 Driver Payout) posted to Open Run Board`,
      createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    },
    {
      id: "evt-3",
      orderId: "ord-9040",
      actor: "dispatcher:ops",
      eventType: "DRIVER_ASSIGNED",
      summary: `Assigned Marcus Vance to ${prefix}-9040 ($98.00 Driver Payout)`,
      createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    },
    {
      id: "evt-4",
      orderId: "ord-9038",
      actor: "driver:Devon Brooks",
      eventType: "CHAIN_OF_CUSTODY_CERTIFIED",
      summary: `Cert #CERT-${prefix}-9038-101 issued • Signature + Photo + Geofence (8.4m)`,
      createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    },
  ];
}

const AuthContext = createContext<AuthContextValue | null>(null);

const WHITE_LABEL_STORAGE_KEY = `ruller_active_tenant_v6_${ACTIVE_TENANT_SLUG}`;
const OPS_STATE_STORAGE_KEY = `ruller_ops_state_v2_${ACTIVE_TENANT_SLUG}`;
const ROLE_LOCK_STORAGE_KEY = `ruller_role_locked_v1_${ACTIVE_TENANT_SLUG}`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("recipient");
  const [activeRole, setActiveRole] = useState<UserRole>("recipient");
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [isRoleLocked, setIsRoleLockedState] = useState<boolean>(false);
  const [simulationState, setSimulationState] = useState<SimulationState>({
    active: false,
    currentStep: 0,
    totalSteps: 5,
    message: "",
    orderId: null,
  });
  const [loading, setLoading] = useState<boolean>(true);

  const [brandConfig, setBrandConfig] = useState<BrandConfig>(BRAND_CONFIG);
  const [orders, setOrders] = useState<MobileOrder[]>(() => buildInitialOrders(BRAND_CONFIG));
  const [drivers, setDrivers] = useState<MobileDriver[]>(() => buildInitialDrivers(BRAND_CONFIG));
  const [users, setUsers] = useState<MobileUserRecord[]>(() => buildInitialUsers(BRAND_CONFIG));
  const [auditEvents, setAuditEvents] = useState<MobileAuditEvent[]>(() =>
    buildInitialAudit(BRAND_CONFIG)
  );
  const [pricingRules, setPricingRules] = useState<PricingRules>(BRAND_CONFIG.defaultPricing);
  const [driverShiftStatus, setDriverShiftStatusState] =
    useState<DriverShiftStatus>("OnDuty");
  const [isOfflineSimulated, setIsOfflineSimulated] = useState<boolean>(false);
  const [networkOnline, setNetworkOnline] = useState<boolean>(true);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueuedMutation[]>([]);
  const [realtimeConnected, setRealtimeConnected] = useState<boolean>(false);
  const [lastSyncAt, setLastSyncAt] = useState<string>(() => new Date().toISOString());
  const [crmSettings, setCrmSettings] = useState<CrmConnectorSettings>({
    mode: "csv_only",
    hubspotPrivateAppToken: "",
    hubspotPipelineId: "default",
    webhookUrl: "",
    autoSyncOnDelivered: true,
    lastSyncStatus: "Standby",
  });
  const [onboardingState, setOnboardingState] = useState<TenantOnboardingState>({
    brandConfigured: true,
    ratesConfigured: true,
    dataOrCrmConnected: false,
    teamAndBookingShared: false,
    wizardCompleted: false,
    dismissedCustomerGuide: false,
    dismissedDriverGuide: false,
    dismissedDispatchGuide: false,
  });
  const [savedCards, setSavedCards] = useState<SavedPaymentCard[]>([
    {
      id: "card-visa-8841",
      brand: "Visa",
      last4: "8841",
      expiry: "09/28",
      cardholderName: "Alex Morgan",
    },
  ]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] =
    useState<string>("apple_pay");

  const isDriverTrackingGps = driverShiftStatus === "OnDuty";

  const appendAudit = useCallback(
    (
      actor: string,
      eventType: string,
      summary: string,
      orderId: string | null = null
    ) => {
      setAuditEvents((prev) => [
        {
          id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          orderId,
          actor,
          eventType,
          summary,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    },
    []
  );

  const flushOfflineSyncQueue = useCallback(async (): Promise<number> => {
    const queue = await loadOfflineQueue();
    if (queue.length === 0) return 0;

    const result = await drainOfflineQueue(async (item) => {
      if (!isSupabaseConfigured) {
        return true;
      }
      const { error } = await supabase.from("dispatch_events").insert({
        tenant_id: item.tenantId,
        organization_id: item.tenantId,
        order_id: item.orderId.startsWith("ord-") ? null : item.orderId,
        actor: "driver:offline-sync",
        event_type: item.type,
        payload: item.payload as Record<string, string | number | boolean | null>,
        source: "mobile-offline-queue",
      });
      return !error;
    });

    setOfflineQueue(result.remaining);
    if (result.flushedCount > 0) {
      setLastSyncAt(new Date().toISOString());
      appendAudit(
        "offline-queue:sync",
        "OFFLINE_QUEUE_SYNCED",
        `Synchronized ${result.flushedCount} offline field operation(s)`
      );
    }
    return result.flushedCount;
  }, [appendAudit]);

  const inferRoleFromEmail = useCallback((email: string): UserRole => {
    const lower = email.toLowerCase();
    if (lower.includes("admin")) return "admin";
    if (lower.includes("dispatch")) return "dispatcher";
    if (lower.includes("driver")) return "driver";
    return "recipient";
  }, []);

  const refreshOperationalState = useCallback(async () => {
    if (!isSupabaseConfigured) return;

    try {
      const { data: pricingRow } = await supabase
        .from("pricing_settings")
        .select("*")
        .eq("tenant_id", brandConfig.tenantSlug)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (pricingRow) {
        setPricingRules((prev) => ({
          ...prev,
          id: pricingRow.id,
          baseFee: Number(pricingRow.base_fee),
          perMileRate: Number(pricingRow.per_mile_rate),
          fuelPct: Number(pricingRow.fuel_pct),
          minimumCharge: Number(pricingRow.minimum_charge),
          currency: pricingRow.currency || "usd",
        }));
      }
      setLastSyncAt(new Date().toISOString());
    } catch {
      // Deterministic local mock seed state guarantees zero fatal failures
    }
  }, [brandConfig.tenantSlug]);

  const loadUserRoleAndData = useCallback(
    async (authUid: string, email: string) => {
      if (!isSupabaseConfigured) return;

      try {
        const { data: userRow } = await supabase
          .from("users")
          .select("role")
          .eq("auth_id", authUid)
          .single();

        const resolvedRole: UserRole =
          (userRow?.role as UserRole) || inferRoleFromEmail(email);
        setUserRole(resolvedRole);
        setActiveRole(resolvedRole);

        await refreshOperationalState();
      } catch {
        const fallbackRole = inferRoleFromEmail(email);
        setUserRole(fallbackRole);
        setActiveRole(fallbackRole);
      }
    },
    [inferRoleFromEmail, refreshOperationalState]
  );

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const cachedQueue = await loadOfflineQueue();
      if (mounted) {
        setOfflineQueue(cachedQueue);
      }

      try {
        const savedTenantRaw = await AsyncStorage.getItem(WHITE_LABEL_STORAGE_KEY);
        if (savedTenantRaw && mounted) {
          const parsedTenant = JSON.parse(savedTenantRaw) as BrandConfig;
          if (
            parsedTenant?.tenantSlug === ACTIVE_TENANT_SLUG &&
            parsedTenant?.companyName &&
            parsedTenant?.orderPrefix &&
            parsedTenant?.theme?.primarySoft &&
            typeof parsedTenant?.hasCustomLogoAsset === "boolean"
          ) {
            setBrandConfig(parsedTenant);
            setPricingRules(parsedTenant.defaultPricing);
          }
        }

        const savedOpsRaw = await AsyncStorage.getItem(OPS_STATE_STORAGE_KEY);
        if (savedOpsRaw && mounted) {
          const parsedOps = JSON.parse(savedOpsRaw) as {
            orders?: MobileOrder[];
            drivers?: MobileDriver[];
            pricingRules?: PricingRules;
            crmSettings?: CrmConnectorSettings;
            onboardingState?: TenantOnboardingState;
          };
          if (Array.isArray(parsedOps.orders) && parsedOps.orders.length > 0) {
            setOrders(parsedOps.orders);
          }
          if (Array.isArray(parsedOps.drivers) && parsedOps.drivers.length > 0) {
            setDrivers(parsedOps.drivers);
          }
          if (parsedOps.pricingRules?.baseFee !== undefined) {
            setPricingRules(parsedOps.pricingRules);
          }
          if (parsedOps.crmSettings?.mode) {
            setCrmSettings(parsedOps.crmSettings);
          }
          if (parsedOps.onboardingState) {
            setOnboardingState((prev) => ({
              ...prev,
              ...parsedOps.onboardingState,
            }));
          }
        }

        const savedRoleLock = await AsyncStorage.getItem(ROLE_LOCK_STORAGE_KEY);
        if (savedRoleLock !== null && mounted) {
          setIsRoleLockedState(savedRoleLock === "true");
        }
      } catch {
        // Keep env-resolved default tenant on cold start
      }

      if (!isSupabaseConfigured) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (mounted && currentSession?.user) {
          setSession(currentSession);
          setUserEmail(currentSession.user.email ?? null);
          await loadUserRoleAndData(currentSession.user.id, currentSession.user.email ?? "");
        }
      } catch {
        // Offline resilience on cold start
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void bootstrap();

    const unsubNetInfo = subscribeToConnectivity((online) => {
      setNetworkOnline(online);
      if (online && !isOfflineSimulated) {
        void flushOfflineSyncQueue();
      }
    });

    let unsubAuth: (() => void) | null = null;
    if (isSupabaseConfigured) {
      const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
        setSession(nextSession);
        if (nextSession?.user) {
          setUserEmail(nextSession.user.email ?? null);
          await loadUserRoleAndData(nextSession.user.id, nextSession.user.email ?? "");
        }
      });
      unsubAuth = () => sub.subscription.unsubscribe();
    }

    return () => {
      mounted = false;
      unsubNetInfo();
      unsubAuth?.();
    };
  }, [flushOfflineSyncQueue, isOfflineSimulated, loadUserRoleAndData]);

  // Subscribe to Realtime telemetry & orders scoped to active tenant
  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    const cleanup = subscribeToTenantRealtime(brandConfig.tenantSlug, {
      onConnectionChange: (connected) => {
        setRealtimeConnected(connected);
      },
      onLocationInsert: (row) => {
        setDrivers((prev) =>
          prev.map((d) =>
            d.id === row.driver_id
              ? {
                  ...d,
                  latitude: row.latitude,
                  longitude: row.longitude,
                  speedMph: row.speed ?? d.speedMph,
                  lastUpdated: row.created_at || new Date().toISOString(),
                }
              : d
          )
        );
        if (row.order_id) {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === row.order_id
                ? {
                    ...o,
                    driverLat: row.latitude,
                    driverLng: row.longitude,
                    driverSpeedMph: row.speed ?? o.driverSpeedMph,
                  }
                : o
            )
          );
        }
      },
      onOrderChange: () => {
        void refreshOperationalState();
      },
    });

    return () => {
      cleanup();
    };
  }, [brandConfig.tenantSlug, refreshOperationalState]);

  async function recordOfflineIfNeeded(
    orderId: string,
    orderNumber: string,
    type: OfflineQueuedMutation["type"],
    summary: string,
    payload: Record<string, unknown>
  ) {
    if (isOfflineSimulated || !networkOnline) {
      const updated = await enqueueOfflineMutation({
        tenantId: brandConfig.tenantSlug,
        orderId,
        orderNumber,
        type,
        summary,
        payload,
      });
      setOfflineQueue(updated);
      appendAudit(
        "offline-queue:store-and-forward",
        `QUEUED_${type}`,
        `[OFFLINE SAFE] Stored ${orderNumber} (${summary}) in local persistent queue`,
        orderId
      );
    }
  }

  async function setDriverShiftStatus(nextStatus: DriverShiftStatus) {
    setDriverShiftStatusState(nextStatus);
    const driverAvailable = nextStatus !== "Offline";

    setDrivers((prev) =>
      prev.map((d) =>
        d.id === "drv-101" ? { ...d, isAvailable: driverAvailable } : d
      )
    );

    if (nextStatus === "OnDuty") {
      const activeOrd = orders.find(
        (o) => o.driverId === "drv-101" && o.status !== "Delivered"
      );
      await startDriverLocationTracking({
        driverId: "drv-101",
        tenantId: brandConfig.tenantSlug,
        orderId: activeOrd?.id ?? null,
        companyShortName: brandConfig.shortName,
        onLocationUpdate: (point) => {
          setDrivers((prev) =>
            prev.map((d) =>
              d.id === point.driverId
                ? {
                    ...d,
                    latitude: point.latitude,
                    longitude: point.longitude,
                    speedMph: point.speed ?? d.speedMph,
                    lastUpdated: point.updatedAt,
                  }
                : d
            )
          );
        },
      });
    } else {
      await stopDriverLocationTracking();
    }

    appendAudit(
      "driver:Marcus Vance",
      "SHIFT_STATUS_CHANGED",
      `Driver shift status updated to ${nextStatus}`
    );
  }

  async function signIn(email: string, password: string): Promise<{ error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { error: "Please enter both email and password." };
    }

    const matchedDemo = brandConfig.demoAccounts.find(
      (acct) => acct.email.toLowerCase() === cleanEmail && acct.password === password
    );

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (!error && data.session) {
          setSession(data.session);
          setIsDemoMode(false);
          setUserEmail(cleanEmail);
          await loadUserRoleAndData(data.session.user.id, cleanEmail);
          return {};
        }
        if (matchedDemo) {
          setIsDemoMode(true);
          setUserEmail(matchedDemo.email);
          setUserRole(matchedDemo.role);
          setActiveRole(matchedDemo.role);
          return {};
        }
        return { error: error?.message || "Invalid credentials" };
      } catch (err) {
        if (matchedDemo) {
          setIsDemoMode(true);
          setUserEmail(matchedDemo.email);
          setUserRole(matchedDemo.role);
          setActiveRole(matchedDemo.role);
          return {};
        }
        return { error: err instanceof Error ? err.message : "Unable to sign in" };
      }
    }

    const resolvedRole = matchedDemo ? matchedDemo.role : inferRoleFromEmail(cleanEmail);
    setIsDemoMode(true);
    setUserEmail(cleanEmail);
    setUserRole(resolvedRole);
    setActiveRole(resolvedRole);
    return {};
  }

  async function signUp(
    name: string,
    email: string,
    phone: string,
    password: string,
    role: UserRole
  ): Promise<{ error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!name.trim() || !cleanEmail || !password) {
      return { error: "Name, email, and password are required." };
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: name.trim(),
              phone: phone.trim(),
              role,
              tenant_id: brandConfig.tenantSlug,
            },
          },
        });
        if (error) return { error: error.message };

        if (data.user) {
          await supabase.from("users").upsert({
            auth_id: data.user.id,
            tenant_id: brandConfig.tenantSlug,
            organization_id: brandConfig.tenantSlug,
            email: cleanEmail,
            role,
          });
        }
      } catch {
        // Proceed with local session fallback if offline
      }
    }

    setUsers((prev) => [
      {
        id: `usr-${Date.now()}`,
        tenantId: brandConfig.tenantSlug,
        email: cleanEmail,
        role,
        corporateAccountApproved: role === "recipient",
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setIsDemoMode(true);
    setUserEmail(cleanEmail);
    setUserRole(role);
    setActiveRole(role);
    appendAudit(cleanEmail, "USER_REGISTERED", `Registered new ${role} account (${name.trim()})`);
    return {};
  }

  function enterDemoMode(initialRole: UserRole = "admin") {
    const demoAccount =
      brandConfig.demoAccounts.find((a) => a.role === initialRole) ||
      brandConfig.demoAccounts[3];
    setIsDemoMode(true);
    setUserEmail(demoAccount.email);
    setUserRole(initialRole);
    setActiveRole(initialRole);
  }

  async function signOut() {
    await stopDriverLocationTracking();
    if (isSupabaseConfigured && session) {
      await supabase.auth.signOut().catch(() => {});
    }
    setSession(null);
    setIsDemoMode(false);
    setUserEmail(null);
  }

  async function deleteOwnAccount(): Promise<{ error?: string }> {
    if (isSupabaseConfigured && session) {
      const { error } = await supabase.rpc("delete_own_account");
      if (error) {
        return { error: error.message };
      }
      await supabase.auth.signOut().catch(() => {});
    }
    setSession(null);
    setIsDemoMode(false);
    setUserEmail(null);
    return {};
  }

  async function createOrderFromQuote(input: {
    pickupAddress: string;
    dropoffAddress: string;
    distanceMi: number;
    weightLb: number;
    vehicleType?: VehicleClass;
    serviceLevel?: ServiceLevel;
    accessorials?: AccessorialKey[];
    billingMode?: BillingMode;
    poNumber?: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    specialInstructions?: string;
  }): Promise<MobileOrder> {
    const breakdown = calculateDeliveryQuote(input.distanceMi, input.weightLb, pricingRules, {
      vehicleType: input.vehicleType,
      serviceLevel: input.serviceLevel,
      accessorials: input.accessorials,
    });
    const num = Math.floor(9044 + Math.random() * 900);
    const billingMode: BillingMode = input.billingMode || "corporate_net_terms";
    const newOrder: MobileOrder = {
      id: `ord-${num}`,
      tenantId: brandConfig.tenantSlug,
      orderNumber: `${brandConfig.orderPrefix}-${num}`,
      status: "ReadyForDispatch",
      exceptionReason: null,
      priceTotal: breakdown.total,
      driverPayout: breakdown.driverPayout,
      platformMargin: breakdown.platformMargin,
      distanceMi: breakdown.distanceMi,
      weightLb: breakdown.weightLb,
      vehicleType: breakdown.vehicleType,
      serviceLevel: breakdown.serviceLevel,
      accessorials: breakdown.accessorials,
      billingMode,
      poNumber: input.poNumber?.trim() || `PO-${num}`,
      pickupAddress: input.pickupAddress,
      dropoffAddress: input.dropoffAddress,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      specialInstructions: input.specialInstructions,
      driverId: null,
      driverName: null,
      driverPhone: null,
      driverVehicle: null,
      stripePaid: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pod: null,
    };

    setOrders((prev) => [newOrder, ...prev]);
    void syncOrderLifecycleEvent({
      event: "order.created",
      tenantSlug: brandConfig.tenantSlug,
      settings: crmSettings,
      order: newOrder,
    });
    appendAudit(
      `customer:${input.customerEmail}`,
      billingMode === "corporate_net_terms" ? "ORDER_CORPORATE_BILLED" : "ORDER_CARD_PAID",
      `${newOrder.orderNumber} (${newOrder.serviceLevel.toUpperCase()} • ${newOrder.vehicleType.toUpperCase()}) • Total $${newOrder.priceTotal.toFixed(2)} / Driver Payout $${newOrder.driverPayout.toFixed(2)}`,
      newOrder.id
    );
    return newOrder;
  }

  async function assignDriverToOrder(orderId: string, driverId: string) {
    const targetDriver = drivers.find((d) => d.id === driverId);
    if (!targetDriver) return;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "Assigned",
              deliveryStage: "en_route_pickup",
              exceptionReason: null,
              driverId: targetDriver.id,
              driverName: targetDriver.name,
              driverPhone: targetDriver.phone,
              driverVehicle: targetDriver.vehicleDetails,
              driverLat: targetDriver.latitude,
              driverLng: targetDriver.longitude,
              driverSpeedMph: targetDriver.speedMph,
              updatedAt: new Date().toISOString(),
            }
          : o
      )
    );

    setDrivers((prev) =>
      prev.map((d) =>
        d.id === driverId ? { ...d, activeOrdersCount: d.activeOrdersCount + 1 } : d
      )
    );

    const targetOrder = orders.find((o) => o.id === orderId);
    if (targetOrder) {
      void syncOrderLifecycleEvent({
        event: "order.assigned",
        tenantSlug: brandConfig.tenantSlug,
        settings: crmSettings,
        order: {
          ...targetOrder,
          status: "Assigned",
          driverName: targetDriver.name,
          driverPhone: targetDriver.phone,
        },
      });
    }
    appendAudit(
      `dispatcher:${userEmail || "ops"}`,
      "DRIVER_ASSIGNED",
      `Assigned ${targetDriver.name} to ${targetOrder?.orderNumber || orderId} ($${targetOrder?.driverPayout.toFixed(2) || "0.00"} driver payout)`,
      orderId
    );
  }

  async function autoDispatchNearestDriver(orderId: string): Promise<MobileDriver | null> {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return null;

    const available = drivers.filter((d) => d.isAvailable);
    if (available.length === 0) return null;

    const { latitude, longitude } = brandConfig.defaultCoordinates;
    const sorted = [...available].sort((a, b) => {
      const distA =
        distanceBetweenMeters(latitude, longitude, a.latitude, a.longitude) +
        a.activeOrdersCount * 2000;
      const distB =
        distanceBetweenMeters(latitude, longitude, b.latitude, b.longitude) +
        b.activeOrdersCount * 2000;
      return distA - distB;
    });

    const nearest = sorted[0];
    await assignDriverToOrder(orderId, nearest.id);
    appendAudit(
      "dispatcher:auto-dispatch",
      "AUTO_DISPATCH_MATCHED",
      `Auto-dispatched nearest unit ${nearest.name} (${nearest.vehicleType}) to ${targetOrder.orderNumber}`,
      orderId
    );
    return nearest;
  }

  async function reportOrderException(orderId: string, reason: string) {
    const targetOrder = orders.find((o) => o.id === orderId);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              exceptionReason: reason.trim() || "Dispatch exception flagged",
              updatedAt: new Date().toISOString(),
            }
          : o
      )
    );
    appendAudit(
      `dispatcher:${userEmail || "ops"}`,
      "ORDER_EXCEPTION_FLAGGED",
      `${targetOrder?.orderNumber || orderId} flagged: ${reason}`,
      orderId
    );
  }

  async function resolveOrderException(orderId: string) {
    const targetOrder = orders.find((o) => o.id === orderId);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, exceptionReason: null, updatedAt: new Date().toISOString() }
          : o
      )
    );
    appendAudit(
      `dispatcher:${userEmail || "ops"}`,
      "ORDER_EXCEPTION_RESOLVED",
      `Cleared exception on ${targetOrder?.orderNumber || orderId}`,
      orderId
    );
  }

  async function claimOpenOrder(orderId: string, driverId: string = "drv-101") {
    const targetDriver = drivers.find((d) => d.id === driverId) || drivers[0];
    if (!targetDriver) return;
    const targetOrder = orders.find((o) => o.id === orderId);

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "Accepted",
              deliveryStage: "en_route_pickup",
              exceptionReason: null,
              driverId: targetDriver.id,
              driverName: targetDriver.name,
              driverPhone: targetDriver.phone,
              driverVehicle: targetDriver.vehicleDetails,
              driverLat: targetDriver.latitude,
              driverLng: targetDriver.longitude,
              driverSpeedMph: targetDriver.speedMph,
              updatedAt: new Date().toISOString(),
            }
          : o
      )
    );

    setDrivers((prev) =>
      prev.map((d) =>
        d.id === targetDriver.id ? { ...d, activeOrdersCount: d.activeOrdersCount + 1 } : d
      )
    );

    await recordOfflineIfNeeded(
      orderId,
      targetOrder?.orderNumber || orderId,
      "CLAIM_RUN",
      `Claimed open run ($${targetOrder?.driverPayout.toFixed(2)})`,
      { driverId: targetDriver.id }
    );

    appendAudit(
      `driver:${targetDriver.name}`,
      "OPEN_RUN_CLAIMED",
      `${targetDriver.name} claimed ${targetOrder?.orderNumber || orderId} from Open Run Board ($${targetOrder?.driverPayout.toFixed(2) || "0.00"} payout)`,
      orderId
    );
  }

  async function declineOpenOrder(orderId: string) {
    const targetOrder = orders.find((o) => o.id === orderId);
    appendAudit(
      "driver:Marcus Vance",
      "OPEN_RUN_DECLINED",
      `Driver declined ${targetOrder?.orderNumber || orderId}; returned to priority queue`,
      orderId
    );
  }

  async function advanceDeliveryStage(orderId: string, stage: DeliveryStepStage) {
    const targetOrder = orders.find((o) => o.id === orderId);
    const stageToStatus: Record<DeliveryStepStage, OrderStatus> = {
      en_route_pickup: "Accepted",
      arrived_pickup: "Accepted",
      cargo_loaded: "PickedUp",
      en_route_dropoff: "InTransit",
      arrived_dropoff: "InTransit",
      delivered: "Delivered",
    };

    const nextStatus = stageToStatus[stage];
    const nowIso = new Date().toISOString();
    const lat = targetOrder?.driverLat || brandConfig.defaultCoordinates.latitude;
    const lng = targetOrder?.driverLng || brandConfig.defaultCoordinates.longitude;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: nextStatus,
              deliveryStage: stage,
              pickupCustodyAt:
                stage === "cargo_loaded" ? o.pickupCustodyAt || nowIso : o.pickupCustodyAt,
              pickupCustodyLat:
                stage === "cargo_loaded" ? o.pickupCustodyLat || lat : o.pickupCustodyLat,
              pickupCustodyLng:
                stage === "cargo_loaded" ? o.pickupCustodyLng || lng : o.pickupCustodyLng,
              updatedAt: nowIso,
            }
          : o
      )
    );

    await recordOfflineIfNeeded(
      orderId,
      targetOrder?.orderNumber || orderId,
      "STATUS_CHANGE",
      `Stage → ${stage}`,
      { stage, status: nextStatus, lat, lng }
    );

    appendAudit(
      `driver:${targetOrder?.driverName || "Marcus Vance"}`,
      `STAGE_${stage.toUpperCase()}`,
      `${targetOrder?.orderNumber || orderId} progressed to ${stage.replace(/_/g, " ")}`,
      orderId
    );
  }

  async function confirmPickupCustody(orderId: string) {
    const nowIso = new Date().toISOString();
    const targetOrder = orders.find((o) => o.id === orderId);
    const lat = targetOrder?.driverLat || brandConfig.defaultCoordinates.latitude;
    const lng = targetOrder?.driverLng || brandConfig.defaultCoordinates.longitude;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "InTransit",
              deliveryStage: "en_route_dropoff",
              pickupCustodyAt: nowIso,
              pickupCustodyLat: lat,
              pickupCustodyLng: lng,
              updatedAt: nowIso,
            }
          : o
      )
    );

    await recordOfflineIfNeeded(
      orderId,
      targetOrder?.orderNumber || orderId,
      "PICKUP_CUSTODY",
      `Pickup Custody BOL & GPS stamped (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      { pickupCustodyAt: nowIso, lat, lng }
    );

    appendAudit(
      `driver:${targetOrder?.driverName || "Marcus Vance"}`,
      "PICKUP_CUSTODY_STAMPED",
      `Pickup Custody verified for ${targetOrder?.orderNumber || orderId} at (${lat.toFixed(4)}, ${lng.toFixed(4)}) → InTransit`,
      orderId
    );
  }

  async function updateOrderStatus(
    orderId: string,
    nextStatus: OrderStatus,
    actorLabel?: string
  ) {
    const targetOrder = orders.find((o) => o.id === orderId);
    const nextStage: DeliveryStepStage | undefined =
      nextStatus === "Accepted"
        ? "en_route_pickup"
        : nextStatus === "PickedUp"
          ? "cargo_loaded"
          : nextStatus === "InTransit"
            ? "en_route_dropoff"
            : nextStatus === "Delivered"
              ? "delivered"
              : undefined;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: nextStatus,
              deliveryStage: nextStage || o.deliveryStage,
              updatedAt: new Date().toISOString(),
            }
          : o
      )
    );

    await recordOfflineIfNeeded(
      orderId,
      targetOrder?.orderNumber || orderId,
      "STATUS_CHANGE",
      `Status → ${nextStatus}`,
      { nextStatus }
    );

    appendAudit(
      actorLabel || `${activeRole}:${userEmail || "operator"}`,
      `STATUS_${nextStatus.toUpperCase()}`,
      `${targetOrder?.orderNumber || orderId} transitioned to ${nextStatus}`,
      orderId
    );
  }

  async function submitProofOfDelivery(input: {
    orderId: string;
    recipientName: string;
    notes: string;
    photoUris: string[];
    signatureConfirmed: boolean;
    signatureSvg?: string;
  }) {
    const deliveredAt = new Date().toISOString();
    const targetOrder = orders.find((o) => o.id === input.orderId);
    const gpsLat = targetOrder?.driverLat || brandConfig.defaultCoordinates.latitude;
    const gpsLng = targetOrder?.driverLng || brandConfig.defaultCoordinates.longitude;
    const gpsAccuracyMeters = 6.8;
    const prefix = brandConfig.orderPrefix;
    const custodyCertificateId = `CERT-${targetOrder?.orderNumber || prefix}-${Math.floor(100 + Math.random() * 899)}`;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === input.orderId
          ? {
              ...o,
              status: "Delivered",
              deliveryStage: "delivered",
              exceptionReason: null,
              updatedAt: deliveredAt,
              pod: {
                recipientName: input.recipientName,
                notes: input.notes,
                photoUrls:
                  input.photoUris.length > 0
                    ? input.photoUris
                    : ["https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600"],
                signatureConfirmed: input.signatureConfirmed,
                signatureSvg: input.signatureSvg || DEFAULT_SAMPLE_SIGNATURE_SVG,
                gpsLat,
                gpsLng,
                gpsAccuracyMeters,
                geofenceVerified: true,
                custodyCertificateId,
                deliveredAt,
              },
            }
          : o
      )
    );

    await recordOfflineIfNeeded(
      input.orderId,
      targetOrder?.orderNumber || input.orderId,
      "PROOF_OF_DELIVERY",
      `PoD Cert ${custodyCertificateId} (Signed by ${input.recipientName})`,
      {
        recipientName: input.recipientName,
        custodyCertificateId,
        gpsLat,
        gpsLng,
      }
    );

    if (targetOrder) {
      void syncOrderLifecycleEvent({
        event: "order.pod_completed",
        tenantSlug: brandConfig.tenantSlug,
        settings: crmSettings,
        order: {
          ...targetOrder,
          status: "Delivered",
          pod: {
            recipientName: input.recipientName,
            signatureConfirmed: input.signatureConfirmed,
            deliveredAt,
          },
        },
      });
    }

    appendAudit(
      `driver:${targetOrder?.driverName || "Marcus Vance"}`,
      "CHAIN_OF_CUSTODY_CERTIFIED",
      `${custodyCertificateId} issued for ${targetOrder?.orderNumber || input.orderId} • Signed by ${input.recipientName} • GPS (${gpsLat.toFixed(4)}, ${gpsLng.toFixed(4)} ±${gpsAccuracyMeters}m)`,
      input.orderId
    );
  }

  async function shareOrderTrackingLink(order: MobileOrder) {
    const trackingUrl = `${brandConfig.websiteUrl}/track/${order.id}`;
    const message = `${brandConfig.companyName} Live Tracking — Order ${order.orderNumber} (${order.status})\nFrom: ${order.pickupAddress}\nTo: ${order.dropoffAddress}\nTrack live ETA & Chain-of-Custody PoD: ${trackingUrl}`;
    try {
      await Share.share({
        title: `Live Tracking ${order.orderNumber}`,
        message,
        url: trackingUrl,
      });
    } catch {
      // Ignore cancel
    }
  }

  function toggleDriverGps() {
    const next: DriverShiftStatus =
      driverShiftStatus === "OnDuty" ? "Available" : "OnDuty";
    void setDriverShiftStatus(next);
  }

  function toggleOfflineSimulation() {
    setIsOfflineSimulated((prev) => !prev);
  }

  function pulseDriverTelemetry() {
    const jitterLat = (Math.random() - 0.5) * 0.009;
    const jitterLng = (Math.random() - 0.5) * 0.011;
    const nextSpeed = Math.round(24 + Math.random() * 20);
    const { latitude, longitude } = brandConfig.defaultCoordinates;

    setDrivers((prev) =>
      prev.map((d, idx) =>
        d.isAvailable
          ? {
              ...d,
              latitude: Number((d.latitude + jitterLat * (idx % 2 === 0 ? 1 : -1)).toFixed(4)),
              longitude: Number((d.longitude + jitterLng * (idx % 2 === 0 ? 1 : -1)).toFixed(4)),
              speedMph: idx === 0 ? nextSpeed : Math.max(15, d.speedMph + Math.round((Math.random() - 0.5) * 8)),
              lastUpdated: new Date().toISOString(),
            }
          : d
      )
    );

    setOrders((prev) =>
      prev.map((o) =>
        o.driverId === "drv-101" && o.status !== "Delivered"
          ? {
              ...o,
              driverLat: Number(((o.driverLat || latitude) + jitterLat).toFixed(4)),
              driverLng: Number(((o.driverLng || longitude) + jitterLng).toFixed(4)),
              driverSpeedMph: nextSpeed,
              updatedAt: new Date().toISOString(),
            }
          : o
      )
    );
  }

  function spawnDemoDriverOrder() {
    const num = Math.floor(9100 + Math.random() * 800);
    const breakdown = calculateDeliveryQuote(14.5, 65, pricingRules, {
      vehicleType: "cargo_van",
      serviceLevel: "stat_90m",
      accessorials: ["inside_delivery", "heavy_lift"],
    });
    const places = VERTICAL_TEMPLATES[brandConfig.vertical].quickPlaces;
    const demoOrder: MobileOrder = {
      id: `ord-${num}`,
      tenantId: brandConfig.tenantSlug,
      orderNumber: `${brandConfig.orderPrefix}-${num}`,
      status: "ReadyForDispatch",
      exceptionReason: null,
      priceTotal: breakdown.total,
      driverPayout: breakdown.driverPayout,
      platformMargin: breakdown.platformMargin,
      distanceMi: breakdown.distanceMi,
      weightLb: 65,
      vehicleType: "cargo_van",
      serviceLevel: "stat_90m",
      accessorials: ["inside_delivery", "heavy_lift"],
      billingMode: "corporate_net_terms",
      poNumber: `PO-STAT-${num}`,
      pickupAddress: places[0]?.address || "6910 Bluff Rd, Indianapolis, IN 46217",
      dropoffAddress: places[1]?.address || "9708 E US Highway 36, Avon, IN 46123",
      customerName: "Commercial Priority Account",
      customerEmail: getDemoEmail(brandConfig, "recipient"),
      customerPhone: brandConfig.supportPhone,
      specialInstructions: "STAT 90m priority run. Verify recipient signature at dock.",
      driverId: null,
      driverName: null,
      driverPhone: null,
      driverVehicle: null,
      stripePaid: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pod: null,
    };

    setOrders((prev) => [demoOrder, ...prev]);
    appendAudit(
      "dispatcher:open-board",
      "OPEN_RUN_POSTED",
      `Posted ${demoOrder.orderNumber} (STAT 90m • $${demoOrder.driverPayout.toFixed(2)} Driver Payout) to Open Run Board`,
      demoOrder.id
    );
  }

  async function updatePricingRules(nextRules: PricingRules) {
    setPricingRules(nextRules);
    if (isSupabaseConfigured) {
      try {
        await supabase.from("pricing_settings").upsert({
          id: nextRules.id,
          tenant_slug: brandConfig.tenantSlug,
          tenant_id: brandConfig.tenantSlug,
          organization_id: brandConfig.tenantSlug,
          base_fee: nextRules.baseFee,
          per_mile_rate: nextRules.perMileRate,
          fuel_pct: nextRules.fuelPct,
          minimum_charge: nextRules.minimumCharge,
          currency: nextRules.currency,
          updated_at: new Date().toISOString(),
        });
      } catch {
        // Ignore if remote table is offline
      }
    }
    appendAudit(
      `admin:${userEmail || "admin"}`,
      "PRICING_UPDATED",
      `Updated pricing: Base $${nextRules.baseFee.toFixed(2)}, $${nextRules.perMileRate.toFixed(2)}/mi, Driver Split ${Math.round((nextRules.driverCommissionRate ?? 0.7) * 100)}%, HIPAA Mode ${nextRules.hipaaComplianceMode ? "ON" : "OFF"}`
    );
  }

  async function addFleetDriver(
    name: string,
    phone: string,
    vehicleDetails: string,
    vehicleType: VehicleClass = "cargo_van"
  ) {
    const newDriver: MobileDriver = {
      id: `drv-${Date.now()}`,
      tenantId: brandConfig.tenantSlug,
      name: name.trim(),
      phone: phone.trim(),
      vehicleDetails: vehicleDetails.trim(),
      vehicleType,
      isAvailable: true,
      docVerified: false,
      licenseExpiry: "2027-12-31",
      insuranceStatus: "Pending Review",
      activeOrdersCount: 0,
      latitude: brandConfig.defaultCoordinates.latitude,
      longitude: brandConfig.defaultCoordinates.longitude,
      speedMph: 0,
      lastUpdated: new Date().toISOString(),
    };

    setDrivers((prev) => [newDriver, ...prev]);
    if (isSupabaseConfigured) {
      try {
        await supabase.from("drivers").insert({
          tenant_id: brandConfig.tenantSlug,
          organization_id: brandConfig.tenantSlug,
          name: newDriver.name,
          phone: newDriver.phone,
          vehicle_details: newDriver.vehicleDetails,
          is_available: true,
        });
      } catch {
        // Ignore if offline
      }
    }
    appendAudit(
      `admin:${userEmail || "admin"}`,
      "DRIVER_ONBOARDED",
      `Added driver ${newDriver.name} (${vehicleType.toUpperCase()} • ${newDriver.vehicleDetails})`,
    );
  }

  async function verifyDriverDocs(driverId: string, verified: boolean) {
    const target = drivers.find((d) => d.id === driverId);
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === driverId
          ? {
              ...d,
              docVerified: verified,
              insuranceStatus: verified ? "Verified" : "Pending Review",
            }
          : d
      )
    );
    appendAudit(
      `admin:${userEmail || "admin"}`,
      "DRIVER_DOCS_VERIFIED",
      `${target?.name || driverId} COI & license marked ${verified ? "Verified" : "Pending Review"}`
    );
  }

  async function updateCrmSettings(next: CrmConnectorSettings) {
    setCrmSettings(next);
    setOnboardingState((prev) => ({
      ...prev,
      dataOrCrmConnected: true,
    }));
    appendAudit(
      `admin:${userEmail || "operator"}`,
      "CRM_SETTINGS_UPDATED",
      `Data adapter set to ${next.mode}${next.webhookUrl ? ` (${next.webhookUrl})` : ""}`
    );
  }

  function updateOnboardingState(patch: Partial<TenantOnboardingState>) {
    setOnboardingState((prev) => ({
      ...prev,
      ...patch,
    }));
  }

  async function sendDriverInviteLink(
    name: string,
    phone: string,
    vehicleDetails = "Commercial Fleet Unit",
    vehicleType: VehicleClass = "cargo_van"
  ) {
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    if (cleanName && cleanPhone) {
      const exists = drivers.some(
        (d) => d.name.toLowerCase() === cleanName.toLowerCase()
      );
      if (!exists) {
        await addFleetDriver(cleanName, cleanPhone, vehicleDetails, vehicleType);
      }
    }
    setOnboardingState((prev) => ({
      ...prev,
      teamAndBookingShared: true,
    }));
    const inviteUrl = `${brandConfig.websiteUrl}/driver-onboarding?tenant=${brandConfig.tenantSlug}`;
    const message = `You've been invited to drive for ${brandConfig.companyName} on Rüller OS.\n\n1. Open Driver Console: ${inviteUrl}\n2. Tenant Code: ${brandConfig.orderPrefix}\n3. Go On Duty to receive dispatches & submit photo/signature PODs.`;
    try {
      await Share.share({
        title: `${brandConfig.companyName} — Driver Invite`,
        message,
      });
    } catch {
      // Ignore cancel
    }
    appendAudit(
      `admin:${userEmail || "operator"}`,
      "DRIVER_INVITE_SENT",
      `Sent SMS onboarding link to ${cleanName || "Driver"} (${cleanPhone || "fleet"})`
    );
  }

  async function shareCustomerBookingLink() {
    setOnboardingState((prev) => ({
      ...prev,
      teamAndBookingShared: true,
    }));
    const bookingUrl = `${brandConfig.websiteUrl}/book/${brandConfig.tenantSlug}`;
    const message = `Book instant same-day delivery with ${brandConfig.companyName}:\n• Upfront mileage pricing\n• Live GPS driver tracking\n• Signed photo Proof of Delivery\n\nOrder now: ${bookingUrl}`;
    try {
      await Share.share({
        title: `${brandConfig.companyName} — Customer Booking Link`,
        message,
      });
    } catch {
      // Ignore cancel
    }
    appendAudit(
      `admin:${userEmail || "operator"}`,
      "BOOKING_LINK_SHARED",
      `Shared customer self-serve booking portal (${bookingUrl})`
    );
  }

  function addPaymentCard(input: {
    number: string;
    expiry: string;
    cvc: string;
    cardholderName: string;
    zip: string;
  }): SavedPaymentCard {
    const digits = input.number.replace(/\D/g, "");
    const last4 = digits.slice(-4) || "4210";
    const brand = digits.startsWith("5")
      ? "Mastercard"
      : digits.startsWith("3")
        ? "Amex"
        : "Visa";
    const created: SavedPaymentCard = {
      id: `card-${Date.now()}`,
      brand,
      last4,
      expiry: input.expiry.trim() || "12/28",
      cardholderName: input.cardholderName.trim() || "Account Holder",
    };
    setSavedCards((prev) => [created, ...prev]);
    setSelectedPaymentMethodId(created.id);
    appendAudit(
      `customer:${userEmail || "shipper"}`,
      "PAYMENT_CARD_ADDED",
      `Added ${brand} •••• ${last4} (${created.expiry})`
    );
    return created;
  }

  function selectPaymentMethod(methodId: string) {
    setSelectedPaymentMethodId(methodId);
  }

  function moveOrderInQueue(orderId: string, direction: "up" | "down") {
    setOrders((prev) => {
      const idx = prev.findIndex((o) => o.id === orderId);
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, moved);
      return copy;
    });
    appendAudit(
      `dispatcher:${userEmail || "ops"}`,
      "QUEUE_REORDERED",
      `Moved order ${orderId} ${direction} in dispatch sequence`,
      orderId
    );
  }

  function toggleOrderPriority(orderId: string) {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const nextLevel: ServiceLevel =
          o.serviceLevel === "stat_90m" ? "urgent_3h" : "stat_90m";
        const recalc = calculateDeliveryQuote(o.distanceMi, o.weightLb, pricingRules, {
          vehicleType: o.vehicleType,
          serviceLevel: nextLevel,
          accessorials: o.accessorials,
        });
        return {
          ...o,
          serviceLevel: nextLevel,
          priceTotal: recalc.total,
          driverPayout: recalc.driverPayout,
          platformMargin: recalc.platformMargin,
          updatedAt: new Date().toISOString(),
        };
      })
    );
    appendAudit(
      `dispatcher:${userEmail || "ops"}`,
      "QUEUE_PRIORITY_UPDATED",
      `Toggled STAT priority on ${orderId}`,
      orderId
    );
  }

  async function shareBetaAccessInvite() {
    const expoTunnel = "exps://fqfirqk-dgreen27-8081.exp.direct";
    const message =
      `You're invited to test ${brandConfig.companyName} on Rüller OS (Beta):\n\n` +
      `• Option 1 (Instant iPhone / Android Preview via Expo Go):\n` +
      `  1. Download "Expo Go" from the App Store\n` +
      `  2. Open Safari and go to: ${expoTunnel}\n\n` +
      `• Option 2 (TestFlight Standalone App):\n` +
      `  Reply with your Apple ID email to receive your TestFlight invite for ${brandConfig.bundleId}.\n\n` +
      `Includes live Google Maps tracking, upfront booking, dispatch queue control, and photo + signature Proof of Delivery.`;
    try {
      await Share.share({
        title: `${brandConfig.companyName} — Rüller OS Beta Invite`,
        message,
      });
    } catch {
      // Ignore cancel
    }
    appendAudit(
      `admin:${userEmail || "operator"}`,
      "BETA_INVITE_SHARED",
      `Shared Expo Go (${expoTunnel}) & TestFlight beta invite for ${brandConfig.companyName}`
    );
  }

  async function importOpsDataset(
    datasetType: OpsImportDatasetType,
    rawText: string
  ): Promise<{ importedCount: number; message: string }> {
    if (datasetType === "orders") {
      const parsed = parseImportedOrders(rawText);
      if (parsed.length === 0) {
        return {
          importedCount: 0,
          message: "No valid order rows found. Include pickup and dropoff columns.",
        };
      }
      const now = new Date().toISOString();
      const nextOrders: MobileOrder[] = parsed.map((row, idx) => {
        const quote = calculateDeliveryQuote(row.distanceMi, 25, pricingRules, {
          vehicleType: row.vehicleType,
          serviceLevel: row.serviceLevel,
          accessorials: [],
        });
        const suffix = 9100 + orders.length + idx;
        return {
          id: `imp-ord-${Date.now()}-${idx}`,
          tenantId: brandConfig.tenantSlug,
          orderNumber: `${brandConfig.orderPrefix}-${suffix}`,
          status: "ReadyForDispatch",
          customerName: row.customerName,
          customerEmail: row.customerEmail,
          customerPhone: brandConfig.supportPhone,
          pickupAddress: row.pickupAddress,
          dropoffAddress: row.dropoffAddress,
          distanceMi: quote.distanceMi,
          weightLb: 25,
          vehicleType: row.vehicleType,
          serviceLevel: row.serviceLevel,
          accessorials: [],
          billingMode: "card",
          poNumber: row.poNumber || undefined,
          priceTotal: quote.total,
          driverPayout: quote.driverPayout,
          platformMargin: quote.platformMargin,
          driverId: null,
          driverName: null,
          driverPhone: null,
          driverVehicle: null,
          stripePaid: true,
          specialInstructions: row.notes || undefined,
          createdAt: now,
          updatedAt: now,
          pod: null,
        };
      });
      setOrders((prev) => [...nextOrders, ...prev]);
      appendAudit(
        `admin:${userEmail || "operator"}`,
        "CSV_ORDERS_IMPORTED",
        `Imported ${nextOrders.length} loads into ${brandConfig.shortName}`
      );
      return {
        importedCount: nextOrders.length,
        message: `Imported ${nextOrders.length} loads into your Dispatch Queue.`,
      };
    }

    if (datasetType === "drivers") {
      const parsed = parseImportedDrivers(rawText);
      if (parsed.length === 0) {
        return {
          importedCount: 0,
          message: "No valid driver rows found. Include a name column.",
        };
      }
      const now = new Date().toISOString();
      const nextDrivers: MobileDriver[] = parsed.map((row, idx) => ({
        id: `imp-drv-${Date.now()}-${idx}`,
        tenantId: brandConfig.tenantSlug,
        name: row.name,
        phone: row.phone,
        vehicleDetails: row.vehicleDetails,
        vehicleType: row.vehicleType,
        isAvailable: true,
        docVerified: true,
        licenseExpiry: "2027-12-31",
        insuranceStatus: "Verified",
        activeOrdersCount: 0,
        latitude: brandConfig.defaultCoordinates.latitude + idx * 0.012,
        longitude: brandConfig.defaultCoordinates.longitude - idx * 0.011,
        speedMph: 0,
        lastUpdated: now,
      }));
      setDrivers((prev) => [...nextDrivers, ...prev]);
      appendAudit(
        `admin:${userEmail || "operator"}`,
        "CSV_DRIVERS_IMPORTED",
        `Imported ${nextDrivers.length} drivers into ${brandConfig.shortName} fleet`
      );
      return {
        importedCount: nextDrivers.length,
        message: `Imported ${nextDrivers.length} drivers into your Team & Fleet.`,
      };
    }

    const parsedClients = parseImportedClients(rawText);
    if (parsedClients.length === 0) {
      return {
        importedCount: 0,
        message: "No valid client rows found. Include name and email columns.",
      };
    }
    const now = new Date().toISOString();
    const nextUsers: MobileUserRecord[] = parsedClients.map((row, idx) => ({
      id: `imp-cli-${Date.now()}-${idx}`,
      tenantId: brandConfig.tenantSlug,
      email: row.email,
      role: row.role,
      createdAt: now,
    }));
    setUsers((prev) => [...nextUsers, ...prev]);
    appendAudit(
      `admin:${userEmail || "operator"}`,
      "CSV_CLIENTS_IMPORTED",
      `Imported ${nextUsers.length} client accounts`
    );
    return {
      importedCount: nextUsers.length,
      message: `Imported ${nextUsers.length} client accounts.`,
    };
  }

  async function exportLedgerCsv(): Promise<string> {
    const driverLookup: Record<string, string> = {};
    drivers.forEach((d) => {
      driverLookup[d.id] = d.name;
    });
    const csv = exportOrdersToCsv(orders, driverLookup);
    try {
      await Share.share({
        title: `${brandConfig.shortName} Dispatch Ledger CSV`,
        message: csv,
      });
    } catch {
      // Safe no-op if dismissed
    }
    appendAudit(
      `admin:${userEmail || "operator"}`,
      "CSV_LEDGER_EXPORTED",
      `Exported ${orders.length} loads to CSV ledger`
    );
    return csv;
  }

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      AsyncStorage.setItem(
        OPS_STATE_STORAGE_KEY,
        JSON.stringify({
          orders,
          drivers,
          pricingRules,
          crmSettings,
          onboardingState,
        })
      ).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [loading, orders, drivers, pricingRules, crmSettings, onboardingState]);

  async function resetDemoWorkspace(): Promise<void> {
    const freshOrders = buildInitialOrders(brandConfig);
    const freshDrivers = buildInitialDrivers(brandConfig);
    setOrders(freshOrders);
    setDrivers(freshDrivers);
    setPricingRules(brandConfig.defaultPricing);
    try {
      await AsyncStorage.removeItem(OPS_STATE_STORAGE_KEY);
    } catch {
      // Ignore storage error
    }
    appendAudit(
      `admin:${userEmail || "operator"}`,
      "WORKSPACE_RESET",
      `Reset ${brandConfig.shortName} demo orders, drivers, and rate rules to clean seed state`
    );
  }

  async function updateUserRole(userId: string, role: UserRole) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    const targetUser = users.find((u) => u.id === userId);
    appendAudit(
      `admin:${userEmail || "admin"}`,
      "USER_ROLE_CHANGED",
      `Updated ${targetUser?.email || userId} role to ${role}`
    );
  }

  async function applyWhiteLabelTenant(nextBrand: BrandConfig) {
    setBrandConfig(nextBrand);
    setPricingRules(nextBrand.defaultPricing);
    setOrders((prev) =>
      prev.map((o) => {
        const numericSuffix = o.orderNumber.split("-").slice(1).join("-") || "9041";
        return {
          ...o,
          tenantId: nextBrand.tenantSlug,
          orderNumber: `${nextBrand.orderPrefix}-${numericSuffix}`,
        };
      })
    );
    try {
      await AsyncStorage.setItem(WHITE_LABEL_STORAGE_KEY, JSON.stringify(nextBrand));
    } catch {
      // Ignore storage error
    }
    appendAudit(
      `white-label:${nextBrand.tenantSlug}`,
      "WHITE_LABEL_TENANT_APPLIED",
      `Switched active tenant to ${nextBrand.companyName} (${nextBrand.orderPrefix} • ${VERTICAL_TEMPLATES[nextBrand.vertical].shortBadge})`
    );
  }

  async function exportClientInstallConfig() {
    const manifest = {
      whiteLabelPlatform: "Rüller OS v1.0",
      installedForClient: brandConfig.companyName,
      tenantSlug: brandConfig.tenantSlug,
      orderPrefix: brandConfig.orderPrefix,
      verticalTemplate: brandConfig.vertical,
      appJson: {
        expo: {
          name: brandConfig.companyName,
          slug: brandConfig.tenantSlug,
          scheme: brandConfig.scheme,
          ios: { bundleIdentifier: brandConfig.bundleId },
          android: { package: brandConfig.bundleId },
        },
      },
      envTemplate: {
        EXPO_PUBLIC_TENANT_SLUG: brandConfig.tenantSlug,
        EXPO_PUBLIC_API_BASE_URL: brandConfig.websiteUrl,
      },
      defaultPricing: brandConfig.defaultPricing,
    };

    try {
      await Share.share({
        title: `${brandConfig.companyName} — White-Label Install Config`,
        message: JSON.stringify(manifest, null, 2),
      });
      appendAudit(
        `installer:${userEmail || "operator"}`,
        "CLIENT_CONFIG_EXPORTED",
        `Exported turnkey white-label install manifest for ${brandConfig.companyName} (${brandConfig.bundleId})`
      );
    } catch {
      // Ignore user cancel
    }
  }

  const setIsRoleLocked = useCallback((locked: boolean) => {
    setIsRoleLockedState(locked);
    void AsyncStorage.setItem(ROLE_LOCK_STORAGE_KEY, locked ? "true" : "false");
  }, []);

  const toggleRoleLock = useCallback(() => {
    setIsRoleLockedState((prev) => {
      const next = !prev;
      void AsyncStorage.setItem(ROLE_LOCK_STORAGE_KEY, next ? "true" : "false");
      return next;
    });
  }, []);

  async function signInWithPhone(
    phone: string,
    otpCode = "123456",
    role?: UserRole
  ): Promise<{ error?: string; role?: UserRole }> {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      return { error: "Please enter a valid 10-digit mobile phone number." };
    }

    const matchedDriver = drivers.find(
      (d) => d.phone.replace(/\D/g, "") === digits
    );
    if (matchedDriver) {
      setIsDemoMode(true);
      setUserEmail(
        `${matchedDriver.name.toLowerCase().replace(/\s+/g, ".")}@${brandConfig.tenantSlug}.fleet`
      );
      setUserRole("driver");
      setActiveRole("driver");
      setIsRoleLocked(true);
      appendAudit(
        `driver:${matchedDriver.name}`,
        "DRIVER_PHONE_LOGIN",
        `Driver ${matchedDriver.name} logged in via SMS/phone (${matchedDriver.phone})`
      );
      return { role: "driver" };
    }

    const assignedRole: UserRole = role || "driver";
    setIsDemoMode(true);
    setUserEmail(`phone.${digits.slice(-4)}@${brandConfig.tenantSlug}.mobile`);
    setUserRole(assignedRole);
    setActiveRole(assignedRole);
    setIsRoleLocked(true);
    appendAudit(
      `${assignedRole}:phone`,
      "PHONE_OTP_LOGIN",
      `Verified mobile phone ${phone} via SMS code (${otpCode}) → ${assignedRole}`
    );
    return { role: assignedRole };
  }

  function stopLiveRunSimulation() {
    setSimulationState({
      active: false,
      currentStep: 0,
      totalSteps: 5,
      message: "",
      orderId: null,
    });
  }

  function startLiveRunSimulation(targetOrderId?: string) {
    let orderToSimulate = targetOrderId
      ? orders.find((o) => o.id === targetOrderId)
      : null;

    if (!orderToSimulate) {
      const prefix = brandConfig.orderPrefix;
      const simId = `ord-sim-${Date.now().toString().slice(-4)}`;
      const newSimOrder: MobileOrder = {
        id: simId,
        tenantId: brandConfig.tenantSlug,
        orderNumber: `${prefix}-9042`,
        status: "ReadyForDispatch",
        exceptionReason: null,
        priceTotal: 96.5,
        driverPayout: 67.55,
        platformMargin: 28.95,
        distanceMi: 14.2,
        weightLb: 28,
        vehicleType: "cargo_van",
        serviceLevel: "stat_90m",
        accessorials: ["inside_delivery"],
        billingMode: "corporate_net_terms",
        poNumber: "MATTER-2026-STAT",
        pickupAddress: "8702 Keystone Crossing, Indianapolis, IN",
        dropoffAddress: "2500 Airport Expy, Indianapolis, IN",
        customerName: "Meridian Medical Diagnostics",
        customerEmail: "logistics@meridianmed.local",
        customerPhone: "317-555-0177",
        specialInstructions: "STAT Specimen Run. Temperature controlled cooler. Hand to Dr. Vance.",
        driverId: null,
        driverName: null,
        driverPhone: null,
        driverVehicle: null,
        stripePaid: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pod: null,
      };
      setOrders((prev) => [newSimOrder, ...prev.filter((o) => o.id !== simId)]);
      orderToSimulate = newSimOrder;
    } else {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderToSimulate!.id
            ? {
                ...o,
                status: "ReadyForDispatch",
                deliveryStage: undefined,
                driverId: null,
                driverName: null,
                driverPhone: null,
                driverVehicle: null,
                pod: null,
                updatedAt: new Date().toISOString(),
              }
            : o
        )
      );
    }

    setSimulationState({
      active: true,
      currentStep: 1,
      totalSteps: 5,
      message: "Step 1/5: Hotshot STAT Run Booked ($96.50 · 14.2 mi) — Rate locked in Queue.",
      orderId: orderToSimulate.id,
    });

    appendAudit(
      "simulation:operator",
      "SIMULATION_STEP_1_BOOKED",
      `Started live test simulation for ${orderToSimulate.orderNumber} (Step 1/5: ReadyForDispatch)`,
      orderToSimulate.id
    );
  }

  function advanceSimulationStep() {
    setSimulationState((prev) => {
      if (!prev.active || !prev.orderId) return prev;
      const nextStep = prev.currentStep + 1;
      const targetId = prev.orderId;
      const nowIso = new Date().toISOString();
      const coords = brandConfig.defaultCoordinates;
      const prefix = brandConfig.orderPrefix;

      if (nextStep === 2) {
        setOrders((curr) =>
          curr.map((o) =>
            o.id === targetId
              ? {
                  ...o,
                  status: "Assigned",
                  deliveryStage: "en_route_pickup",
                  driverId: "drv-101",
                  driverName: "Marcus Vance",
                  driverPhone: "317-555-0142",
                  driverVehicle: "2024 Ford Transit 250 High Roof • FLT-4821",
                  driverLat: coords.latitude + 0.012,
                  driverLng: coords.longitude - 0.018,
                  driverSpeedMph: 24,
                  updatedAt: nowIso,
                }
              : o
          )
        );
        appendAudit(
          "dispatcher:auto-engine",
          "SIMULATION_STEP_2_ASSIGNED",
          `Auto-dispatched nearest driver Marcus Vance (4 min away) to order ${targetId}`,
          targetId
        );
        return {
          ...prev,
          currentStep: 2,
          message: "Step 2/5: Auto-Dispatched to Marcus Vance (Ford Transit 250) — En route to pickup.",
        };
      }

      if (nextStep === 3) {
        setOrders((curr) =>
          curr.map((o) =>
            o.id === targetId
              ? {
                  ...o,
                  status: "PickedUp",
                  deliveryStage: "cargo_loaded",
                  pickupCustodyAt: nowIso,
                  pickupCustodyLat: coords.latitude,
                  pickupCustodyLng: coords.longitude,
                  driverLat: coords.latitude,
                  driverLng: coords.longitude,
                  driverSpeedMph: 0,
                  updatedAt: nowIso,
                }
              : o
          )
        );
        appendAudit(
          "driver:Marcus Vance",
          "SIMULATION_STEP_3_PICKED_UP",
          `Confirmed cargo custody BOL stamped at pickup for order ${targetId}`,
          targetId
        );
        return {
          ...prev,
          currentStep: 3,
          message: "Step 3/5: Cargo Loaded & Pickup BOL Stamped — Chain-of-custody locked.",
        };
      }

      if (nextStep === 4) {
        setOrders((curr) =>
          curr.map((o) =>
            o.id === targetId
              ? {
                  ...o,
                  status: "InTransit",
                  deliveryStage: "en_route_dropoff",
                  driverLat: coords.latitude - 0.035,
                  driverLng: coords.longitude - 0.045,
                  driverSpeedMph: 48,
                  updatedAt: nowIso,
                }
              : o
          )
        );
        appendAudit(
          "driver:Marcus Vance",
          "SIMULATION_STEP_4_IN_TRANSIT",
          `En route to destination (48 mph on I-465 S) for order ${targetId}`,
          targetId
        );
        return {
          ...prev,
          currentStep: 4,
          message: "Step 4/5: In Transit on Highway — Live Google GPS Pin & Uber Timeline active.",
        };
      }

      if (nextStep === 5) {
        const certId = `CERT-${prefix}-9042-882`;
        setOrders((curr) =>
          curr.map((o) =>
            o.id === targetId
              ? {
                  ...o,
                  status: "Delivered",
                  deliveryStage: "delivered",
                  driverSpeedMph: 0,
                  updatedAt: nowIso,
                  pod: {
                    recipientName: "Dr. Karen Vance, Lab Director",
                    notes: "Specimen delivered to intake accessioning bay. Chain-of-custody verified within 8m geofence.",
                    photoUrls: [
                      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600",
                    ],
                    signatureConfirmed: true,
                    signatureSvg: DEFAULT_SAMPLE_SIGNATURE_SVG,
                    gpsLat: coords.latitude - 0.042,
                    gpsLng: coords.longitude - 0.058,
                    gpsAccuracyMeters: 6.2,
                    geofenceVerified: true,
                    custodyCertificateId: certId,
                    deliveredAt: nowIso,
                  },
                }
              : o
          )
        );
        appendAudit(
          "driver:Marcus Vance",
          "SIMULATION_STEP_5_DELIVERED",
          `Delivered order ${targetId} — Issued ${certId} signed by Dr. Karen Vance`,
          targetId
        );
        return {
          ...prev,
          currentStep: 5,
          message: "Step 5/5: Delivered & Signed! Chain-of-Custody POD issued · Deal closed.",
        };
      }

      return {
        active: false,
        currentStep: 0,
        totalSteps: 5,
        message: "",
        orderId: null,
      };
    });
  }

  // Silence unused import lint if clearOfflineQueue is re-exported / referenced later
  void clearOfflineQueue;

  const isAuthenticated = Boolean(session || isDemoMode);
  const apiHealth: ApiHealthStatus = {
    supabaseConfigured: isSupabaseConfigured,
    networkOnline: networkOnline && !isOfflineSimulated,
    realtimeConnected,
    pendingOfflineCount: offlineQueue.length,
    lastSyncAt,
  };

  return (
    <AuthContext.Provider
      value={{
        session: isAuthenticated ? session : null,
        userEmail,
        userRole,
        activeRole,
        isDemoMode,
        isRoleLocked,
        loading,
        orders,
        drivers,
        users,
        auditEvents,
        brandConfig,
        pricingRules,
        driverShiftStatus,
        isDriverTrackingGps,
        isOfflineSimulated,
        networkOnline,
        offlineQueue,
        apiHealth,
        crmSettings,
        onboardingState,
        savedCards,
        selectedPaymentMethodId,
        simulationState,
        setActiveRole,
        setIsRoleLocked,
        toggleRoleLock,
        setDriverShiftStatus,
        applyWhiteLabelTenant,
        exportClientInstallConfig,
        updateCrmSettings,
        updateOnboardingState,
        addPaymentCard,
        selectPaymentMethod,
        moveOrderInQueue,
        toggleOrderPriority,
        shareBetaAccessInvite,
        sendDriverInviteLink,
        shareCustomerBookingLink,
        importOpsDataset,
        exportLedgerCsv,
        resetDemoWorkspace,
        signIn,
        signInWithPhone,
        signUp,
        enterDemoMode,
        startLiveRunSimulation,
        advanceSimulationStep,
        stopLiveRunSimulation,
        signOut,
        deleteOwnAccount,
        refreshOperationalState,
        createOrderFromQuote,
        assignDriverToOrder,
        autoDispatchNearestDriver,
        reportOrderException,
        resolveOrderException,
        claimOpenOrder,
        declineOpenOrder,
        confirmPickupCustody,
        advanceDeliveryStage,
        updateOrderStatus,
        submitProofOfDelivery,
        shareOrderTrackingLink,
        toggleDriverGps,
        toggleOfflineSimulation,
        flushOfflineSyncQueue,
        pulseDriverTelemetry,
        spawnDemoDriverOrder,
        updatePricingRules,
        addFleetDriver,
        verifyDriverDocs,
        updateUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
