const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

// ÖNEMLİ: Klasör yollarını tanımlıyoruz
// app.js src içinde olduğu için, bir üst klasöre (..) çıkıp views'a bakıyoruz
const viewsPath = path.join(__dirname, '..', 'views');

// Statik dosyaları (CSS, JS) sunmak için
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

// Ana Sayfa (Öğretmen Paneli)
app.get('/', (req, res) => {
    res.sendFile(path.join(viewsPath, 'index.html'));
});

// Ayarlar Sayfası (Okul Sahibi Paneli)
app.get('/ayarlar', (req, res) => {
    res.sendFile(path.join(viewsPath, 'settings.html'));
});

// --- API ROTALARI (Veri İşlemleri) ---

// Sınıfları Getir
app.get('/api/classes', async (req, res) => {
    try {
        const classes = await Class.find();
        res.json(classes);
    } catch (err) {
        res.status(500).json({ error: "Sınıflar getirilemedi" });
    }
});

// Sınıf Ekle
app.post('/api/classes', async (req, res) => {
    try {
        const newClass = await Class.create(req.body);
        res.json(newClass);
    } catch (err) {
        res.status(500).json({ error: "Sınıf eklenemedi" });
    }
});

// Materyal (Lesson) Ekle
app.post('/api/lessons', async (req, res) => {
    try {
        const newLesson = await Lesson.create(req.body);
        res.json(newLesson);
    } catch (err) {
        res.status(500).json({ error: "Materyal eklenemedi" });
    }
});

// Öğrencileri Sınıfa Göre Getir
app.get('/api/students/:classId', async (req, res) => {
    try {
        const students = await Student.find({ currentClass: req.params.classId });
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: "Öğrenciler getirilemedi" });
    }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`🚀 Sunucu v1.0.3 - Port: ${port}`);
    console.log(`📂 Views Klasörü: ${viewsPath}`);
});

// Yeni Öğrenci Ekle
app.post('/api/students', async (req, res) => {
    try {
        const newStudent = await Student.create(req.body);
        res.json(newStudent);
    } catch (err) {
        res.status(500).json({ error: "Öğrenci eklenemedi" });
    }
});