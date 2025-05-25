export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return Response.json({ error: "Código de autorização não fornecido" }, { status: 400 });
    }

    const raw = `${process.env.BLING_CLIENT_ID}:${process.env.BLING_CLIENT_SECRET}`;
    const auth = Buffer.from(raw).toString("base64");

    // Trocar code por access_token
    const tokenRes = await fetch("https://www.bling.com.br/Api/v3/oauth/token", {
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

    const data = await tokenRes.json();

    if (!data.access_token) {
      return Response.json({ error: "Token não recebido", detalhes: data }, { status: 400 });
    }

    // NOVO: Buscar e-mail do usuário logado
    const userInfoRes = await fetch("https://www.bling.com.br/Api/v3/usuarios/me", {
      headers: {
        Authorization: `Bearer ${data.access_token}`,
        Accept: "application/json"
      }
    });

    const userInfo = await userInfoRes.json();
    const email = userInfo?.data?.email ?? null;

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
        email: email
      })
    });

    if (!supabaseRes.ok) {
      const erro = await supabaseRes.text();
      return Response.json({ error: "Erro ao salvar token no Supabase", detalhes: erro }, { status: 500 });
    }

    return Response.redirect("https://bling-callback.vercel.app/painel?conexao=sucesso");
  } catch (err) {
    return Response.json({ error: "Erro interno", detalhes: err.message }, { status: 500 });
  }
}
