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
    enrollmentDate: {
        type: Date,
        default: Date.now // Okula başladığı tarih
    },
    gender: {
        type: String,
        enum: ['Kız', 'Erkek', 'Diğer']
    },
    // Sınıf Bağlantısı (İlişkisel yapı)
    currentClass: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class', // Class modeline referans veriyoruz
        required: [true, 'Öğrenci mutlaka bir sınıfa atanmalıdır.']
    },
    montessoriExperience: {
        type: Boolean,
        default: false // Öncesinde Montessori eğitimi almış mı?
    },
    status: {
        type: String,
        enum: ['Aktif', 'Mezun', 'Ayrıldı'],
        default: 'Aktif'
    },
    notes: {
        type: String,
        trim: true
    }
}, { timestamps: true });

// Sanal Alan: Çocuğun anlık yaşını hesaplar (Veritabanına kaydetmez, çağırdığında hesaplar)
studentSchema.virtual('ageInMonths').get(function() {
    const now = new Date();
    const diff = now.getTime() - this.birthDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44)); // Ay cinsinden yaş
});

module.exports = mongoose.model('Student', studentSchema);