const KEY = "pk_viewer_id";

/** Anonymous, random per-browser id used only to avoid counting refreshes as new views. */
export function getViewerKey(): string {
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id || !/^[A-Za-z0-9-]{16,64}$/.test(id)) {
      id = crypto.randomUUID();
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
