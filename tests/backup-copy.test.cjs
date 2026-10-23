const {test}=require('node:test'),assert=require('node:assert/strict'),{copyCounts}=require('../scripts/backup-copy-counts.cjs');
test('Auditoria COPY conta tabela S3 e nao confunde newline escapado com nova linha',()=>{
 const counts=copyCounts('COPY storage.s3_multipart_uploads (id, data) FROM stdin;\r\n1\ttexto\\nlinha\r\n2\tdois\r\n\\.\r\nCOPY public.orders (id) FROM stdin;\r\n\\.\r\n');
 assert.equal(counts.get('storage.s3_multipart_uploads'),2);assert.equal(counts.get('public.orders'),0);assert.equal(counts.has('realtime.messages'),false);
});
