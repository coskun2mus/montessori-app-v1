const express = require('express');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

// Klasör yolları - Görsel dosyalar (logo vb.) için 'public' kullanımı önerilir
const viewsPath = path.join(__dirname, '..', 'views');
app.use(express.static(viewsPath));

// Modeller
const Class = require('./models/Class');
const Student = require('./models/Student');
const Lesson = require('./models/Lesson');
const Observation = require('./models/Observation');

// MONGODB BAĞLANTISI
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Liberum DB Bağlantısı Başarılı!'))
  .catch((err) => console.error('❌ Bağlantı hatası:', err));

// --- SAYFA ROTALARI ---
app.get('/', (req, res) => res.sendFile(path.join(viewsPath, 'index.html')));
app.get('/ayarlar', (req, res) => res.sendFile(path.join(viewsPath, 'settings.html')));
app.get('/raporlar', (req, res) => res.sendFile(path.join(viewsPath, 'reports.html'))); // Raporlar sayfası hazırlığı

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
    const { className } = req.body;
    const exists = await Class.findOne({ className: { $regex: new RegExp(`^${className}$`, 'i') } });
    if (exists) return res.status(400).json({ error: "Bu isimde bir sınıf zaten var!" });

    const newClass = new Class(req.body);
    await newClass.save();
    res.json(newClass);
});

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
        // Sınıfı silmeden önce içinde öğrenci var mı kontrolü (opsiyonel ama güvenli)
        const hasStudent = await Student.findOne({ currentClass: req.params.id });
        if (hasStudent) return res.status(400).json({ error: "Bu sınıfta kayıtlı öğrenciler var. Önce öğrencileri transfer edin!" });

        await Class.findByIdAndDelete(req.params.id);
        res.json({ message: "Sınıf silindi." });
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

// Materyal Ekleme Kontrolü
app.post('/api/lessons', async (req, res) => {
    const { lessonName } = req.body;
    const exists = await Lesson.findOne({ lessonName: { $regex: new RegExp(`^${lessonName}$`, 'i') } });
    if (exists) return res.status(400).json({ error: "Bu materyal zaten sistemde kayıtlı!" });
    
    const newLesson = new Lesson(req.body);
    await newLesson.save();
    res.json(newLesson);
});

app.put('/api/lessons/:id', async (req, res) => {
    try {
        const updatedLesson = await Lesson.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ message: "Güncellendi", data: updatedLesson });
    } catch (err) {
        res.status(500).json({ error: "Güncelleme hatası." });
    }
});

app.delete('/api/lessons/:id', async (req, res) => {
    try {
        await Lesson.findByIdAndDelete(req.params.id);
        res.json({ message: "Silindi" });
    } catch (err) {
        res.status(500).json({ error: "Silme hatası." });
    }
});

// 3. ÖĞRENCİLER
app.get('/api/students/all', async (req, res) => {
    try {
        const students = await Student.find().sort({ firstName: 1 });
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: "Liste alınamadı." });
    }
});

app.get('/api/students/:classId', async (req, res) => {
    try {
        const { classId } = req.params;
        if (classId === 'all') {
            const all = await Student.find().sort({ firstName: 1 });
            return res.json(all);
        }
        
        let query = { 
            $or: [
                { currentClass: classId },
                { currentClass: classId.toString() }
            ] 
        };

        if (mongoose.Types.ObjectId.isValid(classId)) {
            query.$or.push({ currentClass: new ObjectId(classId) });
        }

        const students = await Student.find(query).sort({ firstName: 1 });
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: "Sınıf öğrencileri getirilemedi" });
    }
});

app.post('/api/students', async (req, res) => {
    try { 
        const { firstName, lastName, birthDate } = req.body;
        const exists = await Student.findOne({ 
            firstName: { $regex: new RegExp(`^${firstName.trim()}$`, 'i') }, 
            lastName: { $regex: new RegExp(`^${lastName.trim()}$`, 'i') }, 
            birthDate: new Date(birthDate) 
        });

        if (exists) return res.status(400).json({ error: "Bu öğrenci sistemde zaten kayıtlı!" });

        const newStudent = await Student.create(req.body);
        res.status(201).json(newStudent);
    } catch (err) {
        res.status(500).json({ error: "Kayıt hatası." });
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
        res.json({ message: "Silindi." });
    } catch (err) {
        res.status(500).json({ error: "Silinemedi." });
    }
});

// 4. GÖZLEMLER
app.post('/api/observations', async (req, res) => {
    try {
        const newObservation = await Observation.create(req.body);
        res.status(201).json(newObservation);
    } catch (err) {
        res.status(400).json({ error: "Gözlem kaydedilemedi." });
    }
});

app.get('/api/observations/student/:studentId', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const observations = await Observation.find({ student: req.params.studentId })
            .populate('lesson') 
            .sort({ observationDate: -1 })
            .limit(limit);
        res.json(observations);
    } catch (err) {
        res.status(500).json({ error: "Gözlem geçmişi alınamadı." });
    }
});

// SUNUCU BAŞLATMA
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`🚀 Liberum Montessori Akademia v1.2.0 Port: ${port}`);
});