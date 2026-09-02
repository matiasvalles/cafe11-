import { Resend } from 'resend';

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(num);
}

const SYSTEM_FONTS = new Set([
  'arial',
  'helvetica',
  'times new roman',
  'times',
  'georgia',
  'cambria',
  'garamond',
  'courier new',
  'courier',
  'verdana',
  'tahoma',
  'trebuchet ms',
  'sans-serif',
  'serif',
  'monospace',
]);

function sanitizeFont(font) {
  if (!font || typeof font !== 'string') return 'Inter';
  let clean = font.replace(/['"]/g, '').trim();
  if (clean.includes(',')) {
    clean = clean.split(',')[0].trim();
  }
  return clean || 'Inter';
}

function detectCategory(fontName) {
  const lower = (fontName || '').toLowerCase();
  if (
    lower.includes('serif') ||
    lower.includes('playfair') ||
    lower.includes('cinzel') ||
    lower.includes('lora') ||
    lower.includes('merriweather') ||
    lower.includes('bodoni') ||
    lower.includes('cormorant') ||
    lower.includes('garamond') ||
    lower.includes('prata') ||
    lower.includes('times') ||
    lower.includes('georgia') ||
    lower.includes('baskerville')
  ) {
    return 'serif';
  }

  if (
    lower.includes('space') ||
    lower.includes('syne') ||
    lower.includes('cabinet') ||
    lower.includes('orbitron') ||
    lower.includes('exo') ||
    lower.includes('clash') ||
    lower.includes('unbounded') ||
    lower.includes('grotesk')
  ) {
    return 'geometric';
  }

  if (
    lower.includes('nunito') ||
    lower.includes('quicksand') ||
    lower.includes('comfortaa') ||
    lower.includes('varela')
  ) {
    return 'rounded';
  }

  if (
    lower.includes('mono') ||
    lower.includes('courier') ||
    lower.includes('consolas') ||
    lower.includes('jetbrains')
  ) {
    return 'mono';
  }

  return 'sans';
}

function resolveFontConfig({ titleFont, paragraphFont, fontFamily, style }) {
  const rawTitle = titleFont || style?.titleFont || style?.fontFamily || fontFamily || 'Inter';
  const rawBody = paragraphFont || style?.paragraphFont || style?.fontFamily || fontFamily || 'Inter';

  const titleName = sanitizeFont(rawTitle);
  const bodyName = sanitizeFont(rawBody);

  const titleCat = detectCategory(titleName);
  const bodyCat = detectCategory(bodyName);

  const googleFontsImportUrls = [];
  const fontsToLoad = new Set();

  if (!SYSTEM_FONTS.has(titleName.toLowerCase())) {
    fontsToLoad.add(titleName);
  }
  if (!SYSTEM_FONTS.has(bodyName.toLowerCase())) {
    fontsToLoad.add(bodyName);
  }

  fontsToLoad.forEach((f) => {
    const formatted = f.replace(/\s+/g, '+');
    googleFontsImportUrls.push(
      `https://fonts.googleapis.com/css2?family=${formatted}:wght@400;500;600;700;800&display=swap`
    );
  });

  // Title Stack
  let titleFontStack = `"${titleName}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  let msoTitleFallback = 'Arial, Helvetica, sans-serif';

  if (titleCat === 'serif') {
    titleFontStack = `"${titleName}", "Playfair Display", Georgia, "Times New Roman", Times, serif`;
    msoTitleFallback = "Georgia, 'Times New Roman', serif";
  } else if (titleCat === 'geometric') {
    titleFontStack = `"${titleName}", "Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`;
    msoTitleFallback = 'Arial, Helvetica, sans-serif';
  } else if (titleCat === 'rounded') {
    titleFontStack = `"${titleName}", "Nunito", "Quicksand", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`;
    msoTitleFallback = 'Arial, Helvetica, sans-serif';
  } else if (titleCat === 'mono') {
    titleFontStack = `"${titleName}", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    msoTitleFallback = "'Courier New', Courier, monospace";
  } else {
    titleFontStack = `"${titleName}", "Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
    msoTitleFallback = 'Arial, Helvetica, sans-serif';
  }

  // Body Stack
  let bodyFontStack = `"${bodyName}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  let msoBodyFallback = 'Arial, Helvetica, sans-serif';

  if (bodyCat === 'serif') {
    bodyFontStack = `"${bodyName}", "Lora", "Merriweather", Georgia, "Times New Roman", Times, serif`;
    msoBodyFallback = "Georgia, 'Times New Roman', serif";
  } else if (bodyCat === 'rounded') {
    bodyFontStack = `"${bodyName}", "Nunito", "Quicksand", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`;
    msoBodyFallback = 'Arial, Helvetica, sans-serif';
  } else if (bodyCat === 'mono') {
    bodyFontStack = `"${bodyName}", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    msoBodyFallback = "'Courier New', Courier, monospace";
  } else {
    bodyFontStack = `"${bodyName}", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
    msoBodyFallback = 'Arial, Helvetica, sans-serif';
  }

  return {
    titleName,
    bodyName,
    titleFontStack,
    bodyFontStack,
    googleFontsImportUrls,
    msoTitleFallback,
    msoBodyFallback,
  };
}

function generateOrderEmailHtml({
  order,
  storeName,
  storeUrl,
  bankDetails,
  logoUrl,
  accentColor,
  fontFamily,
  titleFont,
  paragraphFont,
  style,
  themeMode,
  isTest = false,
}) {
  const customerName = order.customerName || order.firstname || 'Cliente';
  const orderId = order.id || order.orderNumber || `ORD-${Date.now()}`;
  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = Number(order.subtotal || 0);
  const shippingCost = Number(order.shippingCost || 0);
  const discount = Number(order.discount || 0);
  const total = Number(order.total || 0);
  const deliveryMethod = order.deliveryMethod === 'pickup' ? 'Retiro en punto de entrega' : 'Envío a domicilio';
  const address = order.address || order.shippingAddress || 'No especificada';
  const paymentMethod = order.paymentMethod || 'mercadopago';
  const isTransfer = paymentMethod === 'transfer' || paymentMethod === 'bank_transfer' || paymentMethod === 'manual';
  const brandAccent = accentColor || style?.accentColor || style?.primaryColor || '#6366f1';

  const fonts = resolveFontConfig({ titleFont, paragraphFont, fontFamily, style });

  const resolvedThemeMode = themeMode || style?.themeMode || 'auto';
  const isExplicitDark = resolvedThemeMode === 'dark';

  // Dynamic Theme Colors
  const bgMain = isExplicitDark ? '#09090b' : '#f4f5f7';
  const cardBg = isExplicitDark ? '#121215' : '#ffffff';
  const cardBorder = isExplicitDark ? '#27272a' : '#e4e4e7';
  const headerBg = isExplicitDark
    ? 'linear-gradient(180deg, #18181b 0%, #121215 100%)'
    : 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)';
  const headerBorder = isExplicitDark ? '#27272a' : '#e4e4e7';
  const sectionBg = isExplicitDark ? '#18181b' : '#f9fafb';
  const sectionBorder = isExplicitDark ? '#27272a' : '#e4e4e7';
  const rowBorder = isExplicitDark ? '#27272a' : '#f4f4f5';
  const textHeading = isExplicitDark ? '#ffffff' : '#09090b';
  const textBody = isExplicitDark ? '#d4d4d8' : '#27272a';
  const textMuted = isExplicitDark ? '#a1a1aa' : '#71717a';
  const textSubtle = isExplicitDark ? '#71717a' : '#a1a1aa';
  const totalDivider = isExplicitDark ? '#3f3f46' : '#e4e4e7';
  const footerBg = isExplicitDark ? '#09090b' : '#f4f5f7';
  const footerBorder = isExplicitDark ? '#27272a' : '#e4e4e7';
  const imgBorder = isExplicitDark ? '#27272a' : '#e4e4e7';
  const badgeBg = isExplicitDark ? `${brandAccent}20` : `${brandAccent}15`;
  const badgeBorder = isExplicitDark ? `${brandAccent}40` : `${brandAccent}30`;

  const itemsRows = items.map((item) => {
    const prod = item.product || item;
    const title = item.name || prod.name || prod.title || 'Producto';
    const variant = item.variantLabel ? `<div class="text-muted" style="font-size: 11px; color: ${textMuted}; margin-top: 2px; font-family: ${fonts.bodyFontStack};">Variante: ${item.variantLabel}</div>` : '';
    const qty = Number(item.quantity || 1);
    const unitPrice = Number(prod.price || prod.unit_price || 0);
    const lineTotal = unitPrice * qty;
    const imgUrl = prod.image || prod.picture_url || (prod.images && prod.images[0]) || '';
    const imgTag = imgUrl ? `<img src="${imgUrl}" alt="${title}" width="56" height="56" class="img-thumb" style="width: 56px; height: 56px; max-width: 56px; max-height: 56px; object-fit: cover; border-radius: 8px; vertical-align: middle; border: 1px solid ${imgBorder}; background-color: #ffffff; display: block;" />` : '';

    return `
      <tr class="email-table-row" style="border-bottom: 1px solid ${rowBorder};">
        <td style="padding: 12px 6px; text-align: left; vertical-align: middle;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
            <tr>
              ${imgUrl ? `<td style="width: 64px; vertical-align: middle; padding-right: 10px;">${imgTag}</td>` : ''}
              <td style="vertical-align: middle;">
                <strong class="text-heading" style="color: ${textHeading}; font-size: 13px; display: block; line-height: 1.3; font-family: ${fonts.bodyFontStack}; font-weight: 600;">${title}</strong>
                ${variant}
                <span class="text-muted" style="font-size: 11px; color: ${textMuted}; font-family: ${fonts.bodyFontStack};">Cant: ${qty} × ${formatCurrency(unitPrice)}</span>
              </td>
            </tr>
          </table>
        </td>
        <td class="text-heading" style="padding: 12px 6px; text-align: right; vertical-align: middle; color: ${textHeading}; font-weight: 600; font-size: 13px; white-space: nowrap; font-family: ${fonts.bodyFontStack};">
          ${formatCurrency(lineTotal)}
        </td>
      </tr>
    `;
  }).join('');

  let bankSection = '';
  if (isTransfer && bankDetails && (bankDetails.transferCbu || bankDetails.transferAlias || bankDetails.transferBankName)) {
    const { transferBankName, transferAccountHolder, transferCbu, transferAlias } = bankDetails;
    bankSection = `
      <div class="email-section-box email-bank-box" style="margin-top: 24px; padding: 18px; background-color: ${sectionBg}; border: 1px solid ${brandAccent}40; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
        <h3 class="brand-heading" style="margin: 0 0 10px 0; color: ${brandAccent}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-family: ${fonts.titleFontStack};">
          🏦 Datos para la Transferencia Bancaria
        </h3>
        <p class="text-body-p" style="margin: 0 0 12px 0; color: ${textBody}; font-size: 12px; line-height: 1.5; font-family: ${fonts.bodyFontStack};">
          Por favor realiza la transferencia por el total exacto del pedido (<strong>${formatCurrency(total)}</strong>) para confirmar y despachar tu compra:
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; font-family: ${fonts.bodyFontStack};">
          ${transferBankName ? `<tr><td class="text-muted" style="padding: 4px 0; color: ${textMuted};">Banco:</td><td class="text-heading" style="padding: 4px 0; color: ${textHeading}; font-weight: 600; text-align: right;">${transferBankName}</td></tr>` : ''}
          ${transferAccountHolder ? `<tr><td class="text-muted" style="padding: 4px 0; color: ${textMuted};">Titular:</td><td class="text-heading" style="padding: 4px 0; color: ${textHeading}; font-weight: 600; text-align: right;">${transferAccountHolder}</td></tr>` : ''}
          ${transferCbu ? `<tr><td class="text-muted" style="padding: 4px 0; color: ${textMuted};">CBU / CVU:</td><td style="padding: 4px 0; color: #0284c7; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 700; text-align: right;">${transferCbu}</td></tr>` : ''}
          ${transferAlias ? `<tr><td class="text-muted" style="padding: 4px 0; color: ${textMuted};">Alias:</td><td style="padding: 4px 0; color: #059669; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 700; text-align: right;">${transferAlias}</td></tr>` : ''}
        </table>
        <p class="text-muted email-row-divider" style="margin: 12px 0 0 0; font-size: 11px; color: ${textMuted}; border-top: 1px dashed ${sectionBorder}; padding-top: 8px; font-family: ${fonts.bodyFontStack};">
          Una vez transferido, podés enviar el comprobante respondiendo a este email o por el botón de WhatsApp de la tienda.
        </p>
      </div>
    `;
  }

  const storeHeaderTitle = storeName || 'Tienda Online';
  const formattedDate = new Date().toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const fontLinksHtml = fonts.googleFontsImportUrls.length > 0
    ? `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ${fonts.googleFontsImportUrls.map((url) => `<link href="${url}" rel="stylesheet">`).join('\n  ')}`
    : '';

  const fontImportsCss = fonts.googleFontsImportUrls.length > 0
    ? fonts.googleFontsImportUrls.map((url) => `@import url('${url}');`).join('\n    ')
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Confirmación de Pedido - ${storeHeaderTitle}</title>${fontLinksHtml}
  <style type="text/css">
    ${fontImportsCss}

    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }

    body, table, td, p, span, a {
      font-family: ${fonts.bodyFontStack};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    h1, h2, h3, h4, .brand-heading, .order-total-price {
      font-family: ${fonts.titleFontStack};
    }

    img {
      border: 0;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }

    /* Auto Responsive Dark Mode */
    @media (prefers-color-scheme: dark) {
      body, .email-bg-wrap {
        background-color: #09090b !important;
        color: #f4f4f5 !important;
      }
      .email-card-box {
        background-color: #121215 !important;
        border-color: #27272a !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.6) !important;
      }
      .email-header-box {
        background: linear-gradient(180deg, #18181b 0%, #121215 100%) !important;
        border-bottom-color: #27272a !important;
      }
      .email-section-box {
        background-color: #18181b !important;
        border-color: #27272a !important;
      }
      .email-bank-box {
        background-color: #18181b !important;
        border-color: ${brandAccent}40 !important;
      }
      .email-table-row {
        border-bottom-color: #27272a !important;
      }
      .email-row-divider {
        border-top-color: #27272a !important;
      }
      .email-total-divider {
        border-top-color: #3f3f46 !important;
      }
      .email-footer-box {
        background-color: #09090b !important;
        border-top-color: #27272a !important;
      }
      .text-heading {
        color: #ffffff !important;
      }
      .text-body-p {
        color: #d4d4d8 !important;
      }
      .text-muted {
        color: #a1a1aa !important;
      }
      .text-subtle {
        color: #71717a !important;
      }
      .text-code-val {
        color: #ffffff !important;
      }
      .img-thumb {
        border-color: #27272a !important;
      }
    }

    /* Outlook / Office 365 Dark Mode Hooks */
    [data-ogsc] .email-bg-wrap, [data-ogsb] .email-bg-wrap { background-color: #09090b !important; color: #f4f4f5 !important; }
    [data-ogsc] .email-card-box, [data-ogsb] .email-card-box { background-color: #121215 !important; border-color: #27272a !important; }
    [data-ogsc] .email-header-box, [data-ogsb] .email-header-box { background: #18181b !important; border-bottom-color: #27272a !important; }
    [data-ogsc] .email-section-box, [data-ogsb] .email-section-box { background-color: #18181b !important; border-color: #27272a !important; }
    [data-ogsc] .email-table-row, [data-ogsb] .email-table-row { border-bottom-color: #27272a !important; }
    [data-ogsc] .email-footer-box, [data-ogsb] .email-footer-box { background-color: #09090b !important; border-top-color: #27272a !important; }
    [data-ogsc] .text-heading, [data-ogsb] .text-heading { color: #ffffff !important; }
    [data-ogsc] .text-body-p, [data-ogsb] .text-body-p { color: #d4d4d8 !important; }
    [data-ogsc] .text-muted, [data-ogsb] .text-muted { color: #a1a1aa !important; }
    [data-ogsc] .text-subtle, [data-ogsb] .text-subtle { color: #71717a !important; }
    [data-ogsc] .text-code-val, [data-ogsb] .text-code-val { color: #ffffff !important; }
    
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, span, a, strong { font-family: ${fonts.msoBodyFallback} !important; }
    h1, h2, h3, h4, .brand-heading, .order-total-price { font-family: ${fonts.msoTitleFallback} !important; }
  </style>
  <![endif]-->
</head>
<body class="email-bg-wrap" style="margin: 0; padding: 0; background-color: ${bgMain}; font-family: ${fonts.bodyFontStack}; color: ${textBody}; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-bg-wrap" style="background-color: ${bgMain}; padding: 30px 10px; font-family: ${fonts.bodyFontStack};">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" class="email-card-box" style="max-width: 600px; background-color: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td class="email-header-box" style="padding: 32px 24px; background: ${headerBg}; border-bottom: 1px solid ${headerBorder}; text-align: center;">
              ${logoUrl ? `
                <div style="margin-bottom: 10px;">
                  <img src="${logoUrl}" alt="${storeHeaderTitle}" class="store-logo" style="max-height: 48px; max-width: 180px; width: auto; height: auto; object-fit: contain; vertical-align: middle; display: inline-block;" />
                </div>
              ` : `
                <h1 class="brand-heading text-heading" style="margin: 0; font-size: 24px; font-weight: 800; color: ${textHeading}; letter-spacing: -0.5px; font-family: ${fonts.titleFontStack};">
                  ${storeHeaderTitle}
                </h1>
              `}
              ${storeUrl ? `<a href="${storeUrl}" style="color: ${brandAccent}; font-size: 11px; text-decoration: none; display: inline-block; margin-top: 4px; font-family: ${fonts.bodyFontStack};">${storeUrl.replace(/^https?:\/\//, '')}</a>` : ''}
              ${isTest ? '<div style="margin-top: 8px; display: inline-block; background-color: #f59e0b20; border: 1px solid #f59e0b40; color: #fbbf24; font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 6px;">EMAIL DE PRUEBA</div>' : ''}
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 28px 24px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; color: ${brandAccent}; border-radius: 50%; font-size: 20px;">
                  ✓
                </div>
                <h2 class="brand-heading text-heading" style="margin: 12px 0 4px 0; color: ${textHeading}; font-size: 19px; font-weight: 700; font-family: ${fonts.titleFontStack};">
                  ¡Gracias por tu compra, ${customerName}!
                </h2>
                <p class="text-muted" style="margin: 0; color: ${textMuted}; font-size: 13px; font-family: ${fonts.bodyFontStack};">
                  Hemos recibido tu pedido correctamente. A continuación encuentras el detalle completo:
                </p>
              </div>

              <!-- Order Meta Card -->
              <div class="email-section-box" style="background-color: ${sectionBg}; border: 1px solid ${sectionBorder}; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; font-family: ${fonts.bodyFontStack};">
                  <tr>
                    <td class="text-muted" style="color: ${textMuted}; padding: 3px 0;">Número de Pedido:</td>
                    <td class="text-heading text-code-val" style="color: ${textHeading}; font-weight: 700; text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px;">${orderId}</td>
                  </tr>
                  <tr>
                    <td class="text-muted" style="color: ${textMuted}; padding: 3px 0;">Fecha:</td>
                    <td class="text-heading" style="color: ${textHeading}; text-align: right;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td class="text-muted" style="color: ${textMuted}; padding: 3px 0;">Método de Pago:</td>
                    <td class="text-heading" style="color: ${textHeading}; font-weight: 600; text-align: right;">${isTransfer ? 'Transferencia Bancaria' : 'Mercado Pago / Tarjeta'}</td>
                  </tr>
                  <tr>
                    <td class="text-muted" style="color: ${textMuted}; padding: 3px 0;">Tipo de Entrega:</td>
                    <td class="text-heading" style="color: ${textHeading}; text-align: right;">${deliveryMethod}</td>
                  </tr>
                  ${address && address !== 'No especificada' ? `
                  <tr>
                    <td class="text-muted" style="color: ${textMuted}; padding: 3px 0;">Dirección:</td>
                    <td class="text-heading" style="color: ${textHeading}; text-align: right;">${address}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <!-- Items Table -->
              <h3 class="brand-heading text-heading" style="margin: 20px 0 10px 0; color: ${textHeading}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-family: ${fonts.titleFontStack};">
                Productos en tu orden
              </h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-family: ${fonts.bodyFontStack};">
                ${itemsRows}
              </table>

              <!-- Totals Breakdown -->
              <div class="email-section-box" style="background-color: ${sectionBg}; border: 1px solid ${sectionBorder}; border-radius: 12px; padding: 14px 18px; margin-top: 16px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; font-family: ${fonts.bodyFontStack};">
                  <tr>
                    <td class="text-muted" style="color: ${textMuted}; padding: 4px 0;">Subtotal</td>
                    <td class="text-heading" style="color: ${textHeading}; text-align: right; font-weight: 600;">${formatCurrency(subtotal || (total - shippingCost + discount))}</td>
                  </tr>
                  ${shippingCost > 0 ? `
                  <tr>
                    <td class="text-muted" style="color: ${textMuted}; padding: 4px 0;">Envío</td>
                    <td class="text-heading" style="color: ${textHeading}; text-align: right; font-weight: 600;">${formatCurrency(shippingCost)}</td>
                  </tr>
                  ` : ''}
                  ${discount > 0 ? `
                  <tr>
                    <td style="color: #059669; padding: 4px 0;">Descuento aplicado</td>
                    <td style="color: #059669; text-align: right; font-weight: 600;">-${formatCurrency(discount)}</td>
                  </tr>
                  ` : ''}
                  <tr class="email-total-divider" style="border-top: 1px solid ${totalDivider};">
                    <td class="brand-heading text-heading" style="color: ${textHeading}; font-size: 15px; font-weight: 800; padding: 10px 0 4px 0; font-family: ${fonts.titleFontStack};">Total</td>
                    <td class="order-total-price" style="color: ${brandAccent}; font-size: 18px; font-weight: 800; text-align: right; padding: 10px 0 4px 0; font-family: ${fonts.titleFontStack};">${formatCurrency(total)}</td>
                  </tr>
                </table>
              </div>

              <!-- Bank Transfer Details if applicable -->
              ${bankSection}

              <!-- Support Note -->
              <p class="text-muted" style="margin: 28px 0 0 0; text-align: center; font-size: 12px; color: ${textMuted}; font-family: ${fonts.bodyFontStack};">
                Si tenés alguna duda sobre tu pedido, podés responder directamente a este correo electrónico.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-footer-box text-muted" style="padding: 20px 24px; background-color: ${footerBg}; border-top: 1px solid ${footerBorder}; text-align: center; font-size: 11px; color: ${textMuted}; font-family: ${fonts.bodyFontStack};">
              <p class="text-subtle" style="margin: 0; color: ${textSubtle};">© ${new Date().getFullYear()} ${storeHeaderTitle}. Todos los derechos reservados.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Utilizar POST.' });
  }

  try {
    const {
      order,
      to,
      recipientEmail,
      storeName,
      storeUrl,
      bankDetails,
      resendConfig,
      logoUrl,
      accentColor,
      fontFamily,
      titleFont,
      paragraphFont,
      style,
      themeMode,
      isTest = false,
      customSubject,
    } = req.body || {};

    const targetApiKey = (resendConfig?.apiKey || process.env.RESEND_API_KEY || '').trim();
    if (!targetApiKey) {
      return res.status(200).json({
        success: false,
        skipped: true,
        message: 'Resend no está configurado (falta RESEND_API_KEY en Vercel). El pedido se completó normalmente.',
      });
    }

    const fromAddress = (resendConfig?.fromEmail || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev').trim();
    const adminAddress = (resendConfig?.adminEmail || process.env.RESEND_ADMIN_EMAIL || '').trim();
    const customerEmail = (to || recipientEmail || order?.customerEmail || order?.email || '').trim();

    if (!customerEmail && !adminAddress) {
      return res.status(400).json({
        success: false,
        error: 'No se especificó ningún email de destinatario válido.',
      });
    }

    const orderId = order?.id || order?.orderNumber || `ORD-${Date.now()}`;
    const subject = customSubject || (isTest
      ? `[Prueba] Confirmación de Pedido #${orderId} - ${storeName || 'Tu Tienda'}`
      : `Confirmación de tu pedido #${orderId} - ${storeName || 'Tu Tienda'}`);

    const htmlContent = generateOrderEmailHtml({
      order: order || {
        id: orderId,
        customerName: 'Cliente de Prueba',
        items: [
          { name: 'Producto de Demostración', quantity: 1, price: 15000 }
        ],
        subtotal: 15000,
        shippingCost: 0,
        total: 15000,
        paymentMethod: 'mercadopago',
        deliveryMethod: 'shipping',
        address: 'Av. Corrientes 1234, CABA',
      },
      storeName,
      storeUrl,
      bankDetails,
      logoUrl,
      accentColor,
      fontFamily,
      titleFont,
      paragraphFont,
      style,
      themeMode,
      isTest,
    });

    const resend = new Resend(targetApiKey);
    const results = {};

    // 1. Send to Customer
    if (customerEmail && resendConfig?.notifyCustomer !== false) {
      try {
        const custResult = await resend.emails.send({
          from: fromAddress.includes('<') ? fromAddress : `${storeName || 'Tienda Online'} <${fromAddress}>`,
          to: customerEmail,
          subject: subject,
          html: htmlContent,
        });

        if (custResult.error) {
          console.error('[Resend Customer Email Error]:', custResult.error);
          results.customerError = custResult.error.message || custResult.error;
        } else {
          results.customerEmailId = custResult.data?.id;
          results.customerSuccess = true;
        }
      } catch (err) {
        console.error('[Resend Send Exception to Customer]:', err);
        results.customerError = err.message;
      }
    }

    // 2. Send notice to Admin if configured
    if (adminAddress && adminAddress !== customerEmail && resendConfig?.notifyAdmin !== false) {
      try {
        const adminSubject = `[Nuevo Pedido Recibido] #${orderId} de ${order?.customerName || customerEmail} ($${order?.total || 0})`;
        const adminResult = await resend.emails.send({
          from: fromAddress.includes('<') ? fromAddress : `${storeName || 'Tienda Online'} <${fromAddress}>`,
          to: adminAddress,
          subject: adminSubject,
          html: htmlContent,
        });

        if (adminResult.error) {
          console.error('[Resend Admin Email Error]:', adminResult.error);
          results.adminError = adminResult.error.message || adminResult.error;
        } else {
          results.adminEmailId = adminResult.data?.id;
          results.adminSuccess = true;
        }
      } catch (err) {
        console.error('[Resend Send Exception to Admin]:', err);
        results.adminError = err.message;
      }
    }

    if (results.customerSuccess || results.adminSuccess) {
      return res.status(200).json({
        success: true,
        message: 'Email(s) enviado(s) con éxito a través de Resend API.',
        results,
      });
    }

    return res.status(400).json({
      success: false,
      error: results.customerError || results.adminError || 'No se pudo enviar el correo a través de Resend.',
      results,
    });
  } catch (globalErr) {
    console.error('[Resend Handler Global Error]:', globalErr);
    return res.status(500).json({
      success: false,
      error: globalErr.message || 'Error interno del servidor al procesar el email.',
    });
  }
}
