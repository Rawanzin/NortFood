# Migração NortFood → Hostinger — 20/10/2026

## Situação atual

**PARCIAL. Preparação local concluída; publicação e validação Hostinger PENDENTES.** O navegador integrado abriu `https://hpanel.hostinger.com/` e foi redirecionado ao login. Ainda não foi possível confirmar conta, plano contratado, servidor, diretório, domínio temporário, SSL ou acesso a arquivos. Não houve upload, compra, alteração de DNS, remoção da Netlify ou mudança no Supabase.

Prévia anterior preservada: `https://lucky-lamington-022ea1.netlify.app`, privada. Os testes HTTPS anteriores nela não comprovam funcionamento na Hostinger. Piloto de pedidos reais permanece desabilitado conforme a última verificação de homologação; esta tarefa não chama RPC de alteração do piloto.

## Auditoria e método compatível

- Aplicação existente HTML/CSS/JavaScript, sem framework de renderização nem servidor Node obrigatório em produção. `app.js` e estilos mantidos. SDK Supabase, QR e PDF são empacotados com esbuild; dependências e versões em `package.json` e `pnpm-lock.yaml`. Fontes, Leaflet, imagens otimizadas e temas são locais.
- Supabase continua responsável por Auth, Postgres/RLS, RPCs, Storage privado, upload por Edge Function e Realtime. Nenhuma migração SQL é necessária para mudar o host; 001–007 não foram tocadas ou reaplicadas nesta tarefa.
- Rotas reais usam `/#home`, `/#shop/UUID`, `/#settings` etc.; não exigem rewrite universal de SPA. Arquivos ausentes devem receber HTTP 404 com `404.html`. Redirecionar todo JS ausente para HTML mascararia falhas. Links de QR com origem antiga não migram automaticamente; preservar a Netlify e avaliar seus links impressos antes de qualquer desativação.
- Netlify aplica `_headers`, segurança da conta/projeto privado e deploy estático; `netlify.toml` prepara seu build. Esses arquivos não configuram a Hostinger. Nenhuma função Netlify é necessária ao aplicativo.
- Web/Cloud com gerenciador de arquivos: enviar somente arquivos estáticos ao document root de **um site novo de homologação**, depois de proteger todo o diretório. Confirmar compatibilidade Apache 2.4/LiteSpeed antes de usar `.htaccess`.
- VPS Nginx: regras distintas em vhost HTTPS existente, com certificado válido, root confirmado e proteção Basic no nível do servidor. Não instalar nem substituir `nginx.conf` às cegas. Website Builder não deve receber este pacote como se fosse Web Hosting; confirmar opção de hospedar arquivos no plano, sem contratar upgrade.
- Não foi encontrada uma imagem nova anexada nesta etapa. Foram reutilizados os pixels de `assets/logo-light.png`, símbolo N recortado proporcionalmente, sem fundo branco adicionado. Logos do cabeçalho e fotos não foram modificados.

## Arquivos e comandos preparados

- `scripts/build.cjs`: opção `--hostinger --homologation` gera `dist-hostinger/`, sem `_headers` da Netlify. `--hostinger` sozinho é recusado antes de escrever. Build principal e `dist-homologacao/config.js` preservados.
- `scripts/prepare-hostinger.cjs`: candidato offline, inventário SHA-256, validação de allowlist, destino Supabase exclusivo `zrczgghucwsaxqnyaapk`, recusa segredos no config e arquivos não previstos. Não possui código de upload, DNS, SQL ou API administrativa. Saída ignorada pelo Git.
- `scripts/hostinger-config.cjs`: gerador de regras específicas Apache/LiteSpeed ou Nginx, somente com perfil explícito, origem HTTPS e caminho do arquivo de senhas fora do webroot. Regras preparadas ficam **fora** de `dist-hostinger`, em `test-results/hostinger/`, para revisão/mesclagem. Não há senha embutida, proteção cliente ou suposição de que noindex torna o site privado.
- Cabeçalhos: CSP existente, anti-frame, nosniff, política de permissões, referrer e noindex. Apache/LiteSpeed inclui cache privado revalidável para scripts sem hash, `no-store` para HTML/config e 1 dia para imagens/fontes; compressão quando mod_deflate estiver disponível. Nginx usa cache privado revalidável comum e mantém autenticação em todos os assets. TLS/HTTP→HTTPS e certificados precisam ser confirmados no host; não se habilitou HSTS sem verificar domínio/certificado.
- `scripts/generate-favicons.cjs`: PNGs 16/32, Apple 180, ícones 192/512 e ICO 16/32/48, centralizados, proporcionais e transparentes. Referências atualizadas em `index.html`; manifesto existente já referencia 192/512. Cópias antigas em `assets/` mantidas para compatibilidade. `scripts/generate-site-images.cjs` delega a esse mesmo gerador para evitar versões divergentes.
- `tests/hostinger.test.cjs`: segurança dos parâmetros/regras, isolamento do build e verificação dos ícones em navegador local. Novos scripts npm/pnpm: `prepare:hostinger`, `test:hostinger`, `generate:favicons`.

