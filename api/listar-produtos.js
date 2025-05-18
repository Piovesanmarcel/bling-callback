export default async function handler(req, res) {
  try {
    const supabaseRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/produtos`, {
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json"
      }
    });

    if (!supabaseRes.ok) {
      const texto = await supabaseRes.text();
      return res.status(500).json({ error: "Erro ao buscar produtos", detalhes: texto });
    }

    const produtos = await supabaseRes.json();
    res.status(200).json(produtos);
  } catch (err) {
    console.error("Erro:", err);
    res.status(500).json({ error: "Erro ao buscar produtos", detalhes: err.message });
  }
}
