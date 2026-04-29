const { GoogleGenerativeAI } = require('@google/generative-ai');
const cloudinary = require('cloudinary').v2;
const prompts = require('../../config/prompts');
const fs = require('fs');

if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const modelName = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
const model = genAI ? genAI.getGenerativeModel({ model: modelName }) : null;

async function analyzeImagesWithGemini(filePaths) {
    if (!model) throw new Error("Gemini API is not configured.");
    
    try {
        const imageParts = filePaths.map(path => ({
            inlineData: {
                data: fs.readFileSync(path).toString('base64'),
                mimeType: "image/jpeg"
            }
        }));

        const prompt = prompts.OBSERVATION_ANALYSIS_PROMPT;
        
        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        let text = response.text().trim();
        
        // Markdown backticks temizleme (eğer varsa)
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini Vision Error:", error);
        throw error;
    }
}

async function uploadToCloudinary(filePath) {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(filePath, { folder: 'montessori_observations' }, (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
        });
    });
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
    analyzeImagesWithGemini,
    uploadToCloudinary,
    synthesizeReport
};
