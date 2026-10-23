// Barra inferior: recolher somente quando um campo esta ativo e o teclado reduz a area visivel.
(()=>{
 let baseline=window.innerHeight;
 const editable=()=>{const e=document.activeElement;return !!e&&(e.matches('textarea,select,[contenteditable="true"]')||e.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"])'));};
 function update(){const focus=editable(),height=window.visualViewport?.height||window.innerHeight;if(!focus)baseline=Math.max(height,window.innerHeight);const open=focus&&baseline-height>Math.max(140,baseline*.2);document.documentElement.classList.toggle('keyboard-open',open);}
 window.visualViewport?.addEventListener('resize',update);window.addEventListener('resize',update);
 document.addEventListener('focusin',update);document.addEventListener('focusout',()=>requestAnimationFrame(update));update();
})();

// Recompute the hint from actual overflow, including after a catalog refresh.
(() => {
 function syncCategories(){
  document.querySelectorAll('.category-scroll').forEach(wrapper=>{
   const list=wrapper.querySelector('.categories');
   wrapper.classList.toggle('has-more',!!list&&list.scrollWidth-list.clientWidth-list.scrollLeft>2);
  });
 }
 window.NortFoodUI=Object.freeze({syncCategories});
 addEventListener('resize',syncCategories);
 document.addEventListener('scroll',event=>{if(event.target.matches?.('.categories'))syncCategories()},true);
})();
