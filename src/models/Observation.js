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
        default: Date.now
    },
    // ── Zaman Takibi (ET/vF hesabı için) ──────────────────────────────────
    // startDate      : Bu materyal için ilk "Sunuldu" kaydının tarihi
    // completionDate : "Ustalaştı" kaydının tarihi
    // app.js POST handler tarafından otomatik set edilir;
    // virtual içinde populate bağımlılığı olmadan erişilebilir.
    startDate: {
        type: Date,
        default: null
    },
    completionDate: {
        type: Date,
        default: null
    },
    note: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true }
});

// ── Status Katsayıları ─────────────────────────────────────────────────────
const STATUS_COEFFICIENTS = {
    'Sunuldu':       0.1,
    'Yönlendirme':   0.4,
    'Hata Kontrolü': 0.7,
    'Ustalaştı':     1.0
};

// ── Yardımcı: clamp ────────────────────────────────────────────────────────
const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

// ── Yardımcı: Dinamik Beklenen Süre (ET) — gün cinsinden ──────────────────
// ET = (D² / (A - Amin + 1)) × K
//   D    : zorluk seviyesi (1-10)
//   A    : çocuğun yaşı (ay)
//   Amin : materyalin minimum önerilen yaşı (ay); yoksa 36 default
//   K    : global ivme sabiti (7 gün)
function computeET(D, A, Amin, K = 7) {
    const effectiveAmin = Amin ?? 36;          // minAge yoksa 36 ay default
    const denominator   = Math.max(1, A - effectiveAmin + 1);
    return (D * D / denominator) * K;
}

// ── Yardımcı: Hız Faktörü (vF) ────────────────────────────────────────────
// Yalnızca statü "Ustalaştı" olduğunda çağrılır.
//
// Erken sunum (A < Amin):
//   ActualTime ≤ ET  →  vF = 1.50 (sabit üstün başarı)
//   ActualTime >  ET  →  vF = clamp(ET/AT, 0.75, 1.50) (bilişsel hazırlık sinyali)
//
// Normal / Geç sunum (A >= Amin):
//   vF = clamp(ET/AT, 0.50, 1.50)
function computeVF(actualTimeDays, ET, isEarlyPresentation) {
    if (!actualTimeDays || actualTimeDays <= 0 || !ET || ET <= 0) return 1.0;

    if (isEarlyPresentation) {
        if (actualTimeDays <= ET) return 1.50;
        return clamp(ET / actualTimeDays, 0.75, 1.50);
    }
    return clamp(ET / actualTimeDays, 0.50, 1.50);
}

// ── Yaş/Kıdem + ET/vF Ayarlı Dinamik Başarı Puanı ─────────────────────────
// Gerekli populate'lar: .populate('lesson') + .populate('student', 'birthDate enrollmentDate')
// lesson populate edilmemişse   → null (güvenli çıkış)
// student populate edilmemişse  → sadece baseScore × statusCoef döner
observationSchema.virtual('successScore').get(function () {

    // ── 1. Zorunlu kontrol: lesson populate ───────────────────────────────
    if (!this.lesson || typeof this.lesson !== 'object' || !this.lesson.difficultyLevel) {
        return null;
    }

    const D           = this.lesson.difficultyLevel;
    const coefficient = STATUS_COEFFICIENTS[this.status] ?? 0;
    const baseScore   = D * coefficient;

    // ── 2. Student populate edilmemişse düz baseScore döner ───────────────
    if (!this.student || typeof this.student !== 'object' ||
        !this.student.birthDate || !this.student.enrollmentDate) {
        return parseFloat(baseScore.toFixed(2));
    }

    // ── 3. ageFactor & seniorityFactor (mevcut mantık korunuyor) ──────────
    const now = new Date();

    const birth       = new Date(this.student.birthDate);
    const ageInMonths = (now.getFullYear() - birth.getFullYear()) * 12
                      + (now.getMonth()   - birth.getMonth());

    const enrolled       = new Date(this.student.enrollmentDate);
    const monthsInSchool = (now.getFullYear() - enrolled.getFullYear()) * 12
                         + (now.getMonth()    - enrolled.getMonth());

    // ageFactor: referans 54 ay (4,5 yaş) — daha genç → daha yüksek çarpan
    const rawAge    = ageInMonths > 0 ? 54 / ageInMonths : 1;
    const ageFactor = clamp(rawAge, 0.75, 1.40);

    // seniorityFactor: ilk 6 ayda hız bonusu, sonrası beklenti artar
    const rawSen         = 1 + (6 - monthsInSchool) / 24;
    const seniorityFactor = clamp(rawSen, 0.75, 1.25);

    // ── 4. Statüye göre hesaplama dalı ────────────────────────────────────
    if (this.status !== 'Ustalaştı') {
        // Çalışma devam ediyor: vF uygulanmaz
        const adjusted = baseScore * ageFactor * seniorityFactor;
        return parseFloat(clamp(adjusted, 0.01, 10.0).toFixed(2));
    }

    // ── 5. "Ustalaştı" dalı: ET + vF hesabı ───────────────────────────────
    const Amin = this.lesson.minAge ?? null;  // null ise computeET içinde 36 default

    // ActualTime: startDate → completionDate arası gün farkı
    let vF = 1.0; // Graceful degradation: tarih eksikse vF=1.0
    if (this.startDate && this.completionDate) {
        const msPerDay       = 1000 * 60 * 60 * 24;
        const actualTimeDays = Math.max(1,
            (new Date(this.completionDate) - new Date(this.startDate)) / msPerDay
        );
        const ET                = computeET(D, ageInMonths, Amin);
        const isEarlyPresent    = Amin !== null && ageInMonths < Amin;
        vF = computeVF(actualTimeDays, ET, isEarlyPresent);
    }

    // baseScore "Ustalaştı" için difficultyLevel × 1.0 = D
    const adjustedMastered = D * ageFactor * seniorityFactor * vF;
    return parseFloat(clamp(adjustedMastered, 0.1, 10.0).toFixed(2));
});

module.exports = mongoose.model('Observation', observationSchema);