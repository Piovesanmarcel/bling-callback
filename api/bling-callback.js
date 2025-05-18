export default async function handler(req, res) {
  try {
    const code = req.query.code;

    if (!code) {
      return res.status(400).json({ error: "Código de autorização não fornecido" });
    }

    // Gerar cabeçalho Authorization com client_id e client_secret
    const auth = Buffer.from(`${process.env.BLING_CLIENT_ID}:${process.env.BLING_CLIENT_SECRET}`).toString('base64');

    // Trocar code por access_token no Bling
    const response = await fetch("https://www.bling.com.br/Api/v3/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${auth}`
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.BLING_REDIRECT_URI
      })
    });

    const data = await response.json();

    if (!data.access_token) {
      return res.status(400).json({ error: "Token não recebido", detalhes: data });
    }

    // Enviar token para o Supabase (tabela: tokens)
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

    // Redirecionar para o painel com status de sucesso
    return res.redirect("/painel?conexao=sucesso");
  } catch (err) {
    console.error("Erro no callback do Bling:", err);
    return res.status(500).json({ error: "Erro interno", detalhes: err.message });
  }
}
