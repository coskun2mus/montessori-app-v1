const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

// 1. Önce MODELLERİ ÇAĞIRALIM (Dosya yollarının doğru olduğundan emin ol)
const Class = require('./models/Class');
const Student = require('./models/Student');
const Lesson = require('./models/Lesson');

// 2. APP AYARLARI
const app = express();
app.use(express.json()); 

const port = process.env.PORT || 8080;
const mongoURI = process.env.MONGO_URI;

// 3. VERİTABANI BAĞLANTISI
mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB bağlantısı başarılı!'))
  .catch((err) => console.error('❌ MongoDB bağlantı hatası:', err));

// --- MATERYAL KURMA ROTASI ---
app.get('/materyal-kur', async (req, res) => {
  try {
    const dersler = [
      { area: 'Duyusal', lessonName: 'Pembe Kule', difficultyLevel: 3 },
      { area: 'Matematik', lessonName: 'Sayı Kartları', difficultyLevel: 5 },
      { area: 'Günlük Yaşam', lessonName: 'Kaşıklama', difficultyLevel: 2 }
    ];
    // Daha önce eklenmişse hata vermemesi için temizleyip ekleyebiliriz veya direkt insert edebiliriz
    await Lesson.deleteMany({}); // Test aşamasında listeyi temizlemek iyidir
    await Lesson.insertMany(dersler);
    res.send("<h1>✅ Materyaller Başarıyla Kuruldu!</h1>");
  } catch (err) {
    res.status(500).send("Hata: " + err.message);
  }
});

// --- ÖĞRENCİ VE SINIF TEST ROTASI ---
app.get('/test-ekle', async (req, res) => {
  try {
    // Unique hatası almamak için her seferinde rastgele bir isim ekleyelim ya da varsa onu kullanalım
    const sinifAdi = "Kelebekler Sınıfı " + Math.floor(Math.random() * 100);
    
    const yeniSinif = await Class.create({
      className: sinifAdi,
      teacherName: "Ayşe Öğretmen"
    });

    const yeniOgrenci = await Student.create({
      firstName: "Ali",
      lastName: "Yılmaz",
      birthDate: new Date('2022-05-15'),
      currentClass: yeniSinif._id,
      montessoriExperience: false
    });

    res.send(`
      <h1>✅ Kayıt Başarılı!</h1>
      <p><b>Sınıf:</b> ${yeniSinif.className}</p>
      <p><b>Öğrenci:</b> ${yeniOgrenci.firstName} ${yeniOgrenci.lastName}</p>
      <p><b>Yaş (Ay):</b> ${yeniOgrenci.ageInMonths} aylık</p>
    `);
  } catch (err) {
    res.status(500).send("Hata oluştu: " + err.message);
  }
});

app.get('/', (req, res) => {
  res.send('<h1>🚀 Montessori Sistemi Canlıda!</h1><p>/test-ekle veya /materyal-kur adreslerini kullanın.</p>');
});

app.listen(port, () => {
  console.log(`Sunucu ${port} üzerinde çalışıyor.`);
});