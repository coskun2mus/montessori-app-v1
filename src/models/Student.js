const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'Öğrenci adı zorunludur.'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Öğrenci soyadı zorunludur.'],
        trim: true
    },
    birthDate: {
        type: Date,
        required: [true, 'Doğum tarihi başarı analizi için kritiktir.']
    },
    // enrollmentDate: default'u kaldırıp required yapmak daha güvenli olabilir
    // Çünkü raporlama için bu tarihin net olması lazım.
    enrollmentDate: {
        type: Date,
        required: [true, 'Okula başlama tarihi raporlama için zorunludur.']
    },
    gender: {
        type: String,
        enum: ['Kız', 'Erkek', 'Diğer'],
        required: false 
    },
    currentClass: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class', 
        required: [true, 'Öğrenci mutlaka bir sınıfa atanmalıdır.']
    },
    notes: {
        type: String,
        trim: true,
        default: "" 
    },
    status: {
        type: String,
        enum: ['Aktif', 'Mezun', 'Ayrıldı'],
        default: 'Aktif'
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true }, 
    toObject: { virtuals: true } 
});

// Mükerrer Kayıt Koruması
studentSchema.index({ firstName: 1, lastName: 1, birthDate: 1 }, { unique: true });

// Yaş hesaplama (Ay olarak)
studentSchema.virtual('ageInMonths').get(function() {
    if (!this.birthDate) return null;
    const now = new Date();
    const birth = new Date(this.birthDate);
    return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
});

// OKULDA GEÇİRDİĞİ SÜRE (Yeni Virtual - Raporlar için çok işine yarayacak)
// Çocuğun kaç aydır bu Montessori okulunda olduğunu hesaplar.
studentSchema.virtual('monthsInSchool').get(function() {
    if (!this.enrollmentDate) return null;
    const now = new Date();
    const start = new Date(this.enrollmentDate);
    return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
});

module.exports = mongoose.model('Student', studentSchema);