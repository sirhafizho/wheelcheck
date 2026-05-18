// Module-level backend status observable — no React Context needed.
// ApiClient signals status changes here; BackendStatusBanner subscribes.

export type BackendStatus = 'unknown' | 'online' | 'booting';

type Listener = (status: BackendStatus) => void;

const listeners = new Set<Listener>();
let currentStatus: BackendStatus = 'unknown';

export function getBackendStatus(): BackendStatus {
  return currentStatus;
}

export function setBackendStatus(status: BackendStatus) {
  if (currentStatus === status) return;
  currentStatus = status;
  listeners.forEach((l) => l(status));
}

export function subscribeBackendStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
