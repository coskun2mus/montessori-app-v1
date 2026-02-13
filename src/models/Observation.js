const mongoose = require('mongoose');

const observationSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    lesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        required: true
    },
    teacherName: {
        type: String, // O anki girişi yapan öğretmenin adı
        required: true
    },
    status: {
        type: String,
        enum: ['Sunuldu', 'Çalışıyor', 'Hata Kontrolü', 'Ustalaştı'],
        required: true
    },
    observationDate: {
        type: Date,
        default: Date.now // Okul sahibinin istediği tarih damgası burası!
    },
    note: {
        type: String,
        trim: true // Öğretmenin o anki özel bir gözlemi (Örn: "Bugün çok odaklıydı")
    }
}, { timestamps: true });

module.exports = mongoose.model('Observation', observationSchema);