# Auditoria e plano de evolução — 11/10/2026

## Arquitetura e preservação
HTML/CSS/JavaScript, sem build. index.html carrega styles.css, refinements.css, app.js e Leaflet por CDN. app.js contém dados, renderizadores e eventos delegados em uma IIFE. Navegação por estado view; persistência nortfood-v1 em localStorage e sessão opcional em sessionStorage. Não existe API, banco, pagamento ou envio externo. Git disponível; app.js/index.html modificados e refinements.css não rastreado antes desta tarefa. Cópia dos cinco arquivos atuais preservada em C:/Users/keven/AppData/Local/Temp/nortfood-before-expansion. Não executar reset nem substituir pelo HEAD.

## Comparação com a referência
Imagem baixada pelo link fornecido, 1439×26616, lida em seis recortes. Nenhum painel de vendedor aparece nela; o painel atual deve ser mantido.

| Telas/fluxos da referência | Situação inicial | Decisão |
| --- | --- | --- |
| Splash, boas-vindas, onboarding | Inexistente | Ajuda de primeiros passos opcional, sem bloquear a home |
| Login, cadastro, completar perfil | Implementados localmente | Preservar e proteger novas senhas com derivação local |
| OTP, recuperação, login social | Inexistente/indisponível | Dependem de provedor de identidade; não simular |
| Localização/GPS e entrada de endereço | Parcial: mapa sem alternativa manual | Completar com endereços salvos e formulário independente do mapa |
| Permissão de notificações | Preferência local implementada | Manter notificações locais; push depende de backend |
| Home, categorias, lojas populares | Implementadas | Reutilizar carrossel horizontal e grids atuais |
| Pratos populares, busca de pratos/lojas, filtros | Parcial: busca retorna só lojas | Resultados separados e filtros persistentes na sessão |
| Favoritos de lojas/pratos | Parcial: coração global, sem tela | Tela e separação por conta; favoritos de pratos |
| Produto, adicionais, quantidade, observações | Parcial: só modal em itens com adicionais | Detalhes em todos os produtos e total calculado |
| Loja: menu, sobre, galeria, avaliações | Menu implementado; demais parciais/ausentes | Abas usando dados cadastrados e avaliações locais |
| Escrever avaliação de loja/produto | Inexistente | Avaliação local vinculada a pedido concluído; sem fabricar reputação real |
| Carrinho e remoção | Implementados | Confirmação antes da troca de loja e revisão final |
| Entrega/retirada, endereço salvo | Só entrega/mapa | Retirada opcional configurada pela loja, endereço manual/salvo |
| Horário de retirada e entrega expressa/econômica | Inexistente | Sem regras/infra; manter estimativa configurada pela loja |
| Pagamento, cartão, carteira, recarga, sucesso | Só pagamento na entrega | Preservar; não coletar cartão nem simular aprovação |
| Resumo, confirmação, recibo | Parcial | Resumo completo e recibo demonstrativo, sem caráter fiscal |
| Pedidos ativos/concluídos/cancelados e acompanhamento | Parcial: lista sem detalhe/filtros | Detalhe, filtros e linha de estados registrados |
| Mapa ao vivo, entregador, avaliação de entregador | Inadequados | Sem frota NortFood; entrega da loja, sem GPS fictício |
| Reservar mesa, andares, QR, reservas/cancelamento | Inadequados | Fora do marketplace de delivery |
| Cupons/ofertas | Banners/promo textuais, sem cálculo de desconto | Exibir ofertas demonstrativas existentes; cupons exigem regras comerciais |
| Conversas, chat individual | Implementados localmente | Preservar; anexos, áudio/vídeo/chamadas dependem de serviços |
| Perfil, edição, senha, configurações, privacidade | Implementados parcialmente | Reutilizar, completar atalhos, deixar limites explícitos |
| Central de ajuda/FAQ | Inexistente | Implementar com busca e instruções reais do protótipo |
| Convites | Inexistente | Compartilhamento de loja pelo navegador; sem envio automático |
| Excluir conta, temas | Inexistentes | Não excluir dados nesta tarefa; tema vermelho/branco preservado |

## Plano e arquivos
1. Reutilizar card, header, footer, produto, history, seller e persistência.
2. Acrescentar renderizadores e ações no app.js; estilos responsivos isolados no fim de refinements.css.
3. Integrar detalhe de pedido/produto, busca, favoritos, endereços, retirada, avaliações, ofertas e ajuda. Histórico do navegador deve recuperar a tela.
4. Corrigir texto de pedido enviado, isolamento de favoritos/sessão, índices de produtos ao reordenar, abertura manual e validação final do carrinho.
5. Verificar sintaxe e executar fluxos no navegador em desktop e mobile; documentar resultado e limitações no README e relatório.

## Limites
Autorização frontend é apenas organização do protótipo. Dados do mesmo navegador podem ser lidos por quem tem acesso ao dispositivo. Hash local não substitui autenticação/autorização no servidor. Pedidos, avaliações, conversas e recibos permanecem locais. Nenhuma migração de banco ou serviço externo é criada.
