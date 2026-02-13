const express = require('express');
const app = express();

// Cloud Run 8080 portunu verir, ama biz esnek olalım
const port = process.env.PORT || 8080; 

app.get('/', (req, res) => {
  res.send('🚀 Montessori Değerlendirme Sistemi Canlıda! Bulut bağlantısı başarılı.');
});

// BURASI ÇOK KRİTİK: Portu dinlemeye başla
app.listen(port, '0.0.0.0', () => {
  console.log(`Sunucu ${port} üzerinde başarıyla başlatıldı.`);
});