# Roteiro eliminatório do piloto

Não executado externamente. Sem projeto Supabase, SMTP, HTTPS e autorização comercial, o resultado permanece **NO-GO**.

1. Use projeto de TESTES com todas as migrações e primeiro administrador provisionado. Registre o UUID da loja, do cliente e dos pedidos, sem registrar tokens/senhas.
2. Cadastre um responsável de loja por Auth, confirme e-mail, solicite estabelecimento. Como admin, crie categorias; confira autorização e aprove a loja.
3. Configure duas categorias, endereço, horários/dias, bairro Centro com taxa de entrega, mínimo, métodos de pagamento, retirada e produtos com adicionais obrigatórios/opcionais. Loja nova deve mostrar Sem avaliações.
4. Abra duas sessões independentes: Chrome normal para cliente e outro perfil/navegador para estabelecimento. Não copiar localStorage entre elas. Crie e confirme a conta do cliente. Admin deve usar uma terceira sessão.
5. Em staging, habilite o piloto com justificativa de teste. Abra a loja. Cliente deve pesquisar a loja, escolher produto/opções e adicionar ao carrinho.
6. Teste troca de loja: cancelar conserva o carrinho; confirmar substitui. Não misturar itens de lojas.
7. Cliente informa endereço manual com bairro, sem GPS. Escolhe pagamento diretamente à loja e confere subtotal/entrega/total. Nada deve indicar pagamento aprovado.
8. Confirme o pedido. Anote UUID. Confira o registro e os itens no banco. Loja precisa recebê-lo sem compartilhar dados de navegador com o cliente.
9. Loja aceita, prepara, marca pronto, sai para entrega e conclui. Cliente vê as atualizações. Recarregue ambas as sessões e confira o estado persistido. Teste logout/login.
10. Confirme que comissão foi criada uma única vez na conclusão, sobre produtos sem entrega e pela taxa congelada. Admin registra quitação de TESTE com referência e tenta duplicá-la: a duplicata deve ser recusada. Vendedor não pode dar baixa.
11. Repita com retirada: taxa zero e sequência pronto para retirada → retirado, sem etapa de entrega. Não substituir o endereço pessoal pelo endereço da loja.
12. Repita recusa, cancelamento antes de aceitar e cancelamento excepcional auditado pelo admin antes da conclusão. Nenhum caso cancelado/recusado gera comissão.
13. Altere o preço entre revisão e confirmação; o servidor precisa rejeitar preço diferente do total revisado. Teste produto indisponível, loja fechada/pausada/suspensa, bairro fora da cobertura, mínimo e adicionais inválidos.
14. Faça duplo clique e interrupção de rede após envio. Consulte o pedido pela mesma chave e confirme que não existem dois registros. Reabra a conexão e confira recuperação pelo polling/Realtime.
15. Envie mensagem entre as duas sessões, recarregue, confira autor/horário/leitura e tente acesso com cliente/loja alheios. Faça testes diretos na API com IDs trocados, além de conferir os botões.
16. Teste acesso administrativo forjado em localStorage/metadata, mudança de proprietário, preço enviado no payload, comissão e imagem de outra loja. Nenhuma requisição pode conceder privilégios ou vazar registros.
17. Faça uma avaliação apenas após concluir pedido; outra conta e a loja não podem alterar essa avaliação. Dados públicos não devem expor UUID do cliente nem ID de pedido na lista de avaliações.
18. Confira cada tela em 320, 360, 390, 430, 768 px e desktop, e em celulares físicos. Valide teclado, modais, erros, perda de conexão e rolagem. Teste o alerta sonoro somente após ativá-lo.
19. Valide confirmação e recuperação de e-mail com SMTP real; expiração da sessão; upload válido/inválido/grande; headers HTTPS/CSP; cópia e restauração de banco **e** imagens.
20. Ao terminar testes, bloquear novos pedidos e suspender as lojas fictícias. Só autorizar uma ou duas lojas reais após contrato de comissão/base/vencimento, responsáveis de suporte, política jurídica, treinamento e contingência documentados. Registrar GO/NO-GO com evidências.

Contingência: se o painel ou rede falhar, fechar/pausar a loja e bloquear novos pedidos. Conferir UUID/chave no banco antes de repetir. Um contato telefônico autorizado pela loja pode orientar um pedido já conhecido, mas não constitui registro/entrega automática de pedido. Não substituir a integração silenciosamente por WhatsApp.

Pendências operacionais: controlador/CNPJ/contato oficial, termos e privacidade revisados, áreas reais, tempos reais, contrato de comissão e vencimentos, rota de suporte, observabilidade/alertas e procedimento testado de restauração. Nenhuma informação empresarial foi inventada.
