/**
 * Paid-registrar order ids (`guldreg_<name>_<8 hex>`).
 * Keep in sync with `new_order_id` in guld-node `registrar.rs`.
 */

/** @type {RegExp} */
export const GULD_ORDER_ID_RE = /^guldreg_[a-z0-9._]+_[0-9a-f]{8}$/;

/** Human-readable pattern for help / Paymento field validation. */
export const GULD_ORDER_ID_PATTERN = String.raw`^guldreg_[a-z0-9._]+_[0-9a-f]{8}$`;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isGuldOrderId(value) {
  return GULD_ORDER_ID_RE.test(String(value || "").trim());
}
