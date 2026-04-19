require('dotenv').config();
const aiService = require('./src/services/aiService');

const mockData = {
    test: "data",
    lessons: [{name: "Pembe Kule", status: "Ustalaştı"}]
};

aiService.synthesizeReport(mockData)
    .then(res => console.log("SUCCESS:", res))
    .catch(err => console.error("ERROR CAUGHT:", err));
