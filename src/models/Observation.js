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
}, {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true }
});

// Status → Başarı Katsayısı Haritası
const STATUS_COEFFICIENTS = {
    'Sunuldu':       0.1,
    'Çalışıyor':     0.4,
    'Hata Kontrolü': 0.7,
    'Ustalaştı':     1.0
};

// Dinamik Başarı Puanı
// Çalışması için sorgu katmanında .populate('lesson') gereklidir.
// populate yapılmamışsa null döner (sessiz, güvenli hata).
observationSchema.virtual('successScore').get(function () {
    if (!this.lesson || typeof this.lesson !== 'object' || !this.lesson.difficultyLevel) {
        return null;
    }
    const coefficient = STATUS_COEFFICIENTS[this.status] ?? 0;
    return parseFloat((this.lesson.difficultyLevel * coefficient).toFixed(2));
});

module.exports = mongoose.model('Observation', observationSchema);