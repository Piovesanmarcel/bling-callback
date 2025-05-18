import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://bpqtzydsxmjazdzzcvno.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
);

export default async function handler(req, res) {
  const { user } = await supabase.auth.getUser(req.headers.authorization?.replace("Bearer ", ""));

  if (!user) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  const usuario_id = user.id;

  // Busca o token do Bling no Supabase
  const { data: usuario, error: userError } = await supabase
    .from("usuarios")
    .select("bling_access_token")
    .eq("id", usuario_id)
    .single();

  if (userError || !usuario?.bling_access_token) {
    return res.status(403).json({ error: "Token do Bling não encontrado para este usuário" });
  }

  // Chamada para API do Bling
  const response = await fetch("https://www.bling.com.br/Api/v3/produtos", {
    headers: {
      Authorization: `Bearer ${usuario.bling_access_token}`,
      Accept: "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    return res.status(500).json({ error: "Erro ao buscar produtos no Bling", details: data });
  }

  const produtos = data?.data ?? [];

  for (const produto of produtos) {
    const nome = produto.nome;
    const sku = produto.codigo;
    const preco = parseFloat(produto.preco ?? 0);
    const estoque = parseInt(produto.estoqueAtual ?? 0);

    await supabase.from("produtos").upsert({
      usuario_id,
      nome,
      sku,
      preco,
      estoque,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: ['usuario_id', 'sku'] });
  }

  return res.status(200).json({ message: "Produtos sincronizados com sucesso", total: produtos.length });
}
