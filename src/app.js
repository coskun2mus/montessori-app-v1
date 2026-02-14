const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

// Klasör yolları
const viewsPath = path.join(__dirname, '..', 'views');
app.use(express.static(viewsPath));

// Modeller
const Class = require('./models/Class');
const Student = require('./models/Student');
const Lesson = require('./models/Lesson');
const Observation = require('./models/Observation');

// MONGODB BAĞLANTISI
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB bağlantısı başarılı!'))
  .catch((err) => console.error('❌ Bağlantı hatası:', err));

// --- SAYFA ROTALARI ---

app.get('/', (req, res) => {
    res.sendFile(path.join(viewsPath, 'index.html'));
});

app.get('/ayarlar', (req, res) => {
    res.sendFile(path.join(viewsPath, 'settings.html'));
});

// --- API ROTALARI ---

// 1. SINIFLAR
app.get('/api/classes', async (req, res) => {
    try {
        const classes = await Class.find().sort({ className: 1 });
        res.json(classes);
    } catch (err) {
        res.status(500).json({ error: "Sınıflar getirilemedi" });
    }
});

app.post('/api/classes', async (req, res) => {
    try {
        // Mükerrer Kayıt Kontrolü
        const exists = await Class.findOne({ className: req.body.className });
        if (exists) return res.status(400).json({ error: "Bu isimde bir sınıf zaten var!" });

        const newClass = await Class.create(req.body);
        res.json(newClass);
    } catch (err) {
        res.status(500).json({ error: "Sınıf eklenirken bir hata oluştu." });
    }
});

// 2. MATERYALLER (LESSONS)
app.post('/api/lessons', async (req, res) => {
    try {
        // Mükerrer Kayıt Kontrolü
        const exists = await Lesson.findOne({ lessonName: req.body.lessonName });
        if (exists) return res.status(400).json({ error: "Bu materyal zaten müfredatta var!" });

        const newLesson = await Lesson.create(req.body);
        res.json(newLesson);
    } catch (err) {
        res.status(500).json({ error: "Materyal eklenemedi." });
    }
});

// 3. ÖĞRENCİLER
// Sınıfa göre öğrencileri listele (Yaş hesabı Virtual alanla otomatik gelecek)
app.get('/api/students/:classId', async (req, res) => {
    try {
        const students = await Student.find({ currentClass: req.params.classId });
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: "Öğrenciler getirilemedi" });
    }
});

// Yeni Öğrenci Ekle (Mükerrer kontrolü model seviyesinde yapıldı, burada yakalıyoruz)
app.post('/api/students', async (req, res) => {
    try {
        const { firstName, lastName, birthDate } = req.body;

        // Manuel kontrol: Aynı isim, soyisim ve doğum günü var mı?
        const existingStudent = await Student.findOne({ 
            firstName: firstName.trim(), 
            lastName: lastName.trim(), 
            birthDate: new Date(birthDate) 
        });

        if (existingStudent) {
            return res.status(400).json({ error: "Bu öğrenci sistemde zaten kayıtlı!" });
        }

        const newStudent = await Student.create(req.body);
        res.status(201).json(newStudent);
    } catch (err) {
        console.error("Kayıt hatası:", err);
        res.status(500).json({ error: "Kaydedilirken bir hata oluştu." });
    }
});

// Tüm Materyalleri Getir (Modal içindeki liste için)
app.get('/api/lessons', async (req, res) => {
    try {
        const lessons = await Lesson.find().sort({ area: 1, lessonName: 1 });
        res.json(lessons);
    } catch (err) {
        res.status(500).json({ error: "Materyaller getirilemedi" });
    }
});

// Yeni Gözlem Kaydı Oluştur
app.post('/api/observations', async (req, res) => {
    try {
        // Gelen veriyi kontrol etmek için log (hata ayıklarken hayat kurtarır)
        console.log("Yeni Gözlem Talebi:", req.body);

        // Veritabanına kayıt
        const newObservation = await Observation.create(req.body);
        
        // Başarılı sonucu dön
        res.status(201).json(newObservation);
    } catch (err) {
        console.error("Gözlem Kayıt Hatası:", err);
        
        // Eğer modeldeki 'required' alanlar eksikse burası tetiklenir
        res.status(400).json({ 
            error: "Gözlem kaydedilemedi. Lütfen tüm zorunlu alanları (Öğrenci, Materyal, Durum, Öğretmen) kontrol edin.",
            details: err.message 
        });
    }
});
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`🚀 Sunucu v1.1.0 hazır! Port: ${port}`);
});