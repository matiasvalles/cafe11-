# Variables de entorno para Vercel — Cafe 11*

Este .zip **no contiene ningún token ni credencial**. Cada función dentro de
`api/` los lee en tiempo de ejecución desde las variables de entorno de tu
proyecto en Vercel. Los valores reales de tus tokens los encontrás en el
editor, en **Exportar → Variables de entorno**, con un botón para copiar cada
uno.

## Cómo cargarlas en Vercel

1. Subí esta carpeta a un repositorio de GitHub y conectalo a Vercel (o corré
   `vercel deploy` desde la CLI).
2. En tu proyecto de Vercel: **Settings → Environment Variables**.
3. Pegá cada variable de la lista de abajo con su valor real (copiado desde
   el editor).
4. Volvé a desplegar (**Deployments → ⋯ → Redeploy**) para que tomen efecto.


## Mercado Pago

- `MP_ACCESS_TOKEN` — Access Token de tu cuenta de Mercado Pago (obligatoria
  para que `api/checkout.js` pueda crear preferencias de pago reales).
- `FIREBASE_SERVICE_ACCOUNT_KEY` (o `FIREBASE_PROJECT_ID` +
  `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`) — opcional, solo si
  querés que las órdenes se guarden en Firestore vía Firebase Admin. Sin esto
  el checkout igual funciona, solo no persiste el pedido en la nube.

## Zipnova

- `ZIPNOVA_API_KEY` y `ZIPNOVA_API_SECRET` — credenciales de tu cuenta de
  Zipnova, usadas por `api/zipnova-quote.js` para cotizar envíos.
- `ZIPNOVA_ACCOUNT_ID` — opcional; si no la configurás, la función la
  resuelve automáticamente contra tu cuenta de Zipnova.
- Si estas variables no están configuradas, el sitio sigue funcionando (no se
  rompe el checkout) pero no va a mostrar tarifas de Zipnova hasta que las
  cargues y hagas un Redeploy.

## MailerLite

- `MAILERLITE_API_KEY` — token de tu cuenta de MailerLite, usado por
  `api/mailerlite/subscribe.js` para suscribir emails del formulario de
  newsletter y por `api/mailerlite/verify.js` para validar el token desde
  el panel de Configuración. Sin esta variable, el formulario confirma el
  envío pero no suscribe a nadie.

## Resend (Emails de confirmación de pedidos)

- `RESEND_API_KEY` — API Key de tu cuenta de Resend (empieza con `re_`), usada por `api/resend/send.js` en el servidor de Vercel para enviar emails automáticos con el recibo de compra.
- `RESEND_FROM_EMAIL` — (Opcional) Remitente verificado (ej: `ventas@tudominio.com` o `onboarding@resend.dev` para pruebas).
- `RESEND_ADMIN_EMAIL` — (Opcional) Tu correo para recibir copia/aviso de cada orden creada.

## Nota de seguridad

Ninguna de estas credenciales se envía nunca al navegador de tus visitantes:
viven solo en el servidor (Vercel) y las leen las funciones dentro de `api/`.
Si sospechás que alguna se filtró, regenerala desde el panel del proveedor
correspondiente (Mercado Pago, Zipnova o MailerLite) y actualizá el valor en
Vercel.
