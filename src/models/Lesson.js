const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    area: {
        type: String,
        required: [true, 'Alan (Duyusal, Matematik vb.) seçilmelidir.'],
        enum: ['Günlük Yaşam', 'Duyusal', 'Dil', 'Matematik', 'Kültür']
    },
    lessonName: {
        type: String,
        required: [true, 'Çalışma adı zorunludur.'],
        trim: true,
        unique: true
    },
    difficultyLevel: {
        type: Number,
        default: 1 // 1-10 arası zorluk puanı
    },
    minAge: {
        type: Number,
        default: null // Materyal için önerilen minimum yaş (ay); ET formülünde A_min olarak kullanılır
    },
    expectedTimeAtMinAge: {
        type: Number,
        default: null // T_ref: minAge anında materyali tamamlamak için beklenen süre (gün)
                      // ET = max(1, T_ref × (minAge/currentAge)³)
    }
}, { timestamps: true });

module.exports = mongoose.model('Lesson', lessonSchema);