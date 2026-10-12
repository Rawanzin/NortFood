# Serviços e custos — consultados em 12/10/2026

Nenhum serviço foi contratado, nenhuma cobrança criada. Valores em dólar, sem conversão cambial ou impostos. Confirmar contratação e limites no painel antes de decidir.

| Serviço | Necessidade | Informação confirmada / pendência |
| --- | --- | --- |
| Supabase | Banco, Auth, Realtime, Storage, função de upload | Free anunciado a US$ 0/mês, 500 MB de banco, 1 GB de arquivos, dois projetos ativos e pausa após uma semana de inatividade. Pro a partir de US$ 25/mês; projetos adicionais/uso excedente podem aumentar a conta. [Tabela oficial](https://supabase.com/pricing). |
| Netlify | Frontend estático HTTPS | Existe plano Free e planos com créditos de uso. Custo exato e adequação ao volume do piloto pendentes; consultar limites, suspensão/excedentes e condição da sua conta. [Preços oficiais](https://www.netlify.com/pricing/). |
| SMTP próprio | Confirmação/recuperação de conta | Provedor ainda não escolhido. Valor, domínio remetente, quotas e autenticação DNS pendentes. O SMTP padrão Supabase não é recomendado para operação comercial. [Documentação SMTP](https://supabase.com/docs/guides/auth/auth-smtp). |
| Domínio | Endereço comercial do frontend | Nome/registrador/valor anual pendentes de decisão. Não é necessário comprar domínio para o teste local. |
| Backups | Recuperação operacional | Automação/retensão dependem do plano e devem ser verificadas. O plano Free não anuncia backups automáticos de banco; restauração e cópia de Storage precisam de procedimento próprio validado. [Backups](https://supabase.com/docs/guides/platform/backups), [plano](https://supabase.com/pricing). |
| Monitoramento | Erros, disponibilidade e uso | Começar com logs dos provedores; retenção, alertas e necessidade de serviço adicional pendentes. Não foi instalado provedor externo. |
| Leaflet/OpenStreetMap/Nominatim | Mapa opcional | Infra externa existente. Sem garantia de disponibilidade; cumprir políticas de uso e avaliar serviço contratado se volume exigir. Não é rota autoritativa de entrega: cobertura é validada por bairros no banco. |

Para testar sem containers, PGlite executa o motor PostgreSQL no processo Node local. Ele não é o banco de produção e não fornece Auth/SMTP/Realtime gerenciados. O teste local não implica custo recorrente de serviço.
