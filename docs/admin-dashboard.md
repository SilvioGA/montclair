# Plan: dashboard de administración — Montclair

La tienda hoy es estática. El catálogo vive en `src/data/catalog.ts` y la tienda en `src/data/config.ts`. Para marcar un perfume agotado hay que editar código y volver a publicar. El pedido no se guarda: se abre WhatsApp con el mensaje y se acaba.

El dashboard existe para que Silvio maneje la tienda sin tocar el repo. No es un ERP. Es el panel de una persona que despacha desde Managua por WhatsApp.

## Cómo se opera hoy

| Qué | Dónde está | Cómo se cambia |
|---|---|---|
| Perfume, casa, olor, género, mundo, moods | `catalog.ts` | código |
| Precios 3 / 5 / 10 ml y frasco | `catalog.ts` (`decants`) | código |
| Disponible / agotado | `perfume.available` | código |
| Foto | `public/products/*.jpg` | archivo + código |
| Relacionados | `related: string[]` | código |
| Combos (3 × 5 ml) | `catalog.ts` | código |
| Colecciones (Árabes, Nicho, Diseño, Noche…) | `collections` | código; Árabes está vacía |
| WhatsApp, ciudad, envíos, redes | `config.ts` | código |
| Pedido | `wa.me` con texto | no queda registro |

Lo que más duele en el día a día: **prender/apagar** y **cambiar precio**. Eso va primero.

## Principio

Una sola persona, celular o laptop, 2 minutos entre un mensaje y el siguiente. Cada pantalla responde a una pregunta concreta:

- ¿Qué está agotado?
- ¿Cuánto cuesta el 5 ml de este?
- ¿Llegó un original nuevo?
- ¿Este combo sigue teniendo todo disponible?
- ¿Qué pidieron hoy?

Si una función no entra en esa lista, no va en la v1.

## Forma del producto

- Ruta aparte: `admin.montclair…` o `/admin` con login. La tienda pública no se mezcla.
- Escritorio primero. El admin no usa el TabBar de la app.
- Misma marca (negro, Cinzel, poco ruido), pero es una herramienta: tablas, switches, guardar. No hero ni fotos de ambiente.
- Login con contraseña (o magic link). Un usuario basta al principio.
- La tienda pública **lee** el mismo origen de datos. Si apagás un perfume en el panel, el catálogo muestra Agotado sin redeploy.

## Datos que hay que sacar del código

Hoy el catálogo es un archivo TypeScript. Para que el panel funcione, perfume, combo y config tienen que vivir en una base (o un CMS) que el sitio consulte.

Modelo mínimo, calcado de lo que ya existe:

**Perfume**

- slug, nombre, casa, olor
- género (`el` / `ella` / `ambos`)
- mundo (`disenador` / `nicho` / `arabes`)
- moods (`dulce` / `fresco` / `noche` / `oficina`)
- foto
- `available`
- precios: 3, 5, 10, frasco
- relacionados (otros slugs)

**Combo**

- slug, nombre, blurb, foto, género, moods
- 3 ítems: perfume + tamaño (casi siempre 5 ml)
- disponible = los 3 perfumes están `available` (se calcula, no se edita a mano)

**Tienda**

- WhatsApp, ciudad de salida, texto de cobertura, nota de envío
- ciudades del checkout
- Instagram, TikTok

**Pedido** (nuevo; hoy no existe)

- fecha
- nombre, WhatsApp, ciudad, dirección, pago
- líneas (slug, tamaño, cantidad, precio)
- total
- estado: nuevo → confirmado → enviado → cancelado
- el mensaje de WhatsApp se sigue mandando; además se guarda una copia

Colecciones no se editan al principio. Siguen saliendo de mundo + mood. Cuando haya árabes de verdad, se cargan como perfumes con `world: arabes` y la página Árabes se llena sola.

## Pantallas

### 1. Entrada

Lista corta, no un dashboard de gráficas.

- Cuántos originales hay / cuántos agotados
- Combos que se rompieron (un ítem agotado)
- Pedidos nuevos sin tocar (cuando exista esa fase)

### 2. Originales — el corazón

Tabla: foto chica, casa, nombre, 5 ml (el que más piden), disponible, acciones.

En cada fila:

- switch **Disponible / Agotado** (un toque, se guarda solo)
- abrir ficha para editar

Ficha:

- nombre, casa, olor
- para quién, mundo, moods
- precios C$ de 3 / 5 / 10 / frasco
- foto (subir o pegar)
- 2–3 relacionados
- guardar

Alta de un original: el mismo formulario vacío. El slug se arma del nombre.

Sin esto, el panel no sirve.

### 3. Combos

Lista de packs. Se ve qué tres 5 ml lleva y si alguno está agotado.

Editar: nombre, texto, foto, los 3 perfumes. El precio sigue siendo la suma. Si un perfume se apaga, el combo se marca “hoy no cierra” en el panel y en la tienda no se vende (o se avisa; se decide al implementar, default: no se puede sumar).

### 4. Pedidos

Cuando el cliente toca pedir, además de abrir WhatsApp se guarda el pedido.

Lista: hora, nombre, ciudad, total, estado.  
Detalle: las líneas, el teléfono (tap para WhatsApp), cambiar estado.

Sin esto Silvio sigue teniendo el chat como única memoria. No es v1 si retrasa el switch de agotados; es la siguiente.

### 5. Tienda

Una pantalla:

- número de WhatsApp
- “Salimos de Managua…”
- nota de envío
- redes
- ciudades del selector

Poco. No un CMS de textos de toda la web.

## Qué no entra

- Stock en mililitros / ml restantes por frasco (después, si duele)
- Usuarios, roles, sucursales
- Pagos adentro de la web (sigue transferencia / pago móvil por chat)
- Editar colecciones, homepage, copy de cada página
- App nativa
- Reportes de venta elaborados

## Orden de construcción

**Fase 0 — cimiento**  
Auth. Perfume y config en base. La tienda pública lee de ahí (o se genera en build desde la base). Un script de una vez que sube los 11 originales y los 4 combos actuales.

**Fase 1 — el día a día**  
Lista de originales + switch disponible + editar los 4 precios. Esto solo ya justifica el panel.

**Fase 2 — catálogo vivo**  
Crear / editar original (texto, foto, tags, relacionados). Árabes se puede llenar sin deploy.

**Fase 3 — combos**  
Armar y desarmar packs. Aviso si un ítem está agotado.

**Fase 4 — pedidos**  
Guardar el checkout. Lista + estado. WhatsApp no se quita.

**Fase 5 — tienda**  
WhatsApp, cobertura, redes, ciudades.

## Notas de implementación (para cuando se construya)

- Panel en `/admin`, protegido. No indexar.
- La tienda puede seguir en Astro estático si el catálogo se pide a una API en build, o pasar el catálogo a fetch en el cliente/servidor. Decisión en el momento: si el agotado tiene que verse **al instante**, la tienda no puede depender de un deploy. Preferible API o ISR.
- Fotos a un bucket (`/products/...`). No commitear cada jpg.
- Precios siempre en córdobas enteros, como ahora.
- `available: false` se sigue viendo en el catálogo (Agotado / “Hoy no”), no se esconde.
- Un combo no debe apuntar a un slug que no existe.
- El panel no cambia el diseño de la tienda. Solo los datos.

## Criterio de listo

La fase 1 está lista cuando Silvio, desde el celular, marca YSL Y como agotado y en menos de un minuto la ficha en montclair ya dice Agotado, sin abrir VS Code.

La fase 4 está lista cuando un pedido por WhatsApp también aparece en el panel, con nombre, ciudad y qué ml pidieron.