Preparação offline, sem publicar nem conectar no banco:

```powershell
pnpm prepare:hostinger
```

**Não enviar `dist-hostinger/` ainda.** Sem origem/servidor confirmados, ele é candidato offline, sem barreira de acesso instalada. Não foi criado ZIP anunciando pacote pronto para publicação. Inventário: `test-results/hostinger/package-manifest.json`.

Depois de identificar pelo painel o servidor, a origem e o caminho privado real, executar o mesmo preparador com `--server`, `--origin` e `--auth-file`. Não usar valores inventados. As regras geradas são preparação, não prova de configuração aplicada. Mesclar proteção criada pelo hPanel; nunca substituir arquivos de outro site.

## Configuração pública e segredos

Fonte de homologação: `.env.homologacao`, nunca `.env` principal. Apenas Project URL e publishable/anon entram em `config.js`. Valores não devem ser copiados para relatórios.

- `NORTFOOD_TEST_SUPABASE_URL` e `NORTFOOD_TEST_SUPABASE_PUBLISHABLE_KEY`: conexão pública do ambiente isolado.
- `NORTFOOD_TEST_CONFIRM_DISPOSABLE`: confirmação existente do destino de testes.
- `NORTFOOD_HOMOLOGATION_PREVIEW_URL`: origem HTTPS efetiva do novo host, sem caminho/fragmento. Ausente no candidato offline; não deixar a URL Netlify como retorno do novo host.
- Produção futura utiliza `NORTFOOD_SUPABASE_URL`, `NORTFOOD_SUPABASE_PUBLISHABLE_KEY`, `NORTFOOD_APP_URL` no build já existente. **Não gerar nem publicar produção nesta etapa.**
- Indexação desabilitada e GA4 não configurado no candidato de homologação. Nunca enviar `.env*`, backups, fontes, scripts, testes, relatórios, diretório Supabase, `node_modules`, senhas Basic ou chaves de servidor.
- No servidor Supabase, após confirmar a origem protegida: adicionar **somente a origem exata** aos retornos Auth de homologação e ao `APP_ORIGIN` do upload. Preservar temporariamente a origem Netlify para rollback. Nada disso foi alterado sem um destino confirmado. Verificar redirects e CORS de verdade, não liberar `*`.
- Credenciais Basic do host e sessões Supabase não migram entre origens. Usuários precisarão entrar novamente; carrinhos/preferências em localStorage são próprios de cada origem. Não copiar tokens para tentar migrar sessões. Dados persistentes no Supabase permanecem intactos.

## Sequência segura de publicação pendente

