require('dotenv').config();
const aiService = require('../src/services/aiService');

/**
 * Montessori AI Synthesis Test Script
 * 
 * Bu script, web sunucusunu başlatmadan Gemini API bağlantısını 
 * ve rapor sentezleme mantığını doğrular.
 */

async function runTest() {
    console.log("🚀 Montessori AI Sentez Testi Başlatılıyor...");
    
    // 1. .env Kontrolü
    if (!process.env.GEMINI_API_KEY) {
        console.error("❌ HATA: GEMINI_API_KEY .env dosyasında bulunamadı!");
        process.exit(1);
    }

    // 2. Mock Veri Hazırlığı (Zenginleştirilmiş Yapı)
    const mockData = {
        student: {
            name: "Test Öğrencisi",
            age: "42 aylık",
            enrollmentDate: "2025-09-01"
        },
        period: "20.04.2026 - 20.05.2026",
        areaSummaries: [
            { area: "Duyusal", ratio: 0.9, count: 5 },
            { area: "Matematik", ratio: 0.65, count: 3 }
        ],
        pedagogicalNotes: [
            { lesson: "Pembe Kule", area: "Duyusal", status: "Ustalaştı", score: 9.5, maxScore: 10, teacherNote: "Dengeli bir çalışma sergiledi. Boyut farklarını hatasız kavrıyor." },
            { lesson: "Silindir Bloklar", area: "Duyusal", status: "Hata Kontrolü", score: 7.0, maxScore: 10, teacherNote: "Görsel ayrıştırmada gelişme var." },
            { lesson: "Sayı Çubukları", area: "Matematik", status: "Yönlendirme", score: 6.0, maxScore: 10, teacherNote: "Miktar kavramına giriş yapıldı." }
        ],
        staffNotes: [
            { author: "Ahmet Bey (Servis)", note: "Bugün serviste çok sakindi, arkadaşlarına yardım etti." }
        ]
    };

    console.log("📤 Mock veriler Gemini'a gönderiliyor...");

    try {
        const startTime = Date.now();
        const result = await aiService.synthesizeReport(mockData);
        const duration = (Date.now() - startTime) / 1000;

        console.log("\n✅ TEST BAŞARILI!");
        console.log(`⏱️ Süre: ${duration} saniye`);
        console.log("--------------------------------------------------");
        console.log("🤖 AI Sentez Raporu:");
        console.log(result);
        console.log("--------------------------------------------------");
        
        // Türkçe karakter kontrolü
        const trChars = /[ğĞüÜşŞıİöÖçÇ]/;
        if (trChars.test(result)) {
            console.log("✨ NOT: Çıktıda Türkçe karakterler mevcut. Roboto fontu sayesinde PDF'de kusursuz görünecek.");
        }

    } catch (error) {
        console.error("❌ TEST BAŞARISIZ!");
        console.error("Hata Detayı:", error.message);
        if (error.message.includes("429")) {
            console.error("💡 İPUCU: Kota dolmuş (Rate Limit). Lütfen biraz bekleyin veya ücretli plana geçin.");
        } else if (error.message.includes("403")) {
            console.error("💡 İPUCU: API Key geçersiz veya sızdırılmış (Leaked).");
        }
    }
}

runTest();
