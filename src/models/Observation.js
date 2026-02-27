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
        type: String,
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
    // startDate      : Materyal ilk "Sunuldu" olarak işaretlendiği tarih
    // completionDate : "Ustalaştı" kaydının tarihi
    // app.js POST handler tarafından otomatik set edilir.
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

// ── Yardımcı: Ay farkı (büyük - küçük tarih) ──────────────────────────────
function monthDiff(laterDate, earlierDate) {
    return (laterDate.getFullYear() - earlierDate.getFullYear()) * 12
         + (laterDate.getMonth()   - earlierDate.getMonth());
}

// ── Yardımcı: Üstel Beklenen Süre (ET v2) — gün cinsinden ─────────────────
// ET = max(1, T_ref × (minAge / currentAge)³)
//
//   T_ref      : lesson.expectedTimeAtMinAge — minAge anındaki referans tamamlanma süresi (gün)
//   minAge     : lesson.minAge (ay)
//   currentAge : çocuğun materyale başladığı andaki yaşı (ay) — startDate'den hesaplanır
//
// Yaş farkı arttıkça ET üstel olarak küçülür (büyük çocuktan daha hızlı beklenir).
// Graceful: T_ref veya minAge yoksa → null döner, vF = 1.0 alınır.
function computeET(T_ref, minAge, currentAge) {
    if (!T_ref || !minAge || !currentAge || currentAge <= 0) return null;
    const ratio = minAge / currentAge;
    return Math.max(1, T_ref * ratio * ratio * ratio);
}

// ── Yardımcı: Hız Faktörü (vF v2) ─────────────────────────────────────────
//
// Erken Sunum (currentAge < minAge):
//   ActualTime ≤ T_ref  → vF = 1.50 (Üstün başarı: maksimum bonus)
//   ActualTime >  T_ref  → vF = 1.00 (Yaşından büyük iş yaptığı için ceza yok)
//
// Normal / Geç Sunum (currentAge >= minAge):
//   vF = clamp(ET / ActualTime, 0.50, 1.50)
//
// Graceful: ActualTime ≤ 0 veya ET null → vF = 1.0
function computeVF(actualTimeDays, ET, T_ref, isEarlyPresentation) {
    if (!actualTimeDays || actualTimeDays <= 0) return 1.0;

    if (isEarlyPresentation) {
        // T_ref referans süresi ile karşılaştır (ET değil)
        return actualTimeDays <= (T_ref || Infinity) ? 1.50 : 1.0;
    }

    if (!ET || ET <= 0) return 1.0;
    return clamp(ET / actualTimeDays, 0.50, 1.50);
}

// ── Yaş/Kıdem/ET/vF Ayarlı Dinamik Başarı Puanı (v2) ─────────────────────
// Gerekli populate: .populate('lesson') + .populate('student', 'birthDate enrollmentDate')
// lesson populate edilmemişse → null
// student populate edilmemişse → D × coeff döner
//
// Adalet Kuralı: Büyük çocuk, kendi ET süresinde bitirdiğinde (vF=1.0),
//   skoru hiçbir zaman baseScore (= D × coeff) altına düşmez.
//   Uygulama: adjustedScore = max(D × coeff, D × coeff × ageFactor × seniorityFactor × vF)
observationSchema.virtual('successScore').get(function () {

    // ── 1. Zorunlu kontrol ─────────────────────────────────────────────────
    if (!this.lesson || typeof this.lesson !== 'object' || !this.lesson.difficultyLevel) {
        return null;
    }

    const D           = this.lesson.difficultyLevel;
    const coefficient = STATUS_COEFFICIENTS[this.status] ?? 0;
    const baseScore   = D * coefficient;  // Adalet Kuralı için taban

    // ── 2. Student populate yoksa düz baseScore döner ─────────────────────
    if (!this.student || typeof this.student !== 'object' ||
        !this.student.birthDate || !this.student.enrollmentDate) {
        return parseFloat(baseScore.toFixed(2));
    }

    // ── 3. ageFactor (şu anki yaşa göre) & seniorityFactor ────────────────
    const now   = new Date();
    const birth = new Date(this.student.birthDate);

    const ageInMonths = monthDiff(now, birth);  // Güncel yaş

    const enrolled       = new Date(this.student.enrollmentDate);
    const monthsInSchool = monthDiff(now, enrolled);

    // ageFactor: referans 54 ay — genç çocuk daha yüksek çarpan alır
    const ageFactor = clamp(ageInMonths > 0 ? 54 / ageInMonths : 1, 0.75, 1.40);

    // seniorityFactor: ilk 6 ayda hız bonusu, sonrası beklenti artar
    const seniorityFactor = clamp(1 + (6 - monthsInSchool) / 24, 0.75, 1.25);

    // ── 4. vF hesabı (yalnızca "Ustalaştı" + tarih verisi varsa) ──────────
    let vF = 1.0; // Default: graceful degradation

    if (this.status === 'Ustalaştı' && this.startDate && this.completionDate) {
        const msPerDay       = 1000 * 60 * 60 * 24;
        const actualTimeDays = Math.max(1,
            (new Date(this.completionDate) - new Date(this.startDate)) / msPerDay
        );

        // currentAge: materyale başladığı andaki yaş (startDate'den hesaplanır)
        const currentAge = monthDiff(new Date(this.startDate), birth);

        const T_ref  = this.lesson.expectedTimeAtMinAge ?? null;
        const minAge = this.lesson.minAge               ?? null;

        const ET               = computeET(T_ref, minAge, currentAge > 0 ? currentAge : ageInMonths);
        const isEarlyPresent   = minAge !== null && currentAge < minAge;

        vF = computeVF(actualTimeDays, ET, T_ref, isEarlyPresent);
    }

    // ── 5. Final Skor — Adalet Kuralı ile ────────────────────────────────
    // adjustedScore = clamp( max(baseScore, D × coeff × ageFactor × seniorityFactor × vF), 0.1, 10.0 )
    const computed  = baseScore * ageFactor * seniorityFactor * vF;
    const justified = Math.max(baseScore, computed);  // Adalet Kuralı: baseScore tabanı

    return parseFloat(clamp(justified, 0.1, 10.0).toFixed(2));
});

module.exports = mongoose.model('Observation', observationSchema);