import { store } from "../data/config";
import type { Cart } from "./cart";
import { money } from "./money";

export function orderMessage(
  cart: Cart,
  customer: { name: string; phone: string; city: string; address: string; pay: string },
) {
  const lines = cart.items.map((i) => `• ${i.name} — ${i.sizeLabel} × ${i.qty} = ${money(i.price * i.qty)}`);
  return [
    `Hola, quiero este pedido de ${store.name}:`,
    "",
    ...lines,
    "",
    `Total: ${money(cart.total)}`,
    store.shippingNote,
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
