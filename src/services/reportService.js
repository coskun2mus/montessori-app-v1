const aiService = require('./aiService');
const Observation = require('../models/Observation');
const StaffNote = require('../models/StaffNote');
const Student = require('../models/Student');
const { buildReportHTML } = require('../templates/reportTemplate');

// Ortama göre puppeteer yükleme
async function getBrowser() {
    const isCloudRun = process.env.K_SERVICE; // Cloud Run bu env var'ı otomatik set eder

    if (isCloudRun) {
        const chromium = require('@sparticuz/chromium');
        const puppeteer = require('puppeteer-core');
        return puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });
    } else {
        // Yerel geliştirme: puppeteer-core yeterli, chrome'u sistem chromium'u ile aç
        const puppeteer = require('puppeteer-core');
        // Windows ve Mac için yaygın Chrome konumları
        const executablePath =
            process.env.CHROME_PATH ||
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        return puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            executablePath,
            headless: true,
        });
    }
}

async function downloadImageAsDataUrl(url) {
    if (!url) return null;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        // Content-Type tahmin et (Cloudinary genellikle JPEG döner)
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        return `data:${contentType};base64,${base64}`;
    } catch (e) {
        console.error("Image fetch error:", e.message);
        return null;
    }
}

async function generateParentReport(resStream, studentId, startDate, endDate) {
    const student = await Student.findById(studentId).populate('currentClass');
    if (!student) throw new Error("Öğrenci bulunamadı.");

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const observations = await Observation.find({
        student: studentId,
        observationDate: { $gte: start, $lte: end }
    }).populate('lesson', 'lessonName area difficultyLevel');

    const staffNotes = await StaffNote.find({
        student: studentId,
        date: { $gte: start, $lte: end }
    });

    // ── Her materyal için tek gözlem: en yüksek statüyü al ──
    // (Uygulama paneli ile tutarlı olması için)
    const STATUS_RANK = { 'Sunuldu': 1, 'Yönlendirme': 2, 'Hata Kontrolü': 3, 'Ustalaştı': 4 };
    const lessonBest = {};
    for (const obs of observations) {
        if (!obs.lesson) continue;
        const lid = obs.lesson._id.toString();
        if (!lessonBest[lid]) { lessonBest[lid] = obs; continue; }
        const cur  = STATUS_RANK[obs.status] ?? 0;
        const best = STATUS_RANK[lessonBest[lid].status] ?? 0;
        if (cur > best || (cur === best && (obs.successScore || 0) > (lessonBest[lid].successScore || 0))) {
            lessonBest[lid] = obs;
        }
    }
    const deduped = Object.values(lessonBest);

    // ── 1. ALAN BAZLI BAŞARI ANALİZİ ──
    const areaStats = {};
    deduped.forEach(o => {
        if (!o.lesson) return;
        const area = o.lesson.area || 'Diğer';
        if (!areaStats[area]) areaStats[area] = { totalScore: 0, totalMax: 0, count: 0 };
        areaStats[area].totalScore += (o.successScore || 0);
        areaStats[area].totalMax += (o.lesson.difficultyLevel || 5);
        areaStats[area].count++;
    });

    const areaSummaries = Object.entries(areaStats).map(([area, stats]) => ({
        area,
        ratio: stats.totalMax > 0 ? (stats.totalScore / stats.totalMax) : 0,
        count: stats.count
    })).sort((a, b) => b.ratio - a.ratio);

    // ── 2. MATERYALLER (ALAN BAZINDA GRUPLANDİRİLMİŞ) ──
    const obsByArea = {};
    deduped.forEach(o => {
        if (!o.lesson) return;
        const a = o.lesson.area || 'Diğer';
        if (!obsByArea[a]) obsByArea[a] = [];
        obsByArea[a].push(o);
    });

    // ── 3. FOTOĞRAFLAR (Max 6, alan başına 1) ──
    const photosByArea = {};
    observations.forEach(obs => {
        if (!obs.lesson || !obs.photos || obs.photos.length === 0) return;
        const area = obs.lesson.area;
        if (!photosByArea[area]) photosByArea[area] = [];
        obs.photos.forEach(sess => {
            if (sess.images && sess.images.length > 0) {
                photosByArea[area].push({
                    url: sess.images[0].url,
                    lessonName: obs.lesson.lessonName,
                    aiStatus: sess.images[0].aiAnalysis?.status || obs.status
                });
            }
        });
    });

    const rawPhotos = [];
    const areaKeys = Object.keys(photosByArea);
    while (rawPhotos.length < 6 && areaKeys.length > 0) {
        for (let i = areaKeys.length - 1; i >= 0; i--) {
            const area = areaKeys[i];
            if (photosByArea[area].length > 0) {
                rawPhotos.push(photosByArea[area].shift());
                if (rawPhotos.length >= 6) break;
            } else {
                areaKeys.splice(i, 1);
            }
        }
    }

    // Fotoğrafları base64'e dönüştür (HTML'de <img src="data:..."> olarak gömülecek)
    const photoDataList = [];
    for (const photo of rawPhotos) {
        const dataUrl = await downloadImageAsDataUrl(photo.url);
        if (dataUrl) {
            photoDataList.push({ ...photo, dataUrl });
        }
    }

    // ── 4. AI SENTEZİ ──
    let synthesisText = "";
    try {
        if (deduped.length > 0 || staffNotes.length > 0) {
            const rawDataForAI = {
                student: {
                    name: `${student.firstName} ${student.lastName}`,
                    age: student.ageInMonths ? `${student.ageInMonths} aylık` : 'Bilinmiyor',
                    enrollmentDate: student.enrollmentDate
                },
                period: `${start.toLocaleDateString('tr-TR')} - ${end.toLocaleDateString('tr-TR')}`,
                areaSummaries,
                pedagogicalNotes: deduped.map(o => ({
                    lesson: o.lesson?.lessonName,
                    area: o.lesson?.area,
                    status: o.status,
                    score: o.successScore,
                    maxScore: o.lesson?.difficultyLevel,
                    teacherNote: o.note,
                    aiInsights: o.photos[0]?.images[0]?.aiAnalysis?.pedagogicalInsights || ""
                })),
                staffNotes: staffNotes.map(n => ({
                    author: `${n.authorName} (${n.authorRole})`,
                    note: n.note
                }))
            };
            synthesisText = await aiService.synthesizeReport(rawDataForAI);
        } else {
            synthesisText = "Bu tarih aralığı için sisteme girilmiş herhangi bir materyal çalışması veya personel gözlem notu bulunmamaktadır.";
        }
    } catch (e) {
        console.error("AI synthesis error:", e);
        synthesisText = "Yapay Zeka değerlendirmesi şu an oluşturulamadı. Pedagojik veriler aşağıda listelenmiştir.";
    }

    // ── 5. HTML → PDF (PUPPETEER) ──
    const html = buildReportHTML({
        student: {
            name: `${student.firstName} ${student.lastName}`,
            className: student.currentClass?.className || 'Belirtilmemiş',
            age: student.ageInMonths ? `${Math.floor(student.ageInMonths / 12)} yaş ${student.ageInMonths % 12} ay` : '—'
        },
        period: `${start.toLocaleDateString('tr-TR')} – ${end.toLocaleDateString('tr-TR')}`,
        synthesisText,
        areaSummaries,
        obsByArea,
        staffNotes,
        photoDataList
    });

    let browser;
    try {
        browser = await getBrowser();
        const page = await browser.newPage();

        // Google Fonts için network izni ver
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });

        if (resStream.writableEnded) return;
        resStream.end(pdfBuffer);

    } catch (err) {
        console.error("Puppeteer PDF Error:", err);
        if (!resStream.writableEnded) {
            resStream.destroy(err);
        }
        throw err;
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { generateParentReport };
