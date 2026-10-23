# QR Codes e atendimento por mesa — 17/10/2026

## Auditoria e plano
O repositório continua NortFood, em HTML/CSS/JavaScript com SDK Supabase, esbuild, Leaflet, RLS/RPCs, pedidos UUID em centavos e atualização por Postgres Changes/polling. Não existe módulo de QR nem mesas. Cardápio, produtos, adicionais, carrinho, Auth, pedidos/itens/eventos, notificações, comissões e relatórios serão reutilizados.

Implementar uma migração 006 aditiva sobre 001–005; QR geral derivado do UUID permanente da loja, sem armazenar imagens; mesas opcionais com token público permanente, RLS e operação por membros; modalidade dine_in nos mesmos pedidos e estados próprios de preparo/serviço; geração PNG/PDF/compartilhamento/impressão no navegador; busca/filtro dentro do cardápio atual.

Consulta do cardápio permanece pública. Para criar pedidos presenciais será usado o login existente, sem criar autenticação paralela ou pedidos anônimos sem proteção. O token impresso identifica a mesa, mas não comprova presença física. A loja controla se recebe pedidos e abre/fecha o recebimento de cada mesa; aprovação/abertura da loja e piloto continuam obrigatórios. Não haverá execução remota ou afirmação de produção sem testes dos serviços reais.

Implementação e validação em andamento; resultado final será atualizado nesta etapa.
