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

    // 2. Mock Veri Hazırlığı
    const mockData = {
        student: "Test Öğrencisi",
        period: "20.04.2026 - 20.05.2026",
        pedagogicalNotes: [
            { lesson: "Pembe Kule", status: "Ustalaştı", teacherNote: "Dengeli bir çalışma sergiledi." },
            { lesson: "Silindir Bloklar", status: "Yönlendirme", teacherNote: "Odaklanma artırılmalı." }
        ],
        staffNotes: [
            { author: "Ahmet Bey (Servis)", note: "Bugün serviste çok sakindi." }
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
        
        // Türkçe karakter kontrolü (PDF güvenliği için)
        const trChars = /[ğĞüÜşŞıİöÖçÇ]/;
        if (trChars.test(result)) {
            console.log("⚠️ NOT: Çıktıda Türkçe karakterler mevcut. PDF motorunda trToEn() kullanıldığından emin olun.");
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
