const express = require('express');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
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
        const exists = await Class.findOne({ className: req.body.className });
        if (exists) return res.status(400).json({ error: "Bu isimde bir sınıf zaten var!" });

        const newClass = await Class.create(req.body);
        res.status(201).json(newClass);
    } catch (err) {
        res.status(500).json({ error: "Sınıf eklenirken bir hata oluştu." });
    }
});

// Sınıf Güncelleme (Öğretmen ismi değiştirmek için)
app.put('/api/classes/:id', async (req, res) => {
    try {
        const updatedClass = await Class.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedClass);
    } catch (err) {
        res.status(500).json({ error: "Sınıf bilgileri güncellenemedi." });
    }
});

app.delete('/api/classes/:id', async (req, res) => {
    try {
        await Class.findByIdAndDelete(req.params.id);
        res.json({ message: "Sınıf başarıyla silindi." });
    } catch (err) {
        res.status(500).json({ error: "Sınıf silinemedi." });
    }
});

// 2. MATERYALLER (LESSONS)
app.get('/api/lessons', async (req, res) => {
    try {
        const lessons = await Lesson.find().sort({ area: 1, lessonName: 1 });
        res.json(lessons);
    } catch (err) {
        res.status(500).json({ error: "Materyaller getirilemedi" });
    }
});

app.post('/api/lessons', async (req, res) => {
    try {
        const exists = await Lesson.findOne({ lessonName: req.body.lessonName });
        if (exists) return res.status(400).json({ error: "Bu materyal zaten müfredatta var!" });

        const newLesson = await Lesson.create(req.body);
        res.status(201).json(newLesson);
    } catch (err) {
        res.status(500).json({ error: "Materyal eklenemedi." });
    }
});

// 3. ÖĞRENCİLER
// Belirli bir sınıfa göre öğrenciler
// --- 3. ÖĞRENCİLER ---

// ÖNCE BUNU KOY (Sabit rotalar her zaman üstte olmalı)
app.get('/api/students/all', async (req, res) => {
    try {
        const students = await Student.find().sort({ firstName: 1 });
        res.json(students);
    } catch (err) {
        console.error("Tüm öğrenciler çekilirken hata:", err);
        res.status(500).json({ error: "Öğrenci listesi alınamadı." });
    }
});

// SONRA BUNU KOY (Değişkenli/Parametreli rotalar altta olmalı)
app.get('/api/students/:classId', async (req, res) => {
    try {
        const { classId } = req.params;

        // "all" kelimesi yanlışlıkla buraya düşerse koruma
        if (classId === 'all') {
            const all = await Student.find().sort({ firstName: 1 });
            return res.json(all);
        }

        // HEM String olarak HEM de ObjectId olarak arıyoruz ($or operatörü ile)
        // Bu sayede eski kayıtlar da yeni kayıtlar da yakalanır.
        let query = { 
            $or: [
                { currentClass: classId },
                { currentClass: classId.toString() }
            ] 
        };

        // Eğer gelen ID geçerli bir MongoDB ID'siyse, listeye ObjectId halini de ekle
        if (mongoose.Types.ObjectId.isValid(classId)) {
            query.$or.push({ currentClass: new ObjectId(classId) });
        }

        const students = await Student.find(query).sort({ firstName: 1 });
        
        console.log(`Sorgu: ${classId} | Sonuç: ${students.length} öğrenci`);
        res.json(students);
        
    } catch (err) {
        console.error("Öğrenci çekme hatası:", err);
        res.status(500).json({ error: "Sınıf öğrencileri getirilemedi" });
    }
});

app.post('/api/students', async (req, res) => {
    try {
        const { firstName, lastName, birthDate } = req.body;
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
        res.status(500).json({ error: "Öğrenci kaydedilirken hata oluştu." });
    }
});

app.put('/api/students/:id', async (req, res) => {
    try {
        const updatedStudent = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedStudent);
    } catch (err) {
        res.status(500).json({ error: "Öğrenci güncellenemedi." });
    }
});

app.delete('/api/students/:id', async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.json({ message: "Öğrenci kaydı silindi." });
    } catch (err) {
        res.status(500).json({ error: "Öğrenci silinemedi." });
    }
});

// 4. GÖZLEMLER
app.post('/api/observations', async (req, res) => {
    try {
        const newObservation = await Observation.create(req.body);
        res.status(201).json(newObservation);
    } catch (err) {
        res.status(400).json({ error: "Gözlem kaydedilemedi.", details: err.message });
    }
});

// SUNUCU BAŞLATMA
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`🚀 Sunucu v1.1.0 hazır! Port: ${port}`);
});