1. Entrar no hPanel da conta existente pelo navegador integrado; identificar plano e site novo sem compra/upgrade. Não alterar DNS de produção.
2. Confirmar origem HTTPS temporária/subdomínio autorizado e certificado válido. Sem destino protegido gratuito no plano existente, interromper publicação e explicar a limitação.
3. Criar proteção de todo o document root **antes** do upload. Guardar arquivo de senhas fora do root, sem credenciais em Git/chat. Provar acesso anônimo negado em `/`, `/index.html`, `/config.js`, `/app.js`, `/assets/…`, `/404.html` e ícones; conferir que domínio alternativo/IP/temporário também não expõe arquivos. Noindex sozinho não serve.
4. Gerar candidato com origem real; revisar/mesclar configuração específica do servidor sem apagar arquivos preexistentes. Manter o ambiente privado mesmo durante upload; não substituir regras da proteção por um ZIP genérico.
5. Ajustar Auth/CORS somente na homologação, sem remover retorno antigo antes dos testes. Não alterar RLS, Storage público, privilégios ou SQL para resolver problemas de hospedagem.
6. Publicar somente artefatos, testar anonimamente a proteção novamente. Autenticado no perímetro: checar HTTP→HTTPS, TLS, cabeçalhos, cache, 404, recursos, recarga de rotas, formulários, dois temas, mobile/desktop, favicon, console e desempenho.
7. Executar testes reais com contas sintéticas no Supabase isolado: cadastro/e-mail/login/logout/recuperação, produtos/upload privado, carrinho/pedido, atualização/chat/Realtime entre contas, localização e relatórios. Manter limitações SMTP e permissão administrativa documentadas; não confundir contratos/mocks com prova remota. Não cadastrar pedidos reais nem reativar piloto.
8. Só considerar corte definitivo após evidências remotas e autorização específica de DNS/lançamento. Reversão: manter Netlify, origem anterior Auth/upload e nenhum dado de banco movido/apagado.

## Fontes oficiais consultadas

- [Gerenciador de arquivos](https://www.hostinger.com/support/4548688-basic-actions-in-the-file-manager-in-hostinger/)
- [Proteção de diretórios por senha](https://www.hostinger.com/support/1583470-how-to-password-protect-a-website-in-hostinger/)
- [Criação de .htaccess](https://www.hostinger.com/support/1583307-how-to-create-an-htaccess-file-at-hostinger/)

Essas instruções confirmam mecanismos disponíveis em determinados planos; não confirmam o plano desta conta.

## Evidências e resultado

Resultados de testes desta etapa serão registrados abaixo. Testes locais não aprovam Hostinger remota.

- `pnpm test`: **94/94 aprovados**, 0 falhas, 50,89 s. Inclui contratos de publicação, Auth, carrinho/checkout, segurança/RLS em PostgreSQL embarcado, QR/mesas, localização, comissão e regressões mobile/desktop nos dois temas. Não executa o runner de homologação remota. Log: `test-results/hostinger/full-suite.txt`.
- `pnpm test:demo`: **107 verificações aprovadas**, nenhum erro JavaScript. Dados de demonstração/navegador local, sem comprovação de jornadas na Hostinger. Log: `test-results/hostinger/demo-suite.txt`.
- `node --test tests/hostinger.test.cjs`: **3/3 aprovados** inicialmente; repetido após reforçar a inspeção do pacote. Valida guardas e formato das regras, não um parser Apache/Nginx real.
- Sintaxe Node conferida para os scripts novos e gerador de imagens ajustado. Não há script `lint` neste projeto. Apache/Nginx/PHP não estão disponíveis no PATH deste ambiente; interpretação real da configuração é PENDENTE até conhecer o servidor e ter acesso.
- Nenhum teste remoto novo de pedidos/autenticação/upload foi anunciado como aprovado. Não foram obtidas credenciais privadas nem alteradas sessões de usuários para esta preparação.

| Verificação | Classificação | Evidência |
|---|---|---|
| Login hPanel / identificação do plano | PENDENTE | Tela de login, sem sessão autenticada disponível no início |
| Configuração e publicação Hostinger | PENDENTE | Nenhum upload realizado; sem origem confirmada |
| TLS, proteção privada e headers Hostinger | PENDENTE | Sem endereço remoto disponível |
| Jornadas Supabase a partir da Hostinger | PENDENTE | Não foram repetidas contra outra origem |
| Preservação de produção e Netlify | APROVADO LOCAL | Teste compara hashes de `.env`, `dist/config.js`, `dist-homologacao/config.js`, `netlify.toml`, `_headers` |
| Favicons e transparência | APROVADO LOCAL | `test-results/hostinger/icons-result.json`, `favicons-preview.png` |

**Intervenção indispensável atual:** entrar na aba Hostinger aberta no navegador integrado e concluir eventual 2FA. Não enviar senhas/chaves pelo chat. Não é necessário fazer upload ou procurar configurações manualmente: isso pode continuar após o login. Nenhum dado existente foi excluído, nenhuma configuração de banco alterada, nenhuma hospedagem anterior removida.
