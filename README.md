# NortFood

Marketplace demonstrativo responsivo em HTML, CSS e JavaScript sem dependências de build. Abra `index.html` ou sirva esta pasta em um servidor estático.

## Funcionalidades

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

## Para produção

Este protótipo não é um serviço de produção: contas, pedidos, conversas, notificações e imagens ficam no navegador; senhas não têm proteção de servidor; e não há sincronização entre dispositivos ou notificações em tempo real. O geocodificador público do OpenStreetMap é usado somente quando o usuário solicita identificação do endereço; sua disponibilidade e cobertura não são garantidas. Não use credenciais reais. Para operar com clientes reais, conecte uma API e banco de dados, autenticação segura, autorização por estabelecimento, armazenamento de imagens e um provedor de pagamentos. A comissão é apenas calculada na interface e não é cobrada. Entregas ficam sob responsabilidade das lojas.
