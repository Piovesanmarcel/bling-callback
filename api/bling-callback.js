export default async function handler(req, res) {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).send("Faltando parâmetros.");
  }

  // Montar autenticação básica com client_id e secret
  const auth = Buffer.from(
    "e010efc402b05a2023303c5d55a527571d0b8da3" + ":" + "a92dcc7a3552afa00af24b911e78000722c4b60d0cc822dd418698959caf"
  ).toString("base64");

  // Requisição para trocar o code pelo token de acesso do Bling
  const response = await fetch("https://www.bling.com.br/Api/v3/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${auth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: "https://bling-callback.vercel.app/api/bling-callback",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return res.status(500).json({ error: "Erro ao trocar token", details: data });
  }

  console.log("TOKEN BLING:", data);

  return res.send("✅ Bling conectado com sucesso!");
}
