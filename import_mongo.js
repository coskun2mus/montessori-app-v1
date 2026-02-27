const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Class = require('./src/models/Class');
const Student = require('./src/models/Student');
const Lesson = require('./src/models/Lesson');
const Observation = require('./src/models/Observation');

async function importData() {
    // Check if MONGO_URI is set
    if (!process.env.MONGO_URI) {
        console.error("❌ HATA: Lütfen projenin ana dizininde bir .env dosyası oluşturun ve içerisine MONGO_URI bağlantınızı ekleyin.");
        console.error("Örnek .env içeriği: MONGO_URI=mongodb+srv://kullanici:sifre@cluster.mongodb.net/liberum");
        process.exit(1);
    }

    try {
        console.log("⏳ MongoDB'ye bağlanılıyor...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB'ye başarıyla bağlanıldı!");

        // 1. Önceki verileri temizle (İsteğe bağlı, çakışmayı önlemek için)
        console.log("🧹 Mevcut veriler temizleniyor (Sınıflar, Materyaller, Öğrenciler, Gözlemler)...");
        await Class.deleteMany({});
        await Student.deleteMany({});
        await Lesson.deleteMany({});
        await Observation.deleteMany({});
        console.log("✅ Veriler temizlendi.");

        const dataPath = path.join(__dirname, 'simulation_data');
        
        // 2. JSON Dosyalarını Oku
        const classes = JSON.parse(fs.readFileSync(path.join(dataPath, 'classes.json'), 'utf-8'));
        const materials = JSON.parse(fs.readFileSync(path.join(dataPath, 'materials.json'), 'utf-8'));
        const students = JSON.parse(fs.readFileSync(path.join(dataPath, 'students.json'), 'utf-8'));
        const observations = JSON.parse(fs.readFileSync(path.join(dataPath, 'observations.json'), 'utf-8'));

        // 3. Mongoose Model Kullanarak Ekle (Bu işlem String ID'leri otomatik ObjectId'ye ve ISO tarihleri Date objesine dönüştürür)
        console.log("📥 Sınıflar ekleniyor...");
        await Class.insertMany(classes);
        console.log(`✅ Sınıflar eklendi (${classes.length})`);

        console.log("📥 Materyaller ekleniyor...");
        await Lesson.insertMany(materials);
        console.log(`✅ Materyaller eklendi (${materials.length})`);

        console.log("📥 Öğrenciler ekleniyor...");
        await Student.insertMany(students);
        console.log(`✅ Öğrenciler eklendi (${students.length})`);

        console.log("📥 Gözlemler ekleniyor... (Bu biraz sürebilir, ~9700 kayıt)");
        await Observation.insertMany(observations);
        console.log(`✅ Gözlemler eklendi (${observations.length})`);

        console.log("🎉 Başarılı! Tüm simülasyon verileri MongoDB'ye Mongoose veri tipleriyle entegre edildi.");
        process.exit(0);

    } catch (err) {
        console.error("❌ Veri aktarımında hata oluştu:", err);
        process.exit(1);
    }
}

importData();
