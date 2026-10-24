# Autenticação, Resend e limites atuais

Resend foi escolhido expressamente, priorizando o plano gratuito. Nome de exibição do remetente: **NortFood**. Não há domínio próprio ou remetente verificado. O Gmail do administrador não foi usado como From. Não houve contratação, cartão ou faturamento ativado.

Atualização em 24/10: aceites dos Termos e Privacidade autorizados e login Resend concluído. A tela Domains autenticada informa **No domains yet**. Nenhuma API key foi criada e nenhum e-mail foi enviado. A integração nativa oficial é https://supabase.com/partners/resend. Ela poderá configurar o SMTP após domínio e credenciais estarem verificados. Não criar chaves privilegiadas no frontend.

Configuração preparada: host `smtp.resend.com`, porta 465 (TLS), usuário `resend`, nome NortFood. A senha SMTP é uma chave Resend e deve ser inserida pelo responsável no fluxo protegido. O From deve pertencer a um domínio controlado e verificado no Resend. Nenhum endereço foi inventado. Manter rastreamento de links desativado nos e-mails de autenticação. Documentação: https://resend.com/docs/send-with-smtp e https://supabase.com/docs/guides/auth/auth-smtp.

Modelos locais prontos em `supabase/templates/`: confirmação de cadastro, recuperação de senha e alteração de e-mail. Assuntos e caminhos declarados em `supabase/config.toml`. Os links usam `{{ .ConfirmationURL }}` do Supabase, sem tokens fixos. O painel remoto informa que somente aplica modelos personalizados após SMTP; portanto os modelos ainda não estão ativos remotamente.

O serviço padrão Supabase não é envio de produção: só permite destinatários autorizados da equipe e tem limite baixo. Não foi aberto cadastro público com e-mails que não possam ser confirmados. O bloqueio remoto de novos usuários permanece; confirmação de e-mail e troca segura de e-mail continuam habilitadas. Zero usuários remotos ao terminar a auditoria. Cadastro, recuperação e sessão real não foram marcados como aprovados.

Senha: frontend, configuração local e painel Supabase usam mínimo de 8 caracteres, sem impor composição ou lista arbitrária no frontend. A proteção Supabase contra senhas vazadas exige Pro neste painel e não foi contratada. A aceitação real de senha no Auth remoto continua pendente do fluxo de cadastro autorizado.

Google: Termos do Google Cloud e Política de Dados do Usuário dos Serviços de API aceitos após autorização expressa. Projeto `nortfood-auth-2026`, nome NortFood, sem faturamento. Cliente Web **NortFood Web** criado em 24/10 após autorização específica. A entrada, ativação e submissão das novas credenciais no Supabase foram entregues ao usuário na tela protegida. A última verificação efetiva ainda retornava `external.google=false`; a informação de que foi salvo não foi tratada como comprovação de ativação. Nenhum login real Google foi declarado aprovado.

Origem autorizada preparada: `https://nortfood.netlify.app`. Callback: `https://zwkhqahivthzivmuirjr.supabase.co/auth/v1/callback`. Escopos necessários: openid, perfil e e-mail. Não solicitar Gmail, contatos ou Drive. A intenção Pedir/Vender é mantida em sessionStorage no OAuth, sem conceder cargos; autorização efetiva continua no backend.

Conferência final de 24/10: o endpoint real de autorização Google retornou HTTP 400, `validation_failed`, provedor desativado. O app Google está em Teste com zero usuários de teste; homepage, privacidade e termos ainda não estavam salvos. Foram preparados os links de `https://nortfood.pages.dev`, domínio do projeto e somente `kevenrawan@gmail.com` como teste, sem submissão. Os retornos exatos do Pages no Supabase e uma liberação exclusivamente Google também foram preparados, sem salvar enquanto as autorizações específicas estão pendentes. Nenhum pedido real foi liberado.

Versão pública alternativa comprovada: `https://nortfood.pages.dev`, release `64fed906fbed68b3a2e5`, fonte pública `4565f5741169070038649d19b6cce11224be31cb`. O Netlify oficial continua em `61011c4`, sem esta atualização, por bloqueio de cota. Detalhes e evidências no relatório `RELATORIO_RECUPERACAO_20261024.md`.
