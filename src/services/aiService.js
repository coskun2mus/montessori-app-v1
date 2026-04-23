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

async function analyzeObservationImage(imagePath, promptType = 'GENERAL_OBSERVATION') {
    if (!model) throw new Error("Gemini API is not configured.");
    
    try {
        const imageData = fs.readFileSync(imagePath);
        const base64Image = imageData.toString('base64');

        const prompt = prompts[promptType] || prompts.GENERAL_OBSERVATION;
        
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/jpeg"
                }
            }
        ]);

        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini Vision Error:", error);
        throw error;
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
    analyzeObservationImage,
    synthesizeReport
};
