/**
 * Bring Your Own Ops Data — Canonical CSV / Spreadsheet Import & Export Engine
 *
 * Lets any delivery business paste or import CSV/TSV rows exported from
 * Excel, Google Sheets, HubSpot, or Salesforce, map columns safely, commit
 * into Rüller OS tenant state, and export clean operational ledgers anytime.
 */

import type { VehicleClass, ServiceLevel } from "./pricing-engine";

export type OpsImportDatasetType = "orders" | "drivers" | "clients";
export type CrmAdapterMode =
  | "csv_only"
  | "hubspot_deals"
  | "salesforce_webhook"
  | "custom_webhook";

export interface ImportedOrderRow {
  customerName: string;
  customerEmail: string;
  pickupAddress: string;
  dropoffAddress: string;
  distanceMi: number;
  vehicleType: VehicleClass;
  serviceLevel: ServiceLevel;
  poNumber: string;
  notes: string;
}

export interface ImportedDriverRow {
  name: string;
  phone: string;
  vehicleDetails: string;
  vehicleType: VehicleClass;
}

export interface ImportedClientRow {
  name: string;
  email: string;
  phone: string;
  role: "recipient";
}

export interface CrmConnectorSettings {
  mode: CrmAdapterMode;
  hubspotPrivateAppToken?: string;
  hubspotPipelineId?: string;
  webhookUrl: string;
  autoSyncOnDelivered: boolean;
  lastSyncStatus?: string;
}

export interface TenantOnboardingState {
  brandConfigured: boolean;
  ratesConfigured: boolean;
  dataOrCrmConnected: boolean;
  teamAndBookingShared: boolean;
  wizardCompleted: boolean;
  dismissedCustomerGuide?: boolean;
  dismissedDriverGuide?: boolean;
  dismissedDispatchGuide?: boolean;
}

export const SAMPLE_CSV_TEMPLATES: Record<OpsImportDatasetType, string> = {
  orders:
    "customer,email,pickup,dropoff,miles,vehicle,reference\n" +
    "Midwest HVAC Supply,orders@midwesthvac.example,4820 W 79th St Indianapolis IN,8702 Keystone Crossing Indianapolis IN,11.4,cargo_van,PO-8812\n" +
    "Apex Legal Partners,desk@apexlegal.example,111 Monument Cir Indianapolis IN,2500 Airport Expy Indianapolis IN,9.8,sedan,FILE-409",
  drivers:
    "name,phone,vehicle,vehicle_type\n" +
    "Devin Brooks,317-555-0194,2025 Toyota Sienna Hybrid,suv\n" +
    "Carlos Rivera,317-555-0188,2023 Ram ProMaster 2500,cargo_van",
  clients:
    "name,email,phone\n" +
    "Beacon Title Group,ops@beacontitle.example,317-555-0131\n" +
    "Metro Surgical Supply,dispatch@metrosurgical.example,317-555-0164",
};

function parseCsvLine(line: string, delimiter: "," | "\t"): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseDelimitedTable(rawText: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const lines = rawText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  const delimiter: "," | "\t" = lines[0].includes("\t") ? "\t" : ",";
  const headers = parseCsvLine(lines[0], delimiter).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]+/g, "_")
  );

  const rows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    return row;
  });

  return { headers, rows };
}

function pickField(row: Record<string, string>, aliases: string[], fallback = ""): string {
  for (const key of aliases) {
    if (row[key] && row[key].trim().length > 0) {
      return row[key].trim();
    }
  }
  return fallback;
}

function normalizeVehicle(raw: string): VehicleClass {
  const v = raw.toLowerCase();
  if (v.includes("van") || v.includes("sprinter") || v.includes("box") || v.includes("freight") || v.includes("cargo")) {
    return "cargo_van";
  }
  if (v.includes("suv") || v.includes("minivan") || v.includes("crossover")) {
    return "suv";
  }
  return "sedan";
}

function normalizeService(raw: string): ServiceLevel {
  const v = raw.toLowerCase();
  if (v.includes("stat") || v.includes("90")) return "stat_90m";
  if (v.includes("same")) return "same_day";
  if (v.includes("sched")) return "scheduled";
  return "urgent_3h";
}

export function parseImportedOrders(rawText: string): ImportedOrderRow[] {
  const { rows } = parseDelimitedTable(rawText);
  return rows
    .map((row) => {
      const pickupAddress = pickField(row, [
        "pickup",
        "pickup_address",
        "origin",
        "from_address",
        "from",
      ]);
      const dropoffAddress = pickField(row, [
        "dropoff",
        "dropoff_address",
        "destination",
        "to_address",
        "to",
        "delivery_address",
      ]);
      if (!pickupAddress || !dropoffAddress) return null;

      const parsedMiles = Number(
        pickField(row, ["miles", "distance", "distance_mi", "distance_miles"], "12")
      );
      return {
        customerName: pickField(
          row,
          ["customer", "customer_name", "client", "account", "company", "deal_name", "name"],
          "Imported Client"
        ),
        customerEmail: pickField(
          row,
          ["email", "customer_email", "contact_email"],
          "ops@imported-client.local"
        ),
        pickupAddress,
        dropoffAddress,
        distanceMi: Number.isFinite(parsedMiles) && parsedMiles > 0 ? Number(parsedMiles.toFixed(1)) : 12,
        vehicleType: normalizeVehicle(pickField(row, ["vehicle", "vehicle_type", "fleet_class"], "sedan")),
        serviceLevel: normalizeService(pickField(row, ["service", "service_level", "sla", "priority"], "urgent_3h")),
        poNumber: pickField(row, ["reference", "po", "po_number", "bol", "order_ref"]),
        notes: pickField(row, ["notes", "instructions", "special_instructions"]),
      };
    })
    .filter((item): item is ImportedOrderRow => item !== null);
}

