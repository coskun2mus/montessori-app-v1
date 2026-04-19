const { GoogleGenerativeAI } = require('@google/generative-ai');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const prompts = require('../../config/prompts');

// .env dosyasından anahtarlar beklenir:
// GEMINI_API_KEY, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
} else {
    console.warn("⚠️ UYARI: Cloudinary yapılandırması eksik (.env)");
}

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-3-flash-preview" }) : null;

// Gecikme fonksiyonu (Rate limit: 429 hataları için bekleme)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Retry mekanizmalı jeneratör
async function generateWithRetry(request, retries = 3, delayMs = 2000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const result = await model.generateContent(request);
            return result;
        } catch (error) {
            if (error.status === 429 && attempt < retries) {
                console.warn(`[Gemini API] 429 Too Many Requests. ${attempt}. deneme başarısız. ${delayMs}ms bekleniyor...`);
                await delay(delayMs);
                delayMs *= 2; // Exponential backoff (2s, 4s, 8s)
            } else {
                throw error;
            }
        }
    }
}

// Fotoğrafı base64 formatına çeviren yardımcı (Gemini için)
function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
            mimeType
        },
    };
}

async function uploadToCloudinary(filePath) {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: 'liberum_montessori_sessions'
        });
        return result.secure_url;
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        throw new Error("Görsel buluta yüklenemedi.");
    }
}

async function analyzeImagesWithGemini(filePaths) {
    if (!model) throw new Error("GEMINI_API_KEY tanımlanmamış.");
    
    // Yüklenen dosyaları Gemini formatına dönüştür
    const imageParts = filePaths.map(fp => fileToGenerativePart(fp, 'image/jpeg')); // JPEG/PNG varsayıyoruz
    
    const request = [
        prompts.OBSERVATION_ANALYSIS_PROMPT,
        ...imageParts
    ];

    try {
        const result = await generateWithRetry(request);
        const response = await result.response;
        const text = response.text();
        
        // Gemini'nin döndürdüğü string içerisindeki JSON'u çıkart (eğer backtick kullanmışsa temizleriz)
        const cleanedText = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("Gemini analysis error:", error);
        throw new Error("Yapay Zeka analizi gerçekleştirilemedi.");
    }
}

async function synthesizeReport(rawData) {
    if (!model) throw new Error("GEMINI_API_KEY tanımlanmamış.");
    
    const request = [
        prompts.PARENT_REPORT_SYNTHESIS_PROMPT,
        "AŞAĞIDA ÖĞRENCİNİN VERİLERİ BULUNMAKTADIR:",
        JSON.stringify(rawData, null, 2)
    ];

    try {
        const result = await generateWithRetry(request, 4, 3000); // Rapor sentezinde daha uzun bekle
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("Gemini synthesis error:", error);
        throw new Error("Sentez raporu oluşturulamadı.");
    }
}

module.exports = {
    uploadToCloudinary,
    analyzeImagesWithGemini,
    synthesizeReport
};
