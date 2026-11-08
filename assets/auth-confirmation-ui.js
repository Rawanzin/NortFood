// A UI recebe somente o resultado produzido após a verificação Auth no servidor.
// Uma URL de retorno, um hash ou uma sessão local não são prova de confirmação.
export function confirmationResultHTML(result={}){
 const verified=result.status==='verified'&&result.serverVerified===true;
 const status=verified?'verified':['expired','unavailable'].includes(result.status)?result.status:'invalid';
 const content={
  verified:{title:'E-mail confirmado!',message:'Seu endereço de e-mail foi confirmado. Continue para acessar o NortFood ou concluir os dados da sua conta.'},
  expired:{title:'Este link não está mais disponível',message:'O link de confirmação expirou ou já foi utilizado. Solicite um novo e-mail ou entre se você já confirmou sua conta.'},
  invalid:{title:'Não foi possível confirmar seu e-mail',message:'Este link é inválido ou não pôde ser verificado. Solicite um novo e-mail de confirmação para continuar.'},
  unavailable:{title:'Não foi possível verificar agora',message:'Confira sua conexão e tente novamente. Seu e-mail só será considerado confirmado após a verificação segura.'}
 }[status];
 const icon=verified?'<path d="m8 12 3 3 6-6"/>':'<path d="M12 7v6m0 4h.01"/>';
 return '<section data-auth-confirmation-result="'+status+'" style="padding:16px 0 6px;text-align:center;">'+
  '<div style="margin:0 auto 22px;width:64px;height:64px;display:grid;place-items:center;border-radius:50%;background:var(--surface-soft,#fff1f2);color:var(--accent-text,#d81932);"><svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+icon+'</svg></div>'+
  '<h2 id="auth-confirmation-result-title" style="margin:0 0 14px;font-size:26px;line-height:1.25;">'+content.title+'</h2>'+
  '<p '+(verified?'role="status"':'id="auth-confirmation-error" class="auth-error" role="alert"')+' aria-live="polite" style="margin:0 0 26px;line-height:1.6;">'+content.message+'</p>'+
  (verified?'<button type="button" class="btn" data-confirmation-continue>Continuar no NortFood</button>':'<button type="button" class="btn" data-action="resend-confirmation">Reenviar confirmação</button><button type="button" class="text-btn" data-auth-mode="login" style="display:block;margin:18px auto 0;">Já confirmei — Entrar</button>')+
  '</section>';
}
