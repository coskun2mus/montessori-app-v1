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
    // Okula Başlama Tarihi (Senin özel isteğin)
    enrollmentDate: {
        type: Date,
        default: Date.now 
    },
    gender: {
        type: String,
        enum: ['Kız', 'Erkek', 'Diğer'],
        required: false // Opsiyonel
    },
    currentClass: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class', 
        required: [true, 'Öğrenci mutlaka bir sınıfa atanmalıdır.']
    },
    // Opsiyonel Not Alanı (Senin özel isteğin)
    notes: {
        type: String,
        trim: true,
        default: "" // Boş bırakılabilir
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

// Aynı sınıfa aynı isim-soyisimle mükerrer kaydı engeller
studentSchema.index({ firstName: 1, lastName: 1, birthDate: 1 }, { unique: true });

// Yaş hesaplama (Virtual)
studentSchema.virtual('ageInMonths').get(function() {
    if (!this.birthDate) return null;
    const now = new Date();
    const birth = new Date(this.birthDate);
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    return months >= 0 ? months : 0;
});

module.exports = mongoose.model('Student', studentSchema);