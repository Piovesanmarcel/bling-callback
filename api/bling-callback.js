import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://bpqtzydsxmjazdzzcvno.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwcXR6eWRzeG1qYXpkenpjdm5vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzU0Mzk0NywiZXhwIjoyMDYzMTE5OTQ3fQ.8asuju_WmCmwyOefHdIRQ1Q8vAtoCJTPtV0CACzKIRE"
);

export default async function handler(req, res) {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).send("Faltando parâmetros.");
  }

  const auth = Buffer.from(
    "e010efc402b05a2023303c5d55a527571d0b8da3:a92dcc7a3552afa00af24b911e78000722c4b60d0cc822dd418698959caf"
  ).toString("base64");

  try {
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

    const { access_token, refresh_token, expires_in } = data;
    const expires_at = new Date(Date.now() + expires_in * 1000).toISOString();

    // Buscar e-mail da conta Bling
    let bling_email = null;
    try {
      const infoResponse = await fetch("https://www.bling.com.br/Api/v3/usuarios/me", {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      if (infoResponse.ok) {
        const infoData = await infoResponse.json();
        bling_email = infoData?.data?.email ?? null;
      }
    } catch (fetchError) {
      console.error("Erro ao buscar e-mail do Bling:", fetchError);
    }

    // Salvar no Supabase
    const { error: saveError } = await supabase
      .from("usuarios")
      .update({
        bling_access_token: access_token,
        bling_refresh_token: refresh_token,
        bling_token_expires: expires_at,
        bling_email: bling_email,
      })
      .eq("id", state);

    if (saveError) {
      return res.status(500).json({ error: "Erro ao salvar no Supabase", details: saveError });
    }

    return res.send("✅ Bling conectado e salvo com sucesso no Supabase!");
  } catch (err) {
    console.error("Erro inesperado:", err);
    return res.status(500).send("Erro inesperado no servidor.");
  }
}
