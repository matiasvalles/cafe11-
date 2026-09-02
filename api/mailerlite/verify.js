// api/mailerlite/verify.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido." });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const { token } = body;
  const apiToken = (token || process.env.MAILERLITE_API_KEY || process.env.MAILERLITE_TOKEN || "").trim();

  if (!apiToken) {
    return res.status(400).json({ valid: false, error: "Token no proporcionado." });
  }

  try {
    const response = await fetch("https://connect.mailerlite.com/api/subscribers?limit=1", {
      headers: { "Accept": "application/json", "Authorization": `Bearer ${apiToken}` },
    });

    if (response.ok) {
      return res.status(200).json({ valid: true, message: "Token de MailerLite válido." });
    }

    const data = await response.json().catch(() => ({}));
    return res.status(400).json({ valid: false, error: data?.message || "Token de MailerLite inválido o expirado." });
  } catch (err) {
    return res.status(500).json({ valid: false, error: err.message || "Error al verificar el token." });
  }
}
