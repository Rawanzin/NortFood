# Dan Burguer — cadastro oficial e homologação

Estado remoto conferido em 23/10/2026 no Supabase principal `zwkhqahivthzivmuirjr`.
Loja única: `40bac4d9-2e3c-4f1d-b33b-ab9628176136`, nome **Dan Burguer**. Status `draft`, pausada, sem entrega ou retirada liberada e sem pagamentos presumidos. Piloto global desativado; limite de uma loja aprovada preservado.

Foram gravados 46 produtos: 20 lanches, 4 mini pizzas, 9 jarras de suco e 13 bebidas (6 alcoólicas separadas). Todos os nomes, preços e descrições foram comparados com o manifesto oficial, item por item, após leitura remota. Há 20 grupos e 220 opções de adicionais, 11 por lanche. Ingredientes removíveis estruturados preservam as quantidades do cardápio. Remoção não dá desconto; a taxa de substituição não é cobrada automaticamente.

O endereço, CEP e horários fornecidos estão gravados. Não foram inventados bairro, coordenadas ou fotos. O telefone `+55 38 9145-5998` foi conservado como informação pendente; não passou a ser WhatsApp. O campo WhatsApp permanece vazio. R$ 2,00 de entrega e R$ 3,00 de troca são referências editáveis, sem cobertura ou cobrança automática presumida.

Os 46 produtos estão indisponíveis até conferência de estoque pelo responsável. Além disso, 9 sucos possuem restrição de preço pendente, e 6 bebidas alcoólicas têm restrição de venda no servidor. Mesmo alterar disponibilidade não contorna essas restrições no checkout. O responsável pode editar/salvar o preço e confirmar cada jarra no painel. Não há liberação de álcool nesta implementação.

Contato informado: **Danburguer@gmail.com**. Foi preparado um convite interno privado para reivindicar o vínculo. Nenhuma associação foi concedida: ainda há zero contas Auth. O RPC compara exclusivamente o e-mail da identidade Auth efetivamente confirmado, nunca metadados editáveis ou texto informado no frontend. Uma conta de outro estabelecimento não consegue reivindicar ou editar a loja.

Administrador indicado: **kevenrawan@gmail.com**. Conta ainda inexistente no Auth; nenhum privilégio foi concedido. A designação nesta ficha não serve como prova de identidade. Após autenticação e confirmação reais, conferir UUID e autorização antes da concessão protegida de administrador. Não existe promoção automática por nome, e-mail ou parâmetros de URL.

Pendências comerciais: WhatsApp efetivo, telefone, confirmação do proprietário e estoque, bairro/cobertura e frete por zona, retirada, preparo, pagamentos, preço das jarras, regra de troca de ingrediente e imagens oficiais. A loja não aparece no catálogo público enquanto estiver em rascunho. A leitura do catálogo completo pelo proprietário foi validada em PostgreSQL isolado; acesso do proprietário ao ambiente remoto continua pendente de Auth.

Importação: manifesto `supabase/catalogs/dan-burguer.json`; gerador transacional `scripts/catalog-import.cjs`. O recibo privado garante que repetir a mesma fonte não sobrescreva edições posteriores. Não executar a importação como migração nem reaplicar versões registradas. Backup lógico dos dados conferidos em `test-results/auth-dan/remote-audit.json`; recuperação em `docs/RECUPERACAO_AUTH_DAN_20261023.md`. Esses arquivos locais não integram a publicação estática.
