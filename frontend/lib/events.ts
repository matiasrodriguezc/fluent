export const SOURCES_UPDATED_EVENT = "sources-updated";

export function triggerSourcesUpdate() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(SOURCES_UPDATED_EVENT));
    }
}