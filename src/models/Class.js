const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
    className: {
        type: String,
        required: [true, 'Sınıf adı zorunludur.'],
        trim: true,
        unique: true // Aynı isimde iki sınıf olamaz (Örn: Kelebekler A, Kelebekler B gibi ayrılmalı)
    },
    teacherName: { 
        type: String, 
        trim: true // Şimdilik sadece isim tutuyoruz, ileride Teacher modeline bağlayabiliriz
    },
    isActive: {
        type: Boolean,
        default: true // Sınıf kapandığında silmek yerine pasife çekebiliriz (Veri güvenliği için)
    }
}, { timestamps: true }); // createdAt ve updatedAt tarihlerini otomatik ekler

module.exports = mongoose.model('Class', classSchema);