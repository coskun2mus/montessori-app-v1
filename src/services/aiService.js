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
        const result = await model.generateContent(request);
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
        const result = await model.generateContent(request);
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
