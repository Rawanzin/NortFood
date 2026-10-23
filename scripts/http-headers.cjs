// Interpret the limited path rules used by this project's Netlify _headers.
// Per-file Content-Type/Cache-Control must not become global headers.
function headersFor(source, pathname) {
  const headers = {};
  let applies = false;
  for (const line of source.split(/\r?\n/)) {
    if (line.startsWith('/')) applies = line.trim() === '/*' || line.trim() === pathname;
    else if (applies) {
      const match = line.match(/^\s+([^:]+):\s*(.+)$/);
      if (match) headers[match[1]] = match[2];
    }
  }
  return headers;
}
module.exports={headersFor};
