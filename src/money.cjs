function cents(value) {
  const text=String(value).trim().replace(',','.');
  if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(text)) throw new Error('Valor monetário inválido.');
  const [whole,fraction='']=text.split('.');
  const result=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  if(!Number.isSafeInteger(result)) throw new Error('Valor fora do limite.');
  return result;
}
function commission(baseCents,basisPoints) {
  if(!Number.isSafeInteger(baseCents)||baseCents<0||!Number.isInteger(basisPoints)||basisPoints<0||basisPoints>2000) throw new Error('Comissão inválida.');
  return Math.floor((baseCents*basisPoints+5000)/10000);
}
module.exports={cents,commission};