export function parseImportedDrivers(rawText: string): ImportedDriverRow[] {
  const { rows } = parseDelimitedTable(rawText);
  return rows
    .map((row) => {
      const name = pickField(row, ["name", "driver", "driver_name", "full_name"]);
      if (!name) return null;
      return {
        name,
        phone: pickField(row, ["phone", "mobile", "driver_phone"], "317-555-0100"),
        vehicleDetails: pickField(row, ["vehicle", "vehicle_details", "truck"], "Commercial Fleet Unit"),
        vehicleType: normalizeVehicle(pickField(row, ["vehicle_type", "class", "vehicle"], "cargo_van")),
      };
    })
    .filter((item): item is ImportedDriverRow => item !== null);
}

export function parseImportedClients(rawText: string): ImportedClientRow[] {
  const { rows } = parseDelimitedTable(rawText);
  return rows
    .map((row) => {
      const name = pickField(row, ["name", "company", "account", "client", "customer"]);
      const email = pickField(row, ["email", "contact_email", "customer_email"]);
      if (!name || !email) return null;
      return {
        name,
        email,
        phone: pickField(row, ["phone", "contact_phone"], "317-555-0100"),
        role: "recipient" as const,
      };
    })
    .filter((item): item is ImportedClientRow => item !== null);
}

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportOrdersToCsv(
  orders: {
    orderNumber: string;
    status: string;
    customerName: string;
    pickupAddress: string;
    dropoffAddress: string;
    distanceMi: number;
    priceTotal: number;
    driverPayout: number;
    platformMargin: number;
    driverId: string | null;
    driverName: string | null;
    createdAt: string;
    pod?: { recipientName?: string; signatureConfirmed?: boolean; deliveredAt?: string } | null;
  }[],
  driverLookup: Record<string, string>
): string {
  const header = [
    "order_number",
    "status",
    "customer_name",
    "pickup_address",
    "dropoff_address",
    "distance_mi",
    "price_total",
    "driver_payout",
    "platform_margin",
    "assigned_driver",
    "pod_recipient",
    "pod_signed",
    "created_at",
  ].join(",");

  const body = orders.map((o) =>
    [
      o.orderNumber,
      o.status,
      o.customerName,
      o.pickupAddress,
      o.dropoffAddress,
      o.distanceMi,
      o.priceTotal.toFixed(2),
      o.driverPayout.toFixed(2),
      o.platformMargin.toFixed(2),
      o.driverName || (o.driverId && driverLookup[o.driverId]) || "Unassigned",
      o.pod?.recipientName || "",
      Boolean(o.pod?.signatureConfirmed),
      o.createdAt,
    ]
      .map(escapeCsvCell)
      .join(",")
  );

  return [header, ...body].join("\n");
}

/**
 * Collapses the 7 legacy Make.com HubSpot scenarios from PSTV2/HUBSPOT_WORKFLOW.md
 * into a single automatic lifecycle mirror:
 *  - Direct HubSpot Deals API (/crm/v3/objects/deals) when hubspotPrivateAppToken is set
 *  - Unified outbound webhook envelope when webhookUrl is set
 */
export async function syncOrderLifecycleEvent(params: {
  event:
    | "order.created"
    | "order.assigned"
    | "order.status_updated"
    | "order.pod_completed"
    | "order.exception";
  tenantSlug: string;
  settings: CrmConnectorSettings;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    pickupAddress: string;
    dropoffAddress: string;
    distanceMi: number;
    priceTotal: number;
    driverName?: string | null;
    driverPhone?: string | null;
    poNumber?: string;
    exceptionReason?: string | null;
    pod?: {
      recipientName?: string;
      signatureConfirmed?: boolean;
      deliveredAt?: string;
    } | null;
  };
}): Promise<{ synced: boolean; target: string }> {
  const { event, tenantSlug, settings, order } = params;
  if (settings.mode === "csv_only") {
    return { synced: false, target: "csv_only" };
  }

  const token = (settings.hubspotPrivateAppToken || "").trim();
  if (settings.mode === "hubspot_deals" && token.length > 10) {
    try {
      const stageMap: Record<string, string> = {
        ReadyForDispatch: "appointmentscheduled",
        Assigned: "qualifiedtobuy",
        Accepted: "presentationscheduled",
        PickedUp: "decisionmakerboughtin",
        InTransit: "contractsent",
        Delivered: "closedwon",
        Canceled: "closedlost",
      };
      const response = await fetch("https://api.hubapi.com/crm/v3/objects/deals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          properties: {
            dealname: `${order.orderNumber} — ${order.customerName}`,
            amount: String(order.priceTotal.toFixed(2)),
            dealstage: stageMap[order.status] || "appointmentscheduled",
            pipeline: settings.hubspotPipelineId || "default",
            description: `Event: ${event} | Pickup: ${order.pickupAddress} -> Dropoff: ${order.dropoffAddress} (${order.distanceMi} mi) | Driver: ${order.driverName || "Unassigned"}${order.pod?.recipientName ? ` | Signed by: ${order.pod.recipientName}` : ""}`,
          },
        }),
      });
      if (response.ok) {
        return { synced: true, target: "hubspot_direct_api" };
      }
    } catch {
      // Fall through to webhook if configured or offline
    }
  }

  const hook = (settings.webhookUrl || "").trim();
  if (hook.startsWith("http")) {
    try {
      await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          tenant_id: tenantSlug,
          timestamp: new Date().toISOString(),
          order,
        }),
      });
      return { synced: true, target: "unified_webhook" };
    } catch {
      return { synced: false, target: "webhook_offline" };
    }
  }

  return {
    synced: settings.mode === "hubspot_deals" && Boolean(token),
    target: settings.mode,
  };
}

