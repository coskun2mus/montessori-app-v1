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
        default: null // Materyal için önerilen minimum yaş (ay cinsinden); ET formülünde A_min olarak kullanılır
    }
}, { timestamps: true });

module.exports = mongoose.model('Lesson', lessonSchema);