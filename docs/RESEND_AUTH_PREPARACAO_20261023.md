# Autenticação, Resend e limites atuais

Resend foi escolhido expressamente, priorizando o plano gratuito. Nome de exibição do remetente: **NortFood**. Não há domínio próprio ou remetente verificado. O Gmail do administrador não foi usado como From. Não houve contratação, cartão ou faturamento ativado.

Fluxos oficiais abertos: https://resend.com/login e Supabase principal → Authentication → Emails → SMTP Settings. Login Resend exige aceite dos Termos e Privacidade; o aceite está pendente de autorização específica. A integração nativa oficial é https://supabase.com/partners/resend. Ela poderá configurar o SMTP após conta, domínio e permissões estarem autorizados. Não criar chaves privilegiadas no frontend.

Configuração preparada: host `smtp.resend.com`, porta 465 (TLS), usuário `resend`, nome NortFood. A senha SMTP é uma chave Resend e deve ser inserida pelo responsável no fluxo protegido. O From deve pertencer a um domínio controlado e verificado no Resend. Nenhum endereço foi inventado. Manter rastreamento de links desativado nos e-mails de autenticação. Documentação: https://resend.com/docs/send-with-smtp e https://supabase.com/docs/guides/auth/auth-smtp.

Modelos locais prontos em `supabase/templates/`: confirmação de cadastro, recuperação de senha e alteração de e-mail. Assuntos e caminhos declarados em `supabase/config.toml`. Os links usam `{{ .ConfirmationURL }}` do Supabase, sem tokens fixos. O painel remoto informa que somente aplica modelos personalizados após SMTP; portanto os modelos ainda não estão ativos remotamente.

O serviço padrão Supabase não é envio de produção: só permite destinatários autorizados da equipe e tem limite baixo. Não foi aberto cadastro público com e-mails que não possam ser confirmados. O bloqueio remoto de novos usuários permanece; confirmação de e-mail e troca segura de e-mail continuam habilitadas. Zero usuários remotos ao terminar a auditoria. Cadastro, recuperação e sessão real não foram marcados como aprovados.

Senha: frontend, configuração local e alteração salva no painel Supabase para mínimo de 8 caracteres, sem impor combinação de maiúsculas, números e símbolos. Senhas comuns são recusadas no frontend. A proteção Supabase contra senhas vazadas exige Pro neste painel e não foi contratada. A aceitação real de uma senha de 8 caracteres no Auth remoto continua pendente do fluxo de cadastro autorizado.

Google: Termos do Google Cloud aceitos após autorização expressa. Projeto de configuração OAuth `nortfood-auth-2026`, nome NortFood, criado sem faturamento. Identidade do aplicativo, suporte e público externo em teste foram preenchidos. A conclusão exige um aceite separado da Política de Dados do Usuário dos Serviços de API do Google, solicitado e ainda pendente. Não há cliente/segredo OAuth criado nem provedor Google habilitado no Supabase; nenhum login real Google foi declarado aprovado.

Origem autorizada preparada: `https://nortfood.netlify.app`. Callback: `https://zwkhqahivthzivmuirjr.supabase.co/auth/v1/callback`. Escopos necessários: openid, perfil e e-mail. Não solicitar Gmail, contatos ou Drive. A intenção Pedir/Vender é mantida em sessionStorage no OAuth, sem conceder cargos; autorização efetiva continua no backend.
