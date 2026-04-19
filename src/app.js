const express = require('express');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const app = express();
app.use(express.json());

const aiService = require('./services/aiService');
const reportService = require('./services/reportService');

// Multer klasörü kontrolü
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: uploadDir });

// Klasör yolları - Görsel dosyalar (logo vb.) için 'public' kullanımı önerilir
const viewsPath = path.join(__dirname, '..', 'views');
app.use(express.static(viewsPath));

// Modeller
const Class = require('./models/Class');
const Student = require('./models/Student');
const Lesson = require('./models/Lesson');
const Observation = require('./models/Observation');
const StaffNote = require('./models/StaffNote');

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
        const lessons = await Lesson.find({ isActive: { $ne: false } }).sort({ area: 1, lessonName: 1 });
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
        const lesson = await Lesson.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!lesson) return res.status(404).json({ error: "Materyal bulunamadı." });
        res.json({ message: "Materyal pasife alındı (Soft Delete)." });
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

// --- 4. ORTAM GÖZLEMLERİ (STAFF NOTES) ---
app.post('/api/staff-notes', async (req, res) => {
    try {
        const { student, authorName, authorRole, note } = req.body;
        if (!student || !authorName || !authorRole || !note) {
            return res.status(400).json({ error: "Tüm alanların doldurulması zorunludur." });
        }
        
        const newNote = await StaffNote.create({
            student,
            authorName,
            authorRole,
            note,
            date: new Date()
        });
        
        res.status(201).json(newNote);
    } catch (err) {
        console.error("Staff Note Kayıt Hatası:", err);
        res.status(500).json({ error: "Ortam gözlemi kaydedilemedi." });
    }
});

app.get('/api/staff-notes/student/:studentId', async (req, res) => {
    try {
        const notes = await StaffNote.find({ student: req.params.studentId })
            .populate('student', 'firstName lastName')
            .sort({ date: -1 });
        res.json(notes);
    } catch (err) {
        res.status(500).json({ error: "Gözlemler alınamadı." });
    }
});

app.delete('/api/staff-notes/:id', async (req, res) => {
    try {
        await StaffNote.findByIdAndDelete(req.params.id);
        res.json({ message: "Not silindi." });
    } catch (err) {
        res.status(500).json({ error: "Not silinemedi." });
    }
});

// AI Fotoğraf Analizi Rotası
app.post('/api/observations/ai-analyze', upload.array('photos', 3), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "Lütfen en az bir fotoğraf yükleyin." });
        }

        const filePaths = req.files.map(f => f.path);
        
        // 1. Gemini Analizi
        let aiAnalysis = null;
        try {
            aiAnalysis = await aiService.analyzeImagesWithGemini(filePaths);
        } catch(e) {
            console.error("Gemini Error:", e.message);
            aiAnalysis = { status: "Yönlendirme", successScore: 5.0, notes: "Yapay zeka analizi API Key hataları sebebiyle yapılamadı." };
        }

        // 2. Cloudinary Upload
        const imageUrls = [];
        for (const fp of filePaths) {
            try {
                const url = await aiService.uploadToCloudinary(fp);
                imageUrls.push(url);
            } catch (e) {
                console.error("Cloudinary Error:", e.message);
                imageUrls.push(""); // Fallback empty
            }
        }

        // 3. Geçici dosyaları sil
        filePaths.forEach(fp => fs.unlinkSync(fp));

        res.json({
            aiAnalysis,
            imageUrls
        });
    } catch (err) {
        console.error("AI Analyze Error:", err);
        res.status(500).json({ error: "Analiz sırasında sunucu hatası oluştu." });
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
        const areaMap = {};
        for (const obs of bestObs) {
            const area     = obs.lesson.area || 'Diğer';
            const maxScore = obs.lesson.difficultyLevel || 5;
            // Algoritmanın ürettiği dinamik skoru alıyoruz:
            const dynamicScore = obs.successScore;

            if (!areaMap[area]) areaMap[area] = { total: 0, maxTotal: 0, count: 0, observations: [] };
            areaMap[area].total    += dynamicScore;
            areaMap[area].maxTotal += maxScore;
            areaMap[area].count++;
            
            areaMap[area].observations.push({
                _id:        obs._id,
                lessonName: obs.lesson.lessonName,
                status:     obs.status,
                score:      dynamicScore,
                maxScore,
                date:       obs.observationDate,
                note:       obs.note,
                photos:     obs.photos
            });
        }

        // ── Ağırlıklı başarı oranı: Σscore / ΣmaxScore ───────────────────
        const totalScore = bestObs.reduce((s, o) => s + o.successScore, 0);
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

app.get('/api/observations/:id/detail', async (req, res) => {
    try {
        const obs = await Observation.findById(req.params.id)
            .populate('lesson', 'lessonName')
            .populate('student', 'firstName lastName');
        if (!obs) return res.status(404).json({ error: "Gözlem bulunamadı." });
        res.json(obs);
    } catch (err) {
        res.status(500).json({ error: "Gözlem detayı alınamadı." });
    }
});

// Veli Raporu Ouluşturma (PDF)
app.get('/api/reports/student/:studentId/pdf', async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) {
        return res.status(400).json({ error: "Başlangıç ve bitiş tarihi gereklidir." });
    }
    
    try {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Liberum_Gelisim_Raporu_${req.params.studentId}.pdf"`);
        
        await reportService.generateParentReport(res, req.params.studentId, start, end);
        
    } catch (err) {
        console.error("PDF Generate Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: "PDF raporu oluşturulamadı." });
        }
    }
});

// SUNUCU BAŞLATMA
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`🚀 Liberum Montessori Akademia v1.2.0 Port: ${port}`);
});