## Estado atual — 12/10/2026

**NO-GO para lançamento.** Consulte [IMPLEMENTACAO_STATUS.md](IMPLEMENTACAO_STATUS.md), [RELATORIO_COMERCIAL.md](RELATORIO_COMERCIAL.md), [configuração e publicação](docs/CONFIGURACAO_E_PUBLICACAO.md) e [piloto](docs/PILOTO.md). Nenhum projeto Supabase/hospedagem foi criado. As seções de 11/10 abaixo descrevem o protótipo local preservado; não são aprovação comercial.

Comandos atuais: pnpm install --frozen-lockfile; pnpm build; pnpm start; pnpm test; pnpm test:demo. A configuração pública é lida de .env e filtrada por scripts/public-config.cjs; somente carrinho temporário usa armazenamento local no modo comercial. Auth é do provedor. O banco usa UUIDs, centavos, RLS e RPCs. Novos pedidos também exigem habilitação administrativa do piloto no servidor.

# NortFood

Marketplace em evolução comercial, preservando HTML, CSS e JavaScript. O modo padrão utiliza Supabase e bloqueia operações enquanto não estiver configurado. O protótipo anterior continua disponível apenas em localhost com ?demo=1. Sirva esta pasta em localhost ou HTTPS para disponibilizar Web Crypto e os fluxos de conta. A página também pode ser aberta por `index.html` quando o navegador oferecer um contexto seguro para arquivos locais.

## Funcionalidades do protótipo preservado (?demo=1)

- Busca, categorias múltiplas por estabelecimento, favoritos, lojas e cardápios agrupados por categoria de produto.
- Cadastro local de cliente ou estabelecimento e edição das informações do perfil comercial.
- Cardápio com inclusão, edição, exclusão, reordenação, imagem e disponibilidade de produtos.
- Controle persistente para ligar ou fechar a loja, respeitando o horário quando não houver uma alteração manual.
- Carrinho por estabelecimento, checkout demonstrativo, histórico e fluxo de pedidos até a conclusão, com recusa e cancelamento.
- Conversas locais entre cliente e estabelecimento, com horário, indicação de mensagens não lidas e histórico separado por conta e loja.
- Escolha de endereço de entrega em mapa interativo Leaflet/OpenStreetMap, com GPS opcional, pino central, geocodificação reversa opcional e coordenadas anexadas ao pedido.
- Notificações locais com leitura individual ou em lote e separação por cliente/estabelecimento.
- Relatórios de pedidos e vendas para hoje, 7 dias ou 30 dias, calculados a partir dos pedidos armazenados.
- Cálculo demonstrativo da comissão NortFood de 5% e repasse estimado de 95% sobre os itens.
- A entrega é responsabilidade do estabelecimento.

Conta de demonstração: `cliente@demo.com` / `1234`. Também é possível criar contas locais de cliente e estabelecimento. Os dados ficam no armazenamento local do navegador.

## Limitações do modo demonstrativo

Este protótipo não é um serviço de produção: contas, pedidos, conversas, notificações e imagens ficam no navegador; senhas são derivadas localmente com PBKDF2-SHA-256 e sal aleatório, mas não têm proteção/autorização de servidor; e não há sincronização entre dispositivos ou notificações em tempo real. O geocodificador público do OpenStreetMap é usado somente quando o usuário solicita identificação do endereço; sua disponibilidade e cobertura não são garantidas. Não use credenciais reais. Para operar com clientes reais, conecte uma API e banco de dados, autenticação segura, autorização por estabelecimento, armazenamento de imagens e um provedor de pagamentos. A comissão é apenas calculada na interface e não é cobrada. Entregas ficam sob responsabilidade das lojas.


## Evolução de 11/10/2026

Consulte [AUDITORIA.md](AUDITORIA.md) para a comparação completa com a referência e [RELATORIO.md](RELATORIO.md) para os resultados.

- Busca separada por lojas/produtos, categoria, ordenação, lojas abertas, buscas recentes e lojas visitadas por conta.
- Favoritos de lojas e produtos por conta; favoritos antigos sem proprietário foram preservados no perfil visitante.
- Detalhes de todos os produtos, adicionais, quantidade, observação e total; confirmação antes de substituir o carrinho de outra loja.
- Perfil público com Cardápio, Sobre, Imagens e Avaliações locais; compartilhamento por link.
- Endereços salvos e edição manual independentes do mapa, além do fluxo Leaflet existente.
- Retirada opcional: a loja precisa habilitá-la em Perfil da loja e cadastrar o endereço. A taxa de entrega é zero na retirada.
- Revisão completa, pedido demonstrativo, acompanhamento por estados/horários locais, filtros e impressão de comprovante sem valor fiscal.
- Avaliação local vinculada a pedido concluído e central de ajuda com pesquisa.
- Carrinho por conta, sessão contendo só identificador, senhas legadas convertidas sem mudar credenciais, modais com Escape e foco contido.

O catálogo inicial, notas e promoções são demonstrativos. Promoções textuais não aplicam descontos automaticamente. Recibos não comprovam pagamento. Não há frota própria, reservas de mesa, carteira, cobrança de comissão ou entrega rastreada por GPS. As escolhas de pagamento se referem às formas aceitas pela loja; o protótipo não coleta dados de cartão.

### Testes de regressão

Não há dependências novas na aplicação. O teste opcional em tests/flows.cjs utiliza Playwright disponível no ambiente de desenvolvimento e abre um navegador isolado com dados descartáveis. Ele cria seu próprio servidor estático e não utiliza o perfil pessoal do navegador.

Execute node --check app.js e, em um ambiente com Playwright acessível pelo NODE_PATH ou instalado, node tests/flows.cjs. O navegador padrão é Chrome; NORTFOOD_BROWSER permite informar o caminho de outro executável Chromium. VALIDACAO.json registra a verificação interativa realizada nesta tarefa.

### Infraestrutura futura

Para uso real: API e banco, identidade e autorização por usuário/loja no servidor, sincronização de pedidos/mensagens, armazenamento de mídia, pagamentos e conciliação, recuperação de senha/OTP/login social, push e revisão jurídica de privacidade/termos. Cupons exigem regras de desconto, validade e elegibilidade. Chamadas, anexos e localização ao vivo dependeriam de integrações específicas. O hash local não transforma este protótipo em um sistema seguro de produção.
