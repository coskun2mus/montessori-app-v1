const express = require('express');
const mongoose = require('mongoose');
const path = require('path'); // Dosya yolları için gerekli
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('views')); // HTML ve CSS dosyalarını dışarı açar

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
    res.sendFile(path.join(__dirname, '../views/index.html'));
});

// Ayarlar Sayfası (Okul Sahibi Paneli)
app.get('/ayarlar', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/settings.html'));
});

// --- API ROTALARI (Veri İşlemleri) ---

// Sınıfları Getir
app.get('/api/classes', async (req, res) => {
    const classes = await Class.find();
    res.json(classes);
});

// Sınıf Ekle
app.post('/api/classes', async (req, res) => {
    const newClass = await Class.create(req.body);
    res.json(newClass);
});

// Materyal (Lesson) Ekle
app.post('/api/lessons', async (req, res) => {
    const newLesson = await Lesson.create(req.body);
    res.json(newLesson);
});

// Öğrencileri Sınıfa Göre Getir
app.get('/api/students/:classId', async (req, res) => {
    const students = await Student.find({ currentClass: req.params.classId });
    res.json(students);
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Sunucu ${port} üzerinde hazır!`));