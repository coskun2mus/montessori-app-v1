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
if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log('✅ Liberum DB Bağlantısı Başarılı!'))
        .catch((err) => console.error('❌ Bağlantı hatası:', err));
} else {
    console.warn('⚠️  UYARI: Mongo URI bulunamadı, bulut ortamı bekleniyor.');
}

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
    try {
        const { className } = req.body;
        // Case-insensitive (Büyük/Küçük harf duyarsız) kontrol
        const exists = await Class.findOne({ className: { $regex: new RegExp(`^${className.trim()}$`, 'i') } });
        if (exists) return res.status(400).json({ error: `"${className}" isimli bir sınıf zaten mevcut!` });

        const newClass = await Class.create(req.body);
        res.status(201).json(newClass);
    } catch (err) {
        res.status(500).json({ error: "Sınıf eklenirken bir hata oluştu." });
    }
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

app.post('/api/lessons', async (req, res) => {
    try {
        const { lessonName } = req.body;
        const exists = await Lesson.findOne({ lessonName: { $regex: new RegExp(`^${lessonName.trim()}$`, 'i') } });
        if (exists) return res.status(400).json({ error: `"${lessonName}" müfredatta zaten kayıtlı!` });

        const newLesson = await Lesson.create(req.body);
        res.status(201).json(newLesson);
    } catch (err) {
        res.status(500).json({ error: "Materyal eklenemedi." });
    }
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

app.post('/api/observations', async (req, res) => {
    try {
        const { student, lesson, status } = req.body;

        // Mükerrer Kayıt Kontrolü:
        const existing = await Observation.findOne({ student, lesson, status });
        if (existing) {
            return res.status(400).json({
                error: `Bu öğrenci için "${status}" durumu zaten kaydedilmiş. Tekrar kayıt yapılamaz.`
            });
        }

        const data = { ...req.body };

        // ── Zaman Takibi: startDate / completionDate ──────────────────────
        if (status === 'Sunuldu') {
            // İlk sunum → startDate bu anki zaman
            data.startDate = new Date();

        } else if (status === 'Ustalaştı') {
            // Tamamlandı → completionDate bu anki zaman
            data.completionDate = new Date();

            // startDate: aynı öğrenci + aynı materyal için en eski "Sunuldu" kaydından al
            const sunulduRecord = await Observation.findOne(
                { student, lesson, status: 'Sunuldu' },
                { startDate: 1, observationDate: 1 }
            ).sort({ observationDate: 1 });

            if (sunulduRecord) {
                // startDate alanı set edilmişse onu, yoksa observationDate'i kullan
                data.startDate = sunulduRecord.startDate || sunulduRecord.observationDate;
            }
            // startDate bulunamadıysa vF graceful degradation ile 1.0 kabul edilir
        }

        const newObservation = await Observation.create(data);
        res.status(201).json(newObservation);

    } catch (err) {
        console.error("Gözlem Kayıt Hatası:", err);
        res.status(400).json({ error: "Gözlem kaydedilemedi. Lütfen tüm alanları kontrol edin." });
    }
});

app.get('/api/observations/student/:studentId', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const observations = await Observation.find({ student: req.params.studentId })
            .populate('lesson')
            .populate('student', 'birthDate enrollmentDate')
            .sort({ observationDate: -1 })
            .limit(limit);
        res.json(observations);
    } catch (err) {
        res.status(500).json({ error: "Gözlem geçmişi alınamadı." });
    }
});

// Alan bazlı başarı özeti — Materyal başına en iyi gözlem baz alınır
app.get('/api/observations/student/:studentId/area-summary', async (req, res) => {
    try {
        const observations = await Observation.find({ student: req.params.studentId })
            .populate('lesson')
            .populate('student', 'birthDate enrollmentDate');

        const valid = observations.filter(o =>
            o.lesson && typeof o.lesson === 'object' && o.successScore !== null
        );

        // ── Her materyal için en yüksek statülü gözlemi seç ──────────────
        const STATUS_RANK = { 'Sunuldu': 1, 'Yönlendirme': 2, 'Hata Kontrolü': 3, 'Ustalaştı': 4 };
        const lessonBest = {};
        for (const obs of valid) {
            const lid = obs.lesson._id.toString();
            if (!lessonBest[lid]) { lessonBest[lid] = obs; continue; }
            const cur = STATUS_RANK[obs.status] ?? 0;
            const best = STATUS_RANK[lessonBest[lid].status] ?? 0;
            if (cur > best || (cur === best && obs.successScore > lessonBest[lid].successScore)) {
                lessonBest[lid] = obs;
            }
        }
        const bestObs = Object.values(lessonBest);

        // ── Alan bazında gruplama (maxScore = difficultyLevel) ────────────
        const STATUS_COEFF = { 'Sunuldu': 0.1, 'Yönlendirme': 0.4, 'Hata Kontrolü': 0.7, 'Ustalaştı': 1.0 };
        const areaMap = {};
        for (const obs of bestObs) {
            const area     = obs.lesson.area || 'Diğer';
            const maxScore = obs.lesson.difficultyLevel || 5;
            const rawScore = maxScore * (STATUS_COEFF[obs.status] || 0.1);
            if (!areaMap[area]) areaMap[area] = { total: 0, maxTotal: 0, count: 0, observations: [] };
            areaMap[area].total    += rawScore;
            areaMap[area].maxTotal += maxScore;
            areaMap[area].count++;
            areaMap[area].observations.push({
                lessonName: obs.lesson.lessonName,
                status:     obs.status,
                score:      parseFloat(rawScore.toFixed(2)),
                maxScore,
                date:       obs.observationDate
            });
        }

        // ── Ağırlıklı başarı oranı: Σscore / ΣmaxScore ───────────────────
        const totalScore = bestObs.reduce((s, o) => s + ((o.lesson.difficultyLevel || 5) * (STATUS_COEFF[o.status] || 0.1)), 0);
        const totalMax   = bestObs.reduce((s, o) => s + (o.lesson.difficultyLevel || 5), 0);
        const weightedSuccessRatio = totalMax > 0
            ? parseFloat((totalScore / totalMax).toFixed(4)) : 0;

        const summary = Object.entries(areaMap).map(([area, d]) => {
            const avgScore    = parseFloat((d.total    / d.count).toFixed(2));
            const maxAvgScore = parseFloat((d.maxTotal / d.count).toFixed(2));
            return {
                area, avgScore, maxAvgScore,
                successRatio: maxAvgScore > 0 ? parseFloat((avgScore / maxAvgScore).toFixed(4)) : 0,
                count: d.count,
                observations: d.observations.sort((a, b) => new Date(b.date) - new Date(a.date))
            };
        }).sort((a, b) => b.successRatio - a.successRatio);

        res.json({
            studentId: req.params.studentId,
            totalObservations: valid.length,
            totalMaterials: bestObs.length,
            weightedSuccessRatio,
            summary
        });
    } catch (err) {
        res.status(500).json({ error: "Alan özeti alınamadı." });
    }
});

// SUNUCU BAŞLATMA
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`🚀 Liberum Montessori Akademia v1.2.0 Port: ${port}`);
});