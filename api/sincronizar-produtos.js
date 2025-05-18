export default async function handler(req, res) {
  try {
    // Buscar token mais recente no Supabase
    const tokenRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/tokens?order=created_at.desc&limit=1`, {
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json"
      }
    });

    const tokens = await tokenRes.json();
    const access_token = tokens?.[0]?.access_token;

    if (!access_token) {
      return res.status(401).json({ error: "Token do Bling não encontrado" });
    }

    // Buscar produtos no Bling
    const blingRes = await fetch("https://www.bling.com.br/Api/v3/produtos", {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/json"
      }
    });

    const data = await blingRes.json();

    if (!data?.data || !Array.isArray(data.data)) {
      return res.status(500).json({ error: "Erro ao buscar produtos do Bling", detalhes: data });
    }

    // Mapear e preparar produtos com validação de segurança
    const produtos = data.data
      .filter(item => item?.produto)
      .map((item) => {
        const p = item.produto;
        return {
          codigo: p.codigo,
          descricao: p.descricao,
          tipo: p.tipo,
          situacao: p.situacao,
          unidade: p.unidade,
          preco: parseFloat(p.preco || 0),
          estoque: parseFloat(p.estoqueAtual || 0)
        };
      });

    // Enviar produtos para Supabase
    const insertRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/produtos`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify(produtos)
    });

    if (!insertRes.ok) {
      const erro = await insertRes.text();
      return res.status(500).json({ error: "Erro ao salvar produtos no Supabase", detalhes: erro });
    }

    res.status(200).json({ message: "Produtos sincronizados com sucesso" });
  } catch (err) {
    console.error("Erro interno:", err);
    res.status(500).json({ error: "Erro interno", detalhes: err.message });
  }
}
