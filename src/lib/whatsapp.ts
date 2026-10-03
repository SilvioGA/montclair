import { store } from "../data/config";
import type { Cart } from "./cart";
import { money } from "./money";

export function orderMessage(
  cart: Cart,
  customer: { name: string; phone: string; city: string; address: string; pay: string },
  opts: { freeShippingFrom?: number } = {},
) {
  const lines = cart.items.map((i) => {
    const base = `• ${i.name} — ${i.sizeLabel} × ${i.qty} = ${money(i.price * i.qty)}`;
    const list = typeof i.listPrice === "number" ? i.listPrice : i.price;
    return list > i.price ? `${base} (oferta, antes ${money(list)})` : base;
  });
  const freeFrom = opts.freeShippingFrom || 0;
  const shipping =
    freeFrom > 0 && cart.total >= freeFrom ? `Envío gratis (pedido desde ${money(freeFrom)}).` : store.shippingNote;
  return [
    `Hola, quiero este pedido de ${store.name}:`,
    "",
    ...lines,
    "",
    `Total: ${money(cart.total)}${cart.saved > 0 ? ` · ahorro ${money(cart.saved)}` : ""}`,
    shipping,
    "",
    `Nombre: ${customer.name}`,
    `WhatsApp: ${customer.phone}`,
    `Ciudad: ${customer.city}`,
    `Dirección: ${customer.address}`,
    `Pago: ${customer.pay}`,
  ].join("\n");
}

export function whatsappUrl(text: string) {
  return `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(text)}`;
}
