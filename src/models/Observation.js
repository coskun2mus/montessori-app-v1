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
        enum: ['Sunuldu', 'Yönlendirme', 'Hata Kontrolü', 'Ustalaştı'],
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
    'Yönlendirme':   0.4,
    'Hata Kontrolü': 0.7,
    'Ustalaştı':     1.0
};

// Yaş/Kıdem Ayarlı Dinamik Başarı Puanı
// Gerekli populate'lar: .populate('lesson') + .populate('student', 'birthDate enrollmentDate')
// lesson populate edilmemişse → null (güvenli çıkış)
// student populate edilmemişse → baseScore döner (geriye dönük uyumlu)
observationSchema.virtual('successScore').get(function () {
    if (!this.lesson || typeof this.lesson !== 'object' || !this.lesson.difficultyLevel) {
        return null;
    }

    const coefficient = STATUS_COEFFICIENTS[this.status] ?? 0;
    const baseScore   = this.lesson.difficultyLevel * coefficient;

    // Student populate edilmemişse düz baseScore döner
    if (!this.student || typeof this.student !== 'object' ||
        !this.student.birthDate || !this.student.enrollmentDate) {
        return parseFloat(baseScore.toFixed(2));
    }

    // ── Ham tarih aritmetiği (populate nesnesinde virtual çalışmaz) ──
    const now = new Date();

    const birth        = new Date(this.student.birthDate);
    const ageInMonths  = (now.getFullYear() - birth.getFullYear()) * 12
                       + (now.getMonth() - birth.getMonth());

    const enrolled           = new Date(this.student.enrollmentDate);
    const monthsInSchool     = (now.getFullYear() - enrolled.getFullYear()) * 12
                             + (now.getMonth() - enrolled.getMonth());

    // ── ageFactor: referans 54 ay (4,5 yaş) ──
    // Daha genç → daha yüksek çarpan (aynı materyali bitirmek daha etkileyici)
    const rawAge   = ageInMonths > 0 ? 54 / ageInMonths : 1;
    const ageFactor = Math.min(1.40, Math.max(0.75, rawAge));

    // ── seniorityFactor: ilk 6 ayda hız bonusu, sonrası beklenti artar ──
    const rawSen         = 1 + (6 - monthsInSchool) / 24;
    const seniorityFactor = Math.min(1.25, Math.max(0.75, rawSen));

    // ── Nihai puan: [0.01, 10.00] aralığında sınırlanır ──
    const adjusted = baseScore * ageFactor * seniorityFactor;
    return parseFloat(Math.min(10, Math.max(0.01, adjusted)).toFixed(2));
});

module.exports = mongoose.model('Observation', observationSchema);