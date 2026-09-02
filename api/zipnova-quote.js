// api/zipnova-quote.js
// Función serverless de Vercel: cotiza tarifas reales de envío con Zipnova usando
// credenciales privadas configuradas como variables de entorno del servidor.
//
// v2: hace un número acotado de llamadas (con timeout corto en cada una) en
// vez de probar decenas de combinaciones de URL/headers/payload en cadena.
// Ese enfoque anterior podía superar el límite de tiempo de ejecución de
// Vercel y devolver 502 sin ningún mensaje útil. Esta versión siempre
// responde rápido y, si no logra cotizar, incluye el detalle real de lo que
// contestó Zipnova para poder diagnosticar (campo "diagnostico").
async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms || 6000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido." });

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  } catch (e) {
    body = {};
  }

  const origin = body.origin || {};
  const destination = body.destination || {};
  const rawPackages = Array.isArray(body.packages) && body.packages.length > 0 ? body.packages : [];

  const originZip = String(origin.postal_code || origin.zipcode || body.origin_postal_code || body.originZip || "1230").trim().replace(/\D/g, "");
  const destZip = String(destination.postal_code || destination.zipcode || body.destination_postal_code || body.destZip || body.zip || "5000").trim().replace(/\D/g, "");
  const defW = 0.5;
  const defL = 20;
  const defWi = 15;
  const defH = 10;
  const declaredValue = Number(rawPackages[0]?.declared_value || body.declared_value || 10000);

  // Clean packages array ensuring weights are in grams (min 10)
  const packages = rawPackages.length > 0
    ? rawPackages.map((p, idx) => {
        const rawW = Number(p.weight || p.weightKg || defW);
        const weightGrams = rawW < 10 ? Math.round(rawW * 1000) : Math.round(rawW);
        return {
          weight: Math.max(10, weightGrams || 1000),
          length: Number(p.length || defL),
          width: Number(p.width || defWi),
          height: Number(p.height || defH),
          classification_id: 1,
          declared_value: Number(p.declared_value || declaredValue || 10000)
        };
      })
    : [{
        weight: Math.max(10, (Number(body.weight_kg || body.weight || defW) < 10 ? Math.round(Number(body.weight_kg || body.weight || defW) * 1000) : Math.round(Number(body.weight_kg || body.weight || defW)))),
        length: Number(body.length || defL),
        width: Number(body.width || defWi),
        height: Number(body.height || defH),
        classification_id: 1,
        declared_value: declaredValue
      }];

  const rawApiKey = process.env.ZIPNOVA_API_KEY || "";
  const rawApiSecret = process.env.ZIPNOVA_API_SECRET || "";
  const rawAccountId = process.env.ZIPNOVA_ACCOUNT_ID || "";

  const apiKey = String(rawApiKey).trim().replace(/^["']|["']$/g, '');
  const apiSecret = String(rawApiSecret).trim().replace(/^["']|["']$/g, '');
  const accountIdEnv = String(rawAccountId).trim().replace(/^["']|["']$/g, '');

  if (!apiKey || !apiSecret) {
    return res.status(200).json({
      success: false,
      notConfigured: true,
      rates: [],
      error: "Zipnova no está configurado en las variables de entorno de Vercel. Agrega ZIPNOVA_API_KEY y ZIPNOVA_API_SECRET en Vercel → Project Settings → Environment Variables, y hacé un Redeploy después de guardarlas."
    });
  }

  const BASE_URL = "https://api.zipnova.com.ar/v2";
  const authHeader = "Basic " + Buffer.from(apiKey + ":" + apiSecret).toString("base64");
  const headers = {
    "Content-Type": "application/json",
    Authorization: authHeader,
    Accept: "application/json"
  };

  // Registramos cada intento para poder devolver un diagnóstico útil si nada funciona.
  const attempts = [];

  try {
    // Si no tenemos account_id configurado, lo intentamos resolver UNA sola vez.
    let accountId = accountIdEnv && !isNaN(Number(accountIdEnv)) ? parseInt(accountIdEnv, 10) : null;
    if (!accountId) {
      try {
        const accRes = await fetchWithTimeout(`${BASE_URL}/accounts`, { headers }, 6000);
        const text = await accRes.text().catch(() => "");
        attempts.push({ step: "accounts", url: `${BASE_URL}/accounts`, status: accRes.status, body: text.slice(0, 2000) });
        if (accRes.ok) {
          try {
            const accData = JSON.parse(text);
            const list = Array.isArray(accData) ? accData : (accData.data || accData.accounts || (accData.id ? [accData] : []));
            const rawId = list[0]?.id ?? list[0]?.account_id ?? null;
            if (rawId !== null) accountId = parseInt(String(rawId), 10);
          } catch (e) {}
        }
      } catch (e) {
        attempts.push({ step: "accounts", url: `${BASE_URL}/accounts`, error: e.message });
      }
    }

    const payload = {
      ...(accountId ? { account_id: accountId } : {}),
      declared_value: declaredValue,
      origin: {
        zipcode: originZip,
        postal_code: originZip,
        city: origin.city || "CABA",
        state: origin.state || origin.province || "Buenos Aires",
        country: "AR"
      },
      destination: {
        zipcode: destZip,
        postal_code: destZip,
        city: destination.city || "Córdoba",
        state: destination.state || destination.province || "Córdoba",
        country: "AR"
      },
      packages: packages
    };

    // Único endpoint real de cotización en la API v2 de Zipnova.
    // ("/quotes" no existe: la API responde 404 "The route v2/quotes could not be found.")
    const endpointsToTry = ["/shipments/quote"];

    for (const epPath of endpointsToTry) {
      const url = BASE_URL + epPath;
      try {
        const quoteRes = await fetchWithTimeout(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        }, 8000);

        const rawText = await quoteRes.text().catch(() => "");
        attempts.push({ step: "quote", url, status: quoteRes.status, body: rawText.slice(0, 6000) });

        if (quoteRes.ok) {
          let data;
          try { data = JSON.parse(rawText); } catch (e) { data = null; }
          if (data) {
            // La API real de Zipnova devuelve un array plano en "all_results",
            // y opcionalmente el mismo contenido agrupado por servicio en "results" (objeto).
            // Cada tarifa trae: carrier {id,name}, service_type {code,name}, delivery_time {min,max,estimated_delivery}, amounts {price,price_incl_tax,...}
            let rawList = [];
            if (Array.isArray(data.all_results)) rawList = data.all_results;
            else if (data.results && typeof data.results === "object" && !Array.isArray(data.results)) {
              rawList = Object.values(data.results);
            } else if (Array.isArray(data)) rawList = data;
            else if (Array.isArray(data.rates)) rawList = data.rates;
            else if (Array.isArray(data.data)) rawList = data.data;
            else if (Array.isArray(data.options)) rawList = data.options;

            // Filtramos entradas no seleccionables (con impedimentos) o sin datos de monto.
            rawList = rawList.filter((r) => r && r.selectable !== false && (r.amounts || r.price !== undefined));

            if (rawList.length > 0) {
              const rates = rawList.map((r, idx) => {
                const carrierName = (r.carrier && r.carrier.name) || r.carrier_name || r.carrier || "Zipnova Envíos";
                const carrierId = (r.carrier && r.carrier.id) || r.carrier_id || "zipnova";
                const serviceCode = (r.service_type && r.service_type.code) || r.service_type || "standard";
                const serviceName = (r.service_type && r.service_type.name) || r.courier_name || carrierName;

                const dt = r.delivery_time || {};
                const daysMin = Number(dt.min ?? r.delivery_days_min ?? r.days_min ?? 2) || 2;
                const daysMax = Number(dt.max ?? r.delivery_days_max ?? r.days_max ?? (daysMin + 2)) || daysMin + 2;

                const amounts = r.amounts || {};
                let priceVal = amounts.price_incl_tax ?? amounts.price ?? r.price ?? r.total ?? r.cost ?? r.final_price ?? 0;
                priceVal = typeof priceVal === "string" ? parseFloat(priceVal.replace(",", ".")) || 0 : Number(priceVal) || 0;

                const isPickup = Boolean(
                  r.is_pickup_point || r.pickup_point || serviceCode === "pickup_point" || Array.isArray(r.pickup_points)
                );

                return {
                  id: (r.rate && r.rate.id) || r.id || `zn_rate_${idx}`,
                  carrier_id: carrierId,
                  carrier: carrierName,
                  courier_name: serviceName,
                  service_type: serviceCode,
                  price: Math.round(priceVal * 100) / 100,
                  currency: r.currency || "ARS",
                  delivery_days_min: daysMin,
                  delivery_days_max: daysMax,
                  delivery_estimate: dt.estimated_delivery
                    ? `Llega antes del ${new Date(dt.estimated_delivery).toLocaleDateString("es-AR")}`
                    : (daysMin === daysMax ? `${daysMin} día${daysMin > 1 ? "s" : ""} hábil${daysMin > 1 ? "es" : ""}` : `${daysMin} a ${daysMax} días hábiles`),
                  is_pickup_point: isPickup,
                  pickup_points: Array.isArray(r.pickup_points) ? r.pickup_points.map((p) => ({
                    id: p.point_id,
                    name: p.description,
                    address: p.location ? `${p.location.street || ""} ${p.location.street_number || ""}`.trim() : "",
                    city: p.location ? p.location.city : "",
                    zipcode: p.location ? p.location.zipcode : ""
                  })) : undefined
                };
              });
              return res.status(200).json({ success: true, rates, origin_postal_code: originZip, destination_postal_code: destZip, account_id: accountId });
            }
          }
        }
      } catch (e) {
        attempts.push({ step: "quote", url, error: e.message });
      }
    }

    // Nada funcionó: devolvemos éxito=false pero con el detalle real de cada intento
    // para poder ver en la pestaña Network qué contestó Zipnova exactamente.
    return res.status(200).json({
      success: false,
      rates: [],
      message: `No se pudo obtener cotización de Zipnova para el código postal ${destZip}.`,
      account_id_resuelto: accountId,
      diagnostico: attempts
    });

  } catch (err) {
    console.error("[Zipnova Serverless Error]:", err, attempts);
    return res.status(200).json({
      success: false,
      rates: [],
      error: err.message || "Error interno al consultar la API de Zipnova.",
      diagnostico: attempts
    });
  }
}
