const PDFDocument = require('pdfkit');
const aiService = require('./aiService');
const Observation = require('../models/Observation');
const StaffNote = require('../models/StaffNote');
const Student = require('../models/Student');
const path = require('path');
const fs = require('fs');

const FONT_REGULAR_PATH = path.join(__dirname, '../../public/fonts/Roboto-Regular.ttf');
const FONT_BOLD_PATH = path.join(__dirname, '../../public/fonts/Roboto-Bold.ttf');

async function downloadImage(url) {
    if (!url) return null;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Resim indirilemedi.");
        const buffer = await res.arrayBuffer();
        return Buffer.from(buffer);
    } catch (e) {
        console.error("Image fetch error:", e);
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

    // ── 1. FOTOĞRAF SEÇİCİ ALGORİTMA (Maks 5-6 Fotoğraf, alanlara dağıtılmış) ──
    const selectedPhotos = [];
    const photosByArea = {};

    observations.forEach(obs => {
        if (!obs.lesson || !obs.photos || obs.photos.length === 0) return;
        const area = obs.lesson.area;
        if (!photosByArea[area]) photosByArea[area] = [];
        
        // Her observation altındaki resimleri topla
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

    // Her alandan 1 tane alarak dağıt
    const areas = Object.keys(photosByArea);
    let photoCount = 0;
    while (photoCount < 6 && areas.length > 0) {
        for (let i = areas.length - 1; i >= 0; i--) {
            const area = areas[i];
            if (photosByArea[area].length > 0) {
                selectedPhotos.push(photosByArea[area].shift());
                photoCount++;
                if (photoCount >= 6) break;
            } else {
                areas.splice(i, 1);
            }
        }
    }

    // ── 2. ALAN BAZLI BAŞARI ANALİZİ (WSR - Weighted Success Ratio) ──
    const areaStats = {};
    observations.forEach(o => {
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
    }));

    // ── 3. AI İÇİN RAW DATA HAZIRLIĞI (ZENGİNLEŞTİRİLMİŞ) ──
    const rawDataForAI = {
        student: {
            name: `${student.firstName} ${student.lastName}`,
            age: student.ageInMonths ? `${student.ageInMonths} aylık` : 'Bilinmiyor',
            enrollmentDate: student.enrollmentDate
        },
        period: `${start.toLocaleDateString('tr-TR')} - ${end.toLocaleDateString('tr-TR')}`,
        areaSummaries,
        pedagogicalNotes: observations.map(o => ({
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

    // ── 3. AI SENTEZ RAPORU OLUŞTUR ──
    let synthesisText = "";
    try {
        if (observations.length > 0 || staffNotes.length > 0) {
            synthesisText = await aiService.synthesizeReport(rawDataForAI);
        } else {
            synthesisText = "Bu tarih aralığı için sisteme girilmiş herhangi bir materyal çalışması veya personel gözlem notu bulunmamaktadır.";
        }
    } catch (e) {
        synthesisText = "Yapay Zeka değerlendirmesi şu an oluşturulamadı. Lütfen API bağlantılarınızı kontrol edin.";
    }

    // ── 4. PDFKIT REPORT GENERATION ──
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    if (resStream.writableEnded) return;
    
    // Akış (Response) hatasını yakala - Çökmeyi önlemek için kritik!
    resStream.on('error', (err) => {
        console.error("Response Stream Error:", err);
    });

    doc.pipe(resStream);

    // PDFKit Hata Yakalayıcı
    doc.on('error', (err) => {
        console.error("PDFKit Document Error:", err);
    });

    // Font Kaydı ve Fallback Mekanizması
    let FONT_REGULAR = 'Helvetica';
    let FONT_BOLD = 'Helvetica-Bold';

    try {
        if (fs.existsSync(FONT_REGULAR_PATH) && fs.existsSync(FONT_BOLD_PATH)) {
            doc.registerFont('Roboto-Regular', FONT_REGULAR_PATH);
            doc.registerFont('Roboto-Bold', FONT_BOLD_PATH);
            FONT_REGULAR = 'Roboto-Regular';
            FONT_BOLD = 'Roboto-Bold';
        } else {
            console.warn("⚠️ Roboto fontları bulunamadı, Helvetica ile devam ediliyor.");
        }
    } catch (fontErr) {
        console.error("Font registration failed:", fontErr);
    }
    
    // Header
    doc.font(FONT_BOLD).fontSize(26).fillColor('#2D6B4F').text('Liberum Montessori', { align: 'center' });
    doc.font(FONT_REGULAR).fontSize(14).fillColor('#8a8578').text('Dönem Gelişim ve Gözlem Raporu', { align: 'center' });
    doc.moveDown(1.5);

    // Öğrenci Bilgileri
    doc.font(FONT_BOLD).fontSize(16).fillColor('#000000').text(`Öğrenci: ${student.firstName} ${student.lastName}`);
    doc.font(FONT_REGULAR).fontSize(12).fillColor('#555555').text(`Sınıf: ${student.currentClass?.className || 'Belirtilmemiş'}`);
    
    // AI Sentez Değerlendirmesi (Structured Rendering)
    const sections = synthesisText.split(/###\s+/);
    sections.forEach(section => {
        if (!section.trim() || resStream.writableEnded) return;
        const lines = section.split('\n');
        const title = lines[0].replace(/[#*]/g, '').trim();
        const content = lines.slice(1).join('\n').trim();

        if (title) {
            doc.font(FONT_BOLD).fontSize(13).fillColor('#2D6B4F').text(title);
            doc.moveDown(0.3);
        }
        if (resStream.writableEnded) return;
        doc.font(FONT_REGULAR).fontSize(10).fillColor('#333333').text(content, {
            align: 'justify',
            lineGap: 3
        });
        doc.moveDown(1.2);
    });

    // --- ALAN BAZLI İLERLEME ÖZETİ (TABLO BENZERİ) ---
    doc.moveDown(0.5);
    doc.font(FONT_BOLD).fontSize(12).fillColor('#000').text('Gelişim Alanı İlerleme Özeti');
    doc.moveDown(0.5);
    
    areaSummaries.forEach(s => {
        const pct = (s.ratio * 100).toFixed(0);
        const barWidth = 150;
        const fillWidth = (s.ratio * barWidth);
        
        const currentY = doc.y;
        doc.font(FONT_REGULAR).fontSize(10).fillColor('#444').text(s.area, 50, currentY, { width: 100 });
        
        // Progress Bar
        doc.rect(160, currentY, barWidth, 10).fillColor('#eee').fill();
        doc.rect(160, currentY, fillWidth, 10).fillColor('#2D6B4F').fill();
        
        doc.fillColor('#444').text(`%${pct} (${s.count} Çalışma)`, 320, currentY);
        doc.moveDown(0.8);
    });
    doc.moveDown(1);

    // Çalışılan Materyaller (Basit Liste)
    doc.addPage();
    doc.font(FONT_BOLD).fontSize(16).fillColor('#A0522D').text('Dönem İçerisinde Üzerinde Çalışılan Materyaller');
    doc.moveDown(1);
    
    const obsByArea = {};
    observations.forEach(o => {
        if (!o.lesson) return;
        const a = o.lesson.area;
        if (!obsByArea[a]) obsByArea[a] = [];
        obsByArea[a].push(o);
    });

    Object.entries(obsByArea).forEach(([area, obsList]) => {
        const stats = areaSummaries.find(s => s.area === area);
        const ratioPct = stats ? (stats.ratio * 100).toFixed(0) : 0;
        
        doc.font(FONT_BOLD).fontSize(13).fillColor('#6B4C8A').text(`${area} (Gelişim Endeksi: %${ratioPct})`);
        doc.moveDown(0.4);
        
        // Sadece en yüksek statülü gözlemi göster veya master olanları vurgula
        obsList.forEach(o => {
            const isMaster = o.status === 'Ustalaştı';
            doc.font(isMaster ? FONT_BOLD : FONT_REGULAR)
               .fontSize(10)
               .fillColor(isMaster ? '#2D6B4F' : '#444')
               .text(`• ${o.lesson.lessonName} [${o.status}] ${isMaster ? '★' : ''}`);
        });
        doc.moveDown(0.8);
    });

    // Personel Gözlemleri
    if (staffNotes.length > 0) {
        doc.moveDown(1);
        doc.font(FONT_BOLD).fontSize(16).fillColor('#8B6914').text('Okul Personel Gözlemleri');
        doc.moveDown(0.5);
        staffNotes.forEach(n => {
            doc.font(FONT_REGULAR).fontSize(11).fillColor('#555').text(`"${n.note}"`);
            doc.fontSize(9).fillColor('#999').text(`— ${n.authorName} (${n.authorRole}) / ${new Date(n.date).toLocaleDateString('tr-TR')}`);
            doc.moveDown(0.5);
        });
    }

    // Fotoğraf Galerisi
    if (selectedPhotos.length > 0) {
        doc.addPage();
        doc.font(FONT_BOLD).fontSize(16).fillColor('#2D6B4F').text('Çalışma Anlarından Kareler');
        doc.moveDown(1);

        let yPos = doc.y;
        for (let i = 0; i < selectedPhotos.length; i++) {
            if (resStream.writableEnded) break;
            const photo = selectedPhotos[i];
            const buffer = await downloadImage(photo.url);
            
            if (buffer && !resStream.writableEnded) {
                // Her sayfaya 2 resim sığacak şekilde
                if (i > 0 && i % 2 === 0) {
                    doc.addPage();
                    yPos = 50;
                }
                
                try {
                    doc.image(buffer, 50, yPos, { width: 300 });
                    
                    doc.rect(360, yPos, 180, 200).fillColor('#f9f9f9').fill();
                    doc.font(FONT_BOLD).fontSize(11).fillColor('#2D6B4F').text(photo.lessonName, 370, yPos + 15);
                    doc.font(FONT_REGULAR).fontSize(9).fillColor('#666').text(`Aşama: ${photo.aiStatus}`, 370, yPos + 35);
                    
                    const desc = photo.aiStatus === 'Ustalaştı' 
                        ? "Öğrenci bu materyalde tam bağımsızlık kazanmış, hata kontrolünü içselleştirmiş ve rehberlik etme aşamasına gelmiştir."
                        : "Öğrenci materyal ile çalışma döngüsü içerisindedir. Odaklanma ve koordinasyon süreci devam etmektedir.";
                        
                    doc.font(FONT_REGULAR).fontSize(8.5).fillColor('#333').text(desc, 370, yPos + 55, { width: 160, align: 'justify' });
                    
                    yPos += 300; 
                } catch (imgError) {
                    console.error("PDF image add error:", imgError.message);
                }
            }
        }
    }

    doc.end();
}

module.exports = {
    generateParentReport
};
