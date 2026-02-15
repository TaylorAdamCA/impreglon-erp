// Pricing constants — change these to adjust calculations globally
export const DRT_MARKUP = 1.3;
export const FITTING_PRICE3_MARKUP = 1.1;
export const DHT_RATE = 0.67;
export const DHT_MIN_PRICE = 5.75;
export const DHT_PI = 3.14;

/** Calculate line item total: quantity x unitPrice, rounded to 2 decimals */
export function calculateLineTotal(quantity: number, unitPrice: number): number {
  return Math.trunc(quantity * unitPrice * 100) / 100;
}

/** Calculate DRT selling price from cost: cost x 1.3 */
export function calculateDrtMarkup(cost: number): number {
  return Math.round(cost * DRT_MARKUP * 100) / 100;
}

/** Calculate fitting coatingPrice3 from coatingPrice1: price1 x 1.1 */
export function calculateFittingPrice3(coatingPrice1: number): number {
  return Math.round(coatingPrice1 * FITTING_PRICE3_MARKUP * 100) / 100;
}

/** Calculate DHT area-based price: diameter x length x pi x rate, min $5.75 */
export function calculateDhtPrice(diameter: number, length: number): number {
  const price = Math.round(diameter * length * DHT_PI * DHT_RATE * 100) / 100;
  return Math.max(price, DHT_MIN_PRICE);
}
