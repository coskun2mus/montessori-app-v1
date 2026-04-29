require('dotenv').config();
const aiService = require('../src/services/aiService');
const path = require('path');
const fs = require('fs');

async function testImageAnalysis() {
    console.log("🚀 Image Analysis Test started...");
    
    // Create a dummy image file for testing if none exists
    const dummyPath = path.join(__dirname, 'dummy.jpg');
    if (!fs.existsSync(dummyPath)) {
        fs.writeFileSync(dummyPath, Buffer.alloc(100, 0)); // Dummy small file
    }

    try {
        console.log("Testing analyzeImagesWithGemini...");
        // This will likely fail with 400 if the key is expired, but we check if it calls the right endpoint
        const result = await aiService.analyzeImagesWithGemini([dummyPath]);
        console.log("Result:", result);
    } catch (err) {
        console.log("Caught expected or actual error:", err.message);
    } finally {
        if (fs.existsSync(dummyPath)) fs.unlinkSync(dummyPath);
    }
}

testImageAnalysis();
