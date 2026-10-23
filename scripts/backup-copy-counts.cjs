// Conta COPY sem registrar conteudo de linhas, inclusive nomes com numeros.
function copyCounts(sql){const counts=new Map();let active=null;for(const line of sql.split(/\r?\n/)){const match=/^COPY ([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*) \(/i.exec(line);if(match){active=match[1];counts.set(active,0);}else if(active&&line==='\\.')active=null;else if(active)counts.set(active,counts.get(active)+1);}return counts;}
module.exports={copyCounts};
