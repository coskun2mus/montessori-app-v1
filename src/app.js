const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

// MODELLERİ ÇAĞIRALIM
const Class = require('./models/Class');
const Student = require('./models/Student');

const app = express();
app.use(express.json()); // JSON verilerini okuyabilmek için

const port = process.env.PORT || 8080;
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB bağlantısı başarılı!'))
  .catch((err) => console.error('❌ MongoDB bağlantı hatası:', err));

// --- TEST ROTASI ---
app.get('/test-ekle', async (req, res) => {
  try {
    // 1. Önce bir sınıf oluşturalım
    const yeniSinif = await Class.create({
      className: "Kelebekler Sınıfı",
      teacherName: "Ayşe Öğretmen"
    });

    // 2. Bu sınıfa bağlı bir öğrenci oluşturalım
    const yeniOgrenci = await Student.create({
      firstName: "Ali",
      lastName: "Yılmaz",
      birthDate: new Date('2022-05-15'), // Analiz için kritik
      currentClass: yeniSinif._id, // Sınıfın ID'sini bağladık
      montessoriExperience: false
    });

    res.send(`
      <h1>✅ Kayıt Başarılı!</h1>
      <p><b>Sınıf:</b> ${yeniSinif.className}</p>
      <p><b>Öğrenci:</b> ${yeniOgrenci.firstName} ${yeniOgrenci.lastName}</p>
      <p><b>Yaş Analizi (Ay):</b> ${yeniOgrenci.ageInMonths} aylık</p>
    `);
  } catch (err) {
    res.status(500).send("Hata oluştu: " + err.message);
  }
});

app.get('/', (req, res) => {
  res.send('<h1>🚀 Montessori Sistemi Canlıda!</h1><p>Test için /test-ekle adresine git.</p>');
});

app.listen(port, () => {
  console.log(`Sunucu ${port} üzerinde çalışıyor.`);
});