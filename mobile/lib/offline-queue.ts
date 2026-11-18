/**
 * Offline Store-and-Forward Field Mutation Queue (Gate 4)
 *
 * Ensures that when a courier driver is in a hospital basement, metal warehouse,
 * or rural dead zone with zero connectivity, capturing a Proof of Delivery photo,
 * signature, custody stamp, or status update NEVER blocks or fails.
 * Persists mutations locally in AsyncStorage and drains automatically when
 * connectivity resumes via NetInfo or manual sync.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

const OFFLINE_QUEUE_STORAGE_KEY = "ruller_offline_sync_queue_v1";

export type OfflineMutationType =
  | "CLAIM_RUN"
  | "PICKUP_CUSTODY"
  | "STATUS_CHANGE"
  | "PROOF_OF_DELIVERY"
  | "GPS_BREADCRUMB";

export interface OfflineQueuedMutation {
  id: string;
  tenantId: string;
  orderId: string;
  orderNumber: string;
  type: OfflineMutationType;
  summary: string;
  payload: Record<string, unknown>;
  queuedAt: string;
  attempts: number;
  lastError?: string;
}

export async function loadOfflineQueue(): Promise<OfflineQueuedMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveOfflineQueue(queue: OfflineQueuedMutation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore storage write errors
  }
}

export async function enqueueOfflineMutation(
  item: Omit<OfflineQueuedMutation, "id" | "queuedAt" | "attempts">
): Promise<OfflineQueuedMutation[]> {
  const existing = await loadOfflineQueue();
  const entry: OfflineQueuedMutation = {
    ...item,
    id: `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  };
  const updated = [entry, ...existing];
  await saveOfflineQueue(updated);
  return updated;
}

export async function drainOfflineQueue(
  syncItem: (item: OfflineQueuedMutation) => Promise<boolean>
): Promise<{ flushedCount: number; remaining: OfflineQueuedMutation[] }> {
  const queue = await loadOfflineQueue();
  if (queue.length === 0) {
    return { flushedCount: 0, remaining: [] };
  }

  // Drain oldest-first so order status transitions arrive chronologically
  const chronological = [...queue].reverse();
  const remaining: OfflineQueuedMutation[] = [];
  let flushedCount = 0;

  for (const item of chronological) {
    try {
      const ok = await syncItem(item);
      if (ok) {
        flushedCount += 1;
      } else {
        remaining.unshift({
          ...item,
          attempts: item.attempts + 1,
          lastError: "Remote sync deferred",
        });
      }
    } catch (err) {
      remaining.unshift({
        ...item,
        attempts: item.attempts + 1,
        lastError: err instanceof Error ? err.message : "Network error",
      });
    }
  }

  await saveOfflineQueue(remaining);
  return { flushedCount, remaining };
}

export async function clearOfflineQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function subscribeToConnectivity(
  onConnectivityChange: (isOnline: boolean) => void
): () => void {
  try {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(
        state.isConnected && state.isInternetReachable !== false
      );
      onConnectivityChange(online);
    });
    return unsubscribe;
  } catch {
    return () => {};
  }
}
