import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://bpqtzydsxmjazdzzcvno.supabase.co",
  "SUA_SERVICE_ROLE_KEY"
);

export default async function handler(req, res) {
  const { user } = await supabase.auth.getUser(req.headers.authorization?.replace("Bearer ", ""));

  if (!user) {
    return res.status(401).json({ error: "Usuário não autenticado" });
  }

  const usuario_id = user.id;

  const { data: usuario, error: userError } = await supabase
    .from("usuarios")
    .select("bling_access_token")
    .eq("id", usuario_id)
    .single();

  if (userError || !usuario?.bling_access_token) {
    return res.status(403).json({ error: "Token do Bling não encontrado para este usuário" });
  }

  const response = await fetch("https://www.bling.com.br/Api/v3/produtos", {
    headers: {
      Authorization: `Bearer ${usuario.bling_access_token}`,
      Accept: "application/json"
    }
  });

  const data = await response.json();

  if (!response.ok) {
    return res.status(500).json({ error: "Erro ao buscar produtos no Bling", details: data });
  }

  const produtos = data?.data ?? [];

  for (const produto of produtos) {
    await supabase.from("produtos").upsert({
      usuario_id,
      nome: produto.nome,
      sku: produto.codigo,
      descricao: produto.descricao,
      preco: parseFloat(produto.preco ?? 0),
      preco_promocional: parseFloat(produto.precoPromocional ?? 0),
      custo: parseFloat(produto.custo ?? 0),
      estoque: parseInt(produto.estoqueAtual ?? 0),
      unidade: produto.unidade,
      marca: produto.marca,
      gtin: produto.gtin,
      tipo: produto.tipo,
      ativo: produto.ativo ?? true,
      categoria: produto.categoria?.descricao,
      peso: parseFloat(produto.pesoBruto ?? 0),
      largura: parseFloat(produto.largura ?? 0),
      altura: parseFloat(produto.altura ?? 0),
      profundidade: parseFloat(produto.profundidade ?? 0),
      imagem_url: produto.imagem?.link,
      criado_em: produto.dataInclusao ? new Date(produto.dataInclusao).toISOString() : null,
      atualizado_em: produto.dataAlteracao ? new Date(produto.dataAlteracao).toISOString() : null,
      data_importacao: new Date().toISOString()
    }, { onConflict: ['usuario_id', 'sku'] });
  }

  return res.status(200).json({ message: "Produtos sincronizados com sucesso", total: produtos.length });
}

