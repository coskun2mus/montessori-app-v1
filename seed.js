/**
 * Liberum Montessori Akademia — Veritabanı Seed Scripti
 * Kullanım: node seed.js
 *
 * Yapılanlar:
 *  1. MongoDB bağlantısı kurulur (.env veya parametre)
 *  2. classes, students, lessons, observations koleksiyonları temizlenir
 *  3. Tek demo sınıf oluşturulur
 *  4. seed_data.json'dan benzersiz materyal/dersler Lesson koleksiyonuna eklenir
 *  5. 50 öğrenci Student koleksiyonuna eklenir
 *  6. Her gözlem, gerçek student._id + lesson._id ile Observation koleksiyonuna eklenir
 *  7. Bağlantı kapatılır
 */

require('dotenv').config();
const mongoose = require('mongoose');
const seedData = require('./seed_data.json');

// ── MODELLERİ IMPORT ET ──────────────────────────────────────────────────
const Class       = require('./src/models/Class');
const Student     = require('./src/models/Student');
const Lesson      = require('./src/models/Lesson');
const Observation = require('./src/models/Observation');

// ── BAĞLANTI ─────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/montessori';

async function seed() {
    console.log('\n🌱  Liberum Seed Başlatıldı...\n');

    await mongoose.connect(MONGO_URI);
    console.log('✅  MongoDB bağlantısı kuruldu:', MONGO_URI);

    // ── 1. TEMİZLİK ──────────────────────────────────────────────────────
    console.log('\n🗑   Eski veriler temizleniyor...');
    await Promise.all([
        Observation.deleteMany({}),
        Student.deleteMany({}),
        Lesson.deleteMany({}),
        Class.deleteMany({}),
    ]);
    console.log('    ✓ observations, students, lessons, classes → boşaltıldı');

    // ── 2. DEMO SINIF ─────────────────────────────────────────────────────
    console.log('\n🏫  Demo sınıf oluşturuluyor...');
    const demoClass = await Class.create({
        className:   'Kelebekler',
        teacherName: 'Arzu Hoca',
        isActive:    true,
    });
    console.log('    ✓ Sınıf:', demoClass.className, '→', demoClass._id);

    // ── 3. BENZERSİZ MATERYALLERİ LESSON KOLEKSIYONUNA EKLE ──────────────
    console.log('\n📚  Materyaller (Lessons) oluşturuluyor...');

    // Aynı lessonName+category combinasyonunu bir kez al
    const uniqueLessons = [];
    const seen = new Set();
    for (const row of seedData) {
        const key = `${row.lessonName}|${row.category}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueLessons.push({
                lessonName:      row.lessonName,
                area:            row.category,
                difficultyLevel: row.difficulty,
            });
        }
    }

    const insertedLessons = await Lesson.insertMany(uniqueLessons);
    console.log(`    ✓ ${insertedLessons.length} benzersiz materyal eklendi`);

    // Hızlı arama için harita: "lessonName|area" → Lesson._id
    const lessonMap = {};
    insertedLessons.forEach(l => {
        lessonMap[`${l.lessonName}|${l.area}`] = l._id;
    });

    // ── 4. ÖĞRENCİLERİ EKLE ──────────────────────────────────────────────
    console.log('\n👶  Öğrenciler oluşturuluyor...');

    // seed_data'dan benzersiz öğrencileri çıkar
    const studentMap_seed = {}; // seedStudentId → Student dokümanı
    const uniqueStudents  = [];
    const seenStudents    = new Set();

    for (const row of seedData) {
        if (!seenStudents.has(row.studentId)) {
            seenStudents.add(row.studentId);
            const [firstName, ...lastParts] = row.name.split(' ');
            const lastName = lastParts.join(' ') || 'Bilinmiyor';
            uniqueStudents.push({
                _seedId:        row.studentId,   // geçici alan, DB'ye gitmez
                firstName,
                lastName,
                birthDate:      new Date(row.birthDate),
                enrollmentDate: new Date(row.enrollmentDate),
                currentClass:   demoClass._id,
                status:         'Aktif',
            });
        }
    }

    // _seedId Mongoose şemasında yok — insertMany öncesi çıkar
    const studentDocs = uniqueStudents.map(({ _seedId, ...rest }) => rest);
    const insertedStudents = await Student.insertMany(studentDocs);
    console.log(`    ✓ ${insertedStudents.length} öğrenci eklendi`);

    // seed studentId → gerçek MongoDB _id eşlemesi
    const seedIds    = uniqueStudents.map(s => s._seedId);
    const realIds    = insertedStudents.map(s => s._id);
    const studentMap = {};
    seedIds.forEach((sid, i) => { studentMap[sid] = realIds[i]; });

    // ── 5. GÖZLEMLERİ EKLE ───────────────────────────────────────────────
    console.log('\n🔍  Gözlemler oluşturuluyor...');

    const observationDocs = [];
    let skipped = 0;

    for (const row of seedData) {
        const studentId = studentMap[row.studentId];
        const lessonId  = lessonMap[`${row.lessonName}|${row.category}`];

        if (!studentId || !lessonId) {
            skipped++;
            continue;
        }

        observationDocs.push({
            student:         studentId,
            lesson:          lessonId,
            teacherName:     'Arzu Hoca',
            status:          row.status,
            observationDate: new Date(row.observationDate),
            note:            '',
        });
    }

    await Observation.insertMany(observationDocs);
    console.log(`    ✓ ${observationDocs.length} gözlem eklendi${skipped ? ` (${skipped} atlandı)` : ''}`);

    // ── ÖZET ──────────────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════');
    console.log('🎉  Seed tamamlandı!');
    console.log(`    Sınıf        : 1`);
    console.log(`    Öğrenci      : ${insertedStudents.length}`);
    console.log(`    Materyal     : ${insertedLessons.length}`);
    console.log(`    Gözlem       : ${observationDocs.length}`);
    console.log('══════════════════════════════════════════\n');

    await mongoose.disconnect();
    console.log('🔌  Bağlantı kapatıldı. İyi çalışmalar!\n');
}

seed().catch(err => {
    console.error('\n❌  Seed başarısız:', err.message);
    mongoose.disconnect();
    process.exit(1);
});
