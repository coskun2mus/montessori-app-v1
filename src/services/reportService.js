const PDFDocument = require('pdfkit');
const aiService = require('./aiService');
const Observation = require('../models/Observation');
const StaffNote = require('../models/StaffNote');
const Student = require('../models/Student');

// PDFKit standart fontlarında WinAnsiEncoding hatasını önlemek için karakter dönüştürücü
function trToEn(text) {
    if (!text) return "";
    return text.toString()
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
        .replace(/ü/g, 'u').replace(/Ü/g, 'U')
        .replace(/ş/g, 's').replace(/Ş/g, 'S')
        .replace(/ı/g, 'i').replace(/İ/g, 'I')
        .replace(/ö/g, 'o').replace(/Ö/g, 'O')
        .replace(/ç/g, 'c').replace(/Ç/g, 'C');
}

async function downloadImage(url) {
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

    // ── 2. AI İÇİN RAW DATA HAZIRLIĞI ──
    const rawDataForAI = {
        student: `${student.firstName} ${student.lastName}`,
        period: `${start.toLocaleDateString('tr-TR')} - ${end.toLocaleDateString('tr-TR')}`,
        pedagogicalNotes: observations.map(o => ({
            lesson: o.lesson?.lessonName,
            status: o.status,
            teacherNote: o.note,
            aiSessionSummary: o.photos[0]?.sessionSummary || ""
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
    doc.pipe(resStream);

    // Fontları tanımla (Türkçe karakter desteği için - sistem fontları kullanılabilir 
    // ama PDFKit dahili Helvetica tr desteklemez, o yüzden dışarıdan ttf veya default destekli basit)
    // Şimdilik Helvetica. tr karakterlerde sorun yaşamamak için encode gerekir ama basic usage.
    // Daha temiz kod için Roboto fontu indirilebilir, ancak şimdilik standart kullanım:
    
    // Header
    doc.fontSize(24).fillColor('#2D6B4F').text(trToEn('Liberum Montessori'), { align: 'center' });
    doc.fontSize(14).fillColor('#8a8578').text(trToEn('Donem Gelisim ve Gozlem Raporu'), { align: 'center' });
    doc.moveDown(1.5);

    // Öğrenci Bilgileri
    doc.fontSize(16).fillColor('#000000').text(trToEn(`Ogrenci: ${student.firstName} ${student.lastName}`));
    doc.fontSize(12).fillColor('#555555').text(trToEn(`Sinif: ${student.currentClass?.className || 'Belirtilmemis'}`));
    doc.text(trToEn(`Tarih Araligi: ${start.toLocaleDateString('tr-TR')} - ${end.toLocaleDateString('tr-TR')}`));
    doc.moveDown(2);

    // AI Sentez Değerlendirmesi
    doc.fontSize(16).fillColor('#2E5A88').text(trToEn('Genel Pedagojik ve Sosyal Degerlendirme'));
    doc.moveDown(0.5);
    
    // tr karakterlerin Helvetica'da çıkması bazen sorun olabilir ama Node 18+ PDFKit çözmüş olabilir.
    // Eğer sorun olursa Roboto .ttf file serve etmek gerekir projeye.
    doc.fontSize(11).fillColor('#333333').text(trToEn(synthesisText), {
        align: 'justify',
        lineGap: 4
    });
    doc.moveDown(2);

    // Çalışılan Materyaller (Basit Liste)
    doc.addPage();
    doc.fontSize(16).fillColor('#A0522D').text(trToEn('Donem Icerisinde Uzerinde Calisilan Materyaller'));
    doc.moveDown(1);
    
    const obsByArea = {};
    observations.forEach(o => {
        if (!o.lesson) return;
        const a = o.lesson.area;
        if (!obsByArea[a]) obsByArea[a] = [];
        obsByArea[a].push(o);
    });

    Object.entries(obsByArea).forEach(([area, obsList]) => {
        doc.fontSize(14).fillColor('#6B4C8A').text(trToEn(`[ ${area} ]`));
        doc.moveDown(0.5);
        obsList.forEach(o => {
            doc.fontSize(11).fillColor('#000').text(trToEn(`• ${o.lesson.lessonName} - Durum: ${o.status}`));
        });
        doc.moveDown(1);
    });

    // Personel Gözlemleri
    if (staffNotes.length > 0) {
        doc.moveDown(1);
        doc.fontSize(16).fillColor('#8B6914').text(trToEn('Okul Personel Gozlemleri'));
        doc.moveDown(0.5);
        staffNotes.forEach(n => {
            doc.fontSize(11).fillColor('#555').text(trToEn(`"${n.note}"`));
            doc.fontSize(9).fillColor('#999').text(trToEn(`— ${n.authorName} (${n.authorRole}) / ${new Date(n.date).toLocaleDateString('tr-TR')}`));
            doc.moveDown(0.5);
        });
    }

    // Fotoğraf Galerisi
    if (selectedPhotos.length > 0) {
        doc.addPage();
        doc.fontSize(16).fillColor('#2D6B4F').text(trToEn('Calisma Anlarindan Kareler'));
        doc.moveDown(1);

        let yPos = doc.y;
        for (let i = 0; i < selectedPhotos.length; i++) {
            const photo = selectedPhotos[i];
            const buffer = await downloadImage(photo.url);
            
            if (buffer) {
                // Her sayfaya 2 resim sığacak şekilde
                if (i > 0 && i % 2 === 0) {
                    doc.addPage();
                    yPos = 50;
                }
                
                try {
                    doc.image(buffer, 50, yPos, { width: 300 });
                    doc.fontSize(10).fillColor('#555').text(trToEn(`${photo.lessonName} (${photo.aiStatus})`), 370, yPos + 20, { width: 150 });
                    yPos += 300; // Sonraki resim için y değerini artır (resim yüksekliğine göre ayarlanabilir)
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
