import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = "https://bpqtzydsxmjazdzzcvno.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwcXR6eWRzeG1qYXpkenpjdm5vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzU0Mzk0NywiZXhwIjoyMDYzMTE5OTQ3fQ.8asuju_WmCmwyOefHdIRQ1Q8vAtoCJTPtV0CACzKIRE";

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).send("Faltando parâmetros.");
  }

  const auth = Buffer.from(
    "e010efc402b05a2023303c5d55a527571d0b8da3" + ":" + "a92dcc7a3552afa00af24b911e78000722c4b60d0cc822dd418698959caf"
  ).toString("base64");

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

  const { error } = await supabase
    .from("usuarios")
    .update({
      bling_access_token: access_token,
      bling_refresh_token: refresh_token,
      bling_token_expires: expires_at,
    })
    .eq("id", state); // state deve ser o ID do usuário

  if (error) {
    return res.status(500).json({ error: "Erro ao salvar no Supabase", details: error });
  }

  return res.send("✅ Bling conectado e salvo com sucesso no Supabase!");
}
