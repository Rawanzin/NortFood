# Login com Google — 04/11/2026

## Diagnóstico confirmado

O site publicado `https://nortfood.pages.dev` aponta para o projeto Supabase `zwkhqahivthzivmuirjr`, com retorno para a própria origem HTTPS. A consulta pública de Auth retornou HTTP 200, `external.google=false` e `external.email=true`. A tentativa GET de autorização Google retornou **HTTP 400**, `validation_failed`, `Unsupported provider: provider is not enabled`.

Evidência sanitizada: `test-results/google-auth-20261104/remote-provider.json`. São consultas reais, somente leitura, sem criação de contas, dados ou mudanças de configuração. Não há evidência de OAuth Google configurado corretamente neste projeto.

Além dessa dependência externa, havia um defeito confirmado na interface: depois de verificar a disponibilidade, `commercialDecorate()` sempre aplicava `google.disabled=false`, mesmo com `aria-disabled=true`. O navegador continuava permitindo o clique, e o listener de cadastro mostrava o aviso de aceite em vez de respeitar a indisponibilidade. `aria-disabled` sozinho não impede ações.

## Correções locais

- `app.js`: botão Google permanece nativamente desabilitado se o provedor estiver ausente, indisponível ou ainda não verificado. O listener em captura ignora inclusive disparo programático no botão desabilitado, sem trocar etapa, validar campos ou mostrar erro de aceite indevido.
- `src/commercial.js`: defesa adicional no controlador, verificação do provedor antes do aceite, bloqueio durante a consulta e início de OAuth; não reabilita um botão marcado como indisponível. Cadastro por e-mail, termos, sessão e intenção de cliente/vendedor preservados.
- `tests/auth-ui.test.cjs`: regressões no celular para provedor desativado, falha de verificação, clique programático e provedor disponível com aceite ausente. No último caso, somente o consentimento é destacado; nome, telefone, e-mail e senha não são indevidamente invalidados pelo clique no Google.
- `assets/nortfood-backend.js`: bundle gerado pelo build, sem credenciais OAuth privadas.

Ponto de recuperação das fontes afetadas anterior às alterações: `backups/google-auth-20261104-1793801380582/manifest.json`, com SHA256. Nenhum reset, restauração geral, migração SQL ou alteração de banco foi realizada. As demais mudanças já existentes na árvore Git foram preservadas.

## O que falta para o login Google real

A ferramenta de navegador informou: **Local browser use is disabled in Work settings**. Não foi possível acessar os painéis autenticados nem contornar essa restrição por outro navegador. Foi solicitado habilitar o acesso e manter as sessões Google Cloud/Supabase autenticadas; não foi solicitada senha ou chave pelo chat.

Quando o acesso estiver disponível, verificar/reutilizar o cliente OAuth existente; se não houver, preparar cliente Web no Google Cloud, tela de consentimento e escopos mínimos `openid`, `email`, `profile`, sem faturamento ou serviços Maps. O callback autorizado do cliente Web deve ser:

`https://zwkhqahivthzivmuirjr.supabase.co/auth/v1/callback`

Client ID e Client Secret devem ser cadastrados **somente no provedor Google do Supabase**, com habilitação do provedor. O segredo nunca vai para config.js, variáveis públicas, código-fonte ou logs. O retorno da aplicação permanece `https://nortfood.pages.dev`; conferir Site URL e allowlist no painel. Não trocar as URLs do projeto por localhost nem liberar retornos indiscriminados. Criação de credenciais/expansão de acesso e eventuais termos exigirão a confirmação específica aplicável na interface.

Depois: testar consentimento Google real, retorno à identidade correta no NortFood, persistência após recarregar, logout e cancelamento/erro do consentimento. Nenhuma conta pessoal foi usada para produzir uma aprovação fictícia.

Documentação oficial: [Google OAuth com Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [retornos permitidos](https://supabase.com/docs/guides/auth/redirect-urls).

## Verificação e limites

- 37 testes focados inicialmente aprovados, zero falhas: `test-results/google-auth-20261104/affected.txt`. São testes locais de backend, SDK, interface, sessão, callback e cadastro; o transporte Google nesses testes é controlado.
- Reteste após o ajuste final do controlador: 22 aprovados, zero falhas, em `test-results/google-auth-20261104/final-focused.txt`.
- Suíte completa `npm test`: **236 aprovados, zero falhas**, em `test-results/google-auth-20261104/full.txt` (213,6 segundos). Não equivale a homologação Google remota.
- Validação de sintaxe: 173 arquivos, zero falhas.
- Build Pages final concluído localmente após os ajustes: `test-results/google-auth-20261104/build.txt`. Não equivale a deploy.
- Captura local do formulário, sem erros indevidos: `test-results/google-auth-20261104/google-disabled-mobile.png`.
- Verificação remota real comprova o bloqueio do provedor; **não comprova login Google bem-sucedido**.

**Situação:** correção da interface implementada; ativação e homologação completa do Google OAuth pendentes de acesso aos painéis e configuração do provedor. Nenhum deploy ou liberação comercial foi realizado nesta tarefa.
