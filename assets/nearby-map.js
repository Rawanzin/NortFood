/* Descoberta pública: GPS pontual, sem persistir posição ou criar endereços. */
(function(scope){
 'use strict';
 let active=null;
 const center={lat:-15.743889,lng:-43.024722};
 const valid=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
 function dispose(){if(!active)return;active.closed=true;active.abort.abort();active.observer?.disconnect();clearTimeout(active.timer);active.map?.off();active.map?.remove();active=null;}
 function open({modal,stores=[],onStore,search}){
  dispose();
  modal('<div class="modal-head"><h2 id="nearby-title">Explorar lojas</h2><button class="close" type="button" data-action="close-modal" aria-label="Fechar mapa">×</button></div><p class="nearby-intro">Veja lojas na região. Seu endereço de entrega não muda.</p><form data-nearby-search class="nearby-search" role="search"><label for="nearby-query">Buscar endereço, bairro ou cidade</label><div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><input id="nearby-query" name="query" type="search" autocomplete="off" maxlength="180" required placeholder="Endereço, bairro ou cidade"><button class="nearby-search-submit" type="submit">Buscar</button></div></form><button class="nearby-gps" type="button" data-nearby-gps><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg><span>Usar minha localização</span></button><div data-nearby-results></div><p data-nearby-status role="status" aria-live="polite">Carregando mapa…</p><div data-nearby-canvas aria-label="Mapa de estabelecimentos" tabindex="0"></div><p data-nearby-empty></p><div data-nearby-stores></div><small>Mapas e buscas: OpenStreetMap. Busque quando quiser; o GPS é opcional. Distâncias em linha reta não definem frete ou cobertura.</small>');
  const root=scope.document.querySelector('.modal');root.classList.add('nearby-modal');root.setAttribute('aria-labelledby','nearby-title');
  const state={abort:new AbortController(),map:null,closed:false,attempt:0};active=state;
  const listen=(el,event,handler)=>el.addEventListener(event,handler,{signal:state.abort.signal});
  const status=message=>{if(!state.closed)root.querySelector('[data-nearby-status]').textContent=message;};
  const options=stores.filter(s=>s.status==='approved'&&typeof s.latitude==='number'&&typeof s.longitude==='number'&&valid({lat:s.latitude,lng:s.longitude}));
  root.querySelector('[data-nearby-empty]').textContent=options.length?'Somente lojas com localização cadastrada aparecem no mapa.':'Nenhum estabelecimento com localização confirmada está disponível nesta região.';
  const list=root.querySelector('[data-nearby-stores]');
  for(const store of options){const button=scope.document.createElement('button');button.className='text-btn';button.type='button';button.textContent='Ver '+store.name;listen(button,'click',()=>{dispose();onStore?.(store.id);});list.append(button);}
  let chosen=null;
  const select=(point,message)=>{if(!valid(point)||state.closed)return;if(state.map){state.map.setView(point,16);if(chosen)chosen.setLatLng(point);else chosen=scope.L.circleMarker(point,{radius:8,color:'#ef233c',fillOpacity:0.6}).addTo(state.map);}status(message||'Ponto selecionado para explorar. Nenhum endereço de entrega foi alterado.');};
  if(scope.L){try{
   const L=scope.L;state.map=L.map(root.querySelector('[data-nearby-canvas]'),{scrollWheelZoom:false,keyboard:true}).setView(center,14);
   const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'});
   tiles.on('tileerror',()=>status('O mapa não carregou completamente. Você ainda pode usar a busca e a lista de lojas.'));
   tiles.on('load',()=>{if(root.querySelector('[data-nearby-status]')?.textContent==='Carregando mapa…')status('Explore o mapa. O centro inicial é Porteirinha, MG.');});tiles.addTo(state.map);
   state.map.on('click',event=>select(event.latlng));
   for(const store of options){const content=scope.document.createElement('div'),name=scope.document.createElement('strong'),button=scope.document.createElement('button');name.textContent=store.name;button.textContent='Abrir perfil';button.type='button';button.className='btn small';listen(button,'click',()=>{dispose();onStore?.(store.id);});content.append(name,scope.document.createElement('br'),button);
    L.marker({lat:store.latitude,lng:store.longitude},{title:store.name,keyboard:true,icon:L.divIcon({className:'store-location-pin',html:'<span aria-hidden="true"></span>',iconSize:[26,34],iconAnchor:[13,32]})}).addTo(state.map).bindPopup(content);
   }
   state.timer=setTimeout(()=>{if(!state.closed)state.map?.invalidateSize();},80);
   if(scope.ResizeObserver){state.observer=new ResizeObserver(()=>state.map?.invalidateSize());state.observer.observe(root);}
  }catch{status('Mapa indisponível. Use a busca ou a lista de estabelecimentos.');}}
  else status('Mapa indisponível. Use a busca ou a lista de estabelecimentos.');
  const gps=root.querySelector('[data-nearby-gps]');
  listen(gps,'click',()=>{const attempt=++state.attempt;if(!scope.navigator.geolocation){status('GPS não disponível neste navegador. Selecione a localização manualmente.');return;}gps.disabled=true;status('Obtendo localização com sua permissão…');scope.navigator.geolocation.getCurrentPosition(position=>{if(state.closed||attempt!==state.attempt)return;gps.disabled=false;const p={lat:position.coords.latitude,lng:position.coords.longitude};if(!valid(p)){status('Localização indisponível. Selecione a localização manualmente.');return;}select(p,'Sua localização foi obtida. Ela não foi salva como endereço de entrega.');},error=>{if(state.closed||attempt!==state.attempt)return;gps.disabled=false;status((error.code===1?'Permissão negada. ':error.code===3?'Tempo de localização esgotado. ':'Localização indisponível. ')+'Selecione a localização manualmente ou tente novamente.');},{enableHighAccuracy:true,timeout:12000,maximumAge:30000});});
  listen(root.querySelector('[data-nearby-search]'),'submit',async event=>{event.preventDefault();event.stopPropagation();const form=event.currentTarget,query=form.elements.query.value.trim(),button=form.querySelector('button');if(!query||button.disabled)return;button.disabled=true;const results=root.querySelector('[data-nearby-results]');results.replaceChildren();status('Buscando localização…');try{const rows=await search(query,state.abort.signal);if(state.closed)return;if(!rows.length)status('Endereço não encontrado. Tente bairro e cidade ou escolha um ponto no mapa.');else{status('Escolha um resultado para explorar o mapa.');for(const row of rows){const point={lat:Number(row.lat),lng:Number(row.lon)};if(!valid(point))continue;const option=scope.document.createElement('button');option.type='button';option.className='text-btn';option.textContent=row.display_name;listen(option,'click',()=>select(point,'Localização selecionada. Confira a região no mapa.'));results.append(option);}}}catch{status('A busca está indisponível. Tente novamente ou selecione um ponto no mapa.');}finally{if(!state.closed)button.disabled=false;}});
 }
 scope.NortFoodNearby={open,dispose};
})(window);
