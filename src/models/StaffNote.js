const mongoose = require('mongoose');

const staffNoteSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    authorName: {
        type: String,
        required: true,
        trim: true
    },
    authorRole: {
        type: String,
        required: true,
        enum: ['Servis', 'Mutfak', 'Yönetim', 'Diğer']
    },
    note: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('StaffNote', staffNoteSchema);
