/**
 * QR code helpers for in-person key / registration handshakes.
 */

import { qrcodegen } from "../vendor/qrcodegen.js";

/**
 * @param {string} text
 * @param {number} [sizePx]
 * @returns {string} SVG data URL suitable for `<img src="…">`
 */
export function qrSvgDataUrl(text, sizePx = 240) {
  const qr = qrcodegen.QrCode.encodeText(text, qrcodegen.QrCode.Ecc.MEDIUM);
  const n = qr.size;
  const border = 4;
  const scale = Math.max(1, Math.floor(sizePx / (n + border * 2)));
  const dim = (n + border * 2) * scale;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}">`;
  svg += `<rect width="100%" height="100%" fill="#fff"/>`;
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      if (qr.getModule(x, y)) {
        svg += `<rect x="${(x + border) * scale}" y="${(y + border) * scale}" width="${scale}" height="${scale}" fill="#000"/>`;
      }
    }
  }
  svg += "</svg>";
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
