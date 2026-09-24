/**
 * Public software catalog rows from `/data/software.json`.
 *
 * @param {unknown} catalog
 * @returns {Array<Record<string, unknown>>}
 */
export function publicItems(catalog) {
  const items = Array.isArray(catalog?.items) ? catalog.items : [];
  return items.filter((item) => {
    if (!item || typeof item !== "object") return false;
    if (item.status === "hidden") return false;
    if (!item.href || !item.title || !item.kind) return false;
    return true;
  });
}
