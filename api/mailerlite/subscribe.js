// api/mailerlite/subscribe.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido." });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const { email, groupId, fields } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Email válido requerido." });
  }

  const apiToken = (process.env.MAILERLITE_API_KEY || process.env.MAILERLITE_TOKEN || "").trim();
  if (!apiToken) {
    // No hay credencial configurada: se responde con éxito silencioso para no
    // romper la experiencia del visitante, pero no se suscribe a nadie.
    return res.status(200).json({ success: false, skipped: true, message: "MAILERLITE_API_KEY no configurado." });
  }

  try {
    const payload = { email: email.trim().toLowerCase(), status: "active", resubscribe: true };
    if (groupId && String(groupId).trim()) payload.groups = [String(groupId).trim()];
    if (fields && typeof fields === "object") payload.fields = fields;

    const response = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json", "Authorization": `Bearer ${apiToken}` },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.message || "Error al suscribir a MailerLite.", details: data });
    }
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error interno al suscribir." });
  }
}
