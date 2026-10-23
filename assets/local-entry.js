// file:// nao recebe as variaveis de ambiente do servidor.
(()=>{
 if(location.protocol!=='file:')return;
 window.NortFoodLocalEntry=Object.freeze({blocked:true});
 const panel=document.createElement('main');panel.className='wrap';panel.style.paddingTop='40px';
 const title=document.createElement('h1');title.textContent='Abra o NortFood pelo endereço local';
 const text=document.createElement('p');text.textContent='Este arquivo foi aberto diretamente. O cadastro precisa do servidor local para carregar a conexão segura com o Supabase. Seus dados não foram apagados.';
 const start=document.createElement('p');start.textContent='Se o servidor estiver fechado, abra Iniciar-NortFood.cmd na pasta do projeto. Mantenha a janela aberta enquanto utilizar o aplicativo.';
 const link=document.createElement('a');link.className='btn';link.textContent='Abrir NortFood local';
 const route=/^#(?:home|map|search|profile|orders|seller|shop\/[a-z0-9-]+)$/.test(location.hash)?location.hash:'#home';
 link.href='http://localhost:4174/'+route;
 panel.append(title,text,start,link);document.getElementById('app')?.replaceChildren(panel);document.title='Abrir NortFood local';
})();
