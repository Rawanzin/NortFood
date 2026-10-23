// Barra inferior: recolher somente quando um campo esta ativo e o teclado reduz a area visivel.
(()=>{
 let baseline=window.innerHeight;
 const editable=()=>{const e=document.activeElement;return !!e&&(e.matches('textarea,select,[contenteditable="true"]')||e.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"])'));};
 function update(){const focus=editable(),height=window.visualViewport?.height||window.innerHeight;if(!focus)baseline=Math.max(height,window.innerHeight);const open=focus&&baseline-height>Math.max(140,baseline*.2);document.documentElement.classList.toggle('keyboard-open',open);}
 window.visualViewport?.addEventListener('resize',update);window.addEventListener('resize',update);
 document.addEventListener('focusin',update);document.addEventListener('focusout',()=>requestAnimationFrame(update));update();
})();
