export default async function handler(req, res) {
  try {
    const code = req.query.code;

    if (!code) {
      return res.status(400).json({ error: "Código de autorização não fornecido" });
    }

    // Trocar o code por access_token
    const response = await fetch("https://www.bling.com.br/Api/v3/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.BLING_REDIRECT_URI,
        client_id: process.env.BLING_CLIENT_ID,
        client_secret: process.env.BLING_CLIENT_SECRET
      })
    });

    const data = await response.json();

    if (!data.access_token) {
      return res.status(400).json({ error: "Token não recebido", detalhes: data });
    }

    // Salvar token no Supabase
    const supabaseRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/tokens`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        email: data.usuario?.email ?? null
      })
    });

    if (!supabaseRes.ok) {
      const erro = await supabaseRes.text();
      return res.status(500).json({ error: "Erro ao salvar token no Supabase", detalhes: erro });
    }

    // Redirecionar para painel com sucesso
    return res.redirect("/painel?conexao=sucesso");
  } catch (err) {
    console.error("Erro:", err);
    return res.status(500).json({ error: "Erro interno", detalhes: err.message });
  }
}
