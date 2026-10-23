# NortFood

Aplicação existente em HTML/CSS/JavaScript, esbuild e Supabase. Site público: https://nortfood.netlify.app.

## Build

Node 24 e pnpm 11.25.0. Executar `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm check:architecture` e `pnpm build`. Publicar apenas `dist`. O build valida a chave pública, usa staging próprio e identifica o conteúdo da versão.

Variáveis de build: `NORTFOOD_SUPABASE_URL`, `NORTFOOD_SUPABASE_PUBLISHABLE_KEY`, `NORTFOOD_APP_URL=https://nortfood.netlify.app`, `NORTFOOD_PUBLIC_PREVIEW=yes`, `NORTFOOD_ENABLE_INDEXING=no`. Não fornecer service_role, PATs, senhas ou segredos de servidor ao frontend.

## Estado operacional

A publicação inicial é uma apresentação pública com cadastro e pedidos indisponíveis. O backend continua com piloto bloqueado. Para liberar operação, validar loja nominal autorizada, e-mail real, termos/contato do responsável, sessões independentes, RLS e checkout, recebimento do vendedor, confirmação e contingência. Alterar uma flag de interface não aprova o lançamento comercial.

## PWA

Android/Chrome: usar Instalar quando oferecido pelo navegador. iPhone/iPad: Safari → Compartilhar → Adicionar à Tela de Início. O SW protege respostas privadas, oferece uma página offline e pede confirmação para aplicar atualização. Fechar/cancelar o convite de instalação adia nova oferta por 30 dias. Instalação física em aparelhos exige ensaio específico.

## Publicação e reversão

Somente `release/nortfood` é branch de produção Netlify. Branches experimentais não devem ser configuradas como produção. Comando: `pnpm build`; diretório: `dist`. A configuração do ambiente fica na hospedagem; o repositório não contém credenciais.

Validar uma prévia e executar `pnpm test:public -- https://<deploy>--nortfood.netlify.app` antes da promoção. Após publicar: `pnpm test:public`. O gate atual exige apresentação pública e piloto bloqueado; adaptar somente depois da aprovação comercial.

Para rollback, republicar no painel Netlify um deploy previamente validado e reverter o commit correspondente em `release/nortfood`, preservando a correção nos próximos builds. Conferir HTTPS, `release.json`, configuração pública e bloqueio comercial. Não restaurar banco para reverter frontend. Migrações registradas não devem ser reaplicadas.

## Testes e limites

`pnpm test` e `pnpm test:demo` são verificações locais. Dados sintéticos e mocks nunca comprovam operação remota real. `pnpm test:load:isolated` testa somente GET / no servidor HTTP em loopback nos níveis 50, 100, 250, 500 e 1000; não contata hospedagem ou banco remoto. Não demonstra capacidade comercial para esses níveis. Nunca direcionar carga sintética para produção gratuita.

Netlify e Supabase usam planos Free. Limites são compartilhados pela conta/organização e devem ser consultados no painel antes de novas publicações ou campanhas. Não habilitar recarga, upgrade ou serviços pagos automaticamente.
