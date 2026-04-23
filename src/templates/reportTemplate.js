// src/templates/reportTemplate.js
// Veli PDF Raporu - HTML Şablonu (Puppeteer ile üretilir)

function buildReportHTML({ student, period, synthesisText, areaSummaries, obsByArea, staffNotes, photoDataList }) {

    // Alan renk haritası
    const AREA_COLORS = {
        'Günlük Yaşam': '#8B6914',
        'Duyusal':      '#A0522D',
        'Dil':          '#2E5A88',
        'Matematik':    '#2D6B4F',
        'Kültür':       '#6B4C8A',
        'Diğer':        '#8a8578',
    };

    const AREA_ICONS = {
        'Günlük Yaşam': '🏡',
        'Duyusal':      '🎨',
        'Dil':          '📖',
        'Matematik':    '🔢',
        'Kültür':       '🌍',
        'Diğer':        '📌',
    };

    const STATUS_COLORS = {
        'Ustalaştı':     '#2D6B4F',
        'Hata Kontrolü': '#8B6914',
        'Yönlendirme':   '#2E5A88',
        'Sunuldu':       '#888',
    };

    // AI metnini HTML'e dönüştür
    function markdownToHTML(text) {
        if (!text) return '';
        return text
            .replace(/###\s+(.*)/g, '<h3 class="section-title">$1</h3>')
            .replace(/##\s+(.*)/g, '<h2 class="section-title-lg">$1</h2>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n{2,}/g, '</p><p class="body-text">')
            .replace(/\n/g, '<br>')
            .replace(/^(.+)/, '<p class="body-text">$1</p>');
    }

    // İlerleme çubukları
    const progressBarsHTML = areaSummaries.map(s => {
        const pct = Math.round(s.ratio * 100);
        const color = AREA_COLORS[s.area] || '#888';
        const icon = AREA_ICONS[s.area] || '📌';
        return `
        <div class="progress-row">
            <div class="progress-label">
                <span class="area-icon">${icon}</span>
                <span class="area-name">${s.area}</span>
                <span class="area-count">${s.count} materyal</span>
            </div>
            <div class="progress-bar-wrap">
                <div class="progress-bar-fill" style="width:${pct}%; background:${color};"></div>
            </div>
            <span class="progress-pct" style="color:${color};">%${pct}</span>
        </div>`;
    }).join('');

    // Materyal listesi
    const materialsHTML = Object.entries(obsByArea).map(([area, obsList]) => {
        const color = AREA_COLORS[area] || '#888';
        const icon = AREA_ICONS[area] || '📌';
        const stats = areaSummaries.find(s => s.area === area);
        const pct = stats ? Math.round(stats.ratio * 100) : 0;

        const items = obsList.map(o => {
            const statusColor = STATUS_COLORS[o.status] || '#888';
            const isMaster = o.status === 'Ustalaştı';
            return `
            <div class="material-row ${isMaster ? 'material-master' : ''}">
                <span class="material-name">${isMaster ? '★ ' : ''}${o.lesson?.lessonName || '—'}</span>
                <span class="material-status" style="color:${statusColor}; border-color:${statusColor};">${o.status}</span>
            </div>`;
        }).join('');

        return `
        <div class="area-card" style="border-left-color: ${color};">
            <div class="area-card-header">
                <span style="font-size:1.4rem;">${icon}</span>
                <div>
                    <div class="area-card-title" style="color:${color};">${area}</div>
                    <div class="area-card-sub">Gelişim Endeksi: %${pct}</div>
                </div>
            </div>
            <div class="materials-list">${items}</div>
        </div>`;
    }).join('');

    // Personel notları
    const staffHTML = staffNotes.length > 0 ? `
        <div class="section staff-section">
            <h2 class="section-header">👥 Okul Personel Gözlemleri</h2>
            ${staffNotes.map(n => `
            <div class="staff-note">
                <p class="staff-text">"${n.note}"</p>
                <p class="staff-author">— ${n.authorName} (${n.authorRole}) · ${new Date(n.date).toLocaleDateString('tr-TR')}</p>
            </div>`).join('')}
        </div>` : '';

    // Fotoğraf galerisi
    const photosHTML = photoDataList.length > 0 ? `
        <div class="section">
            <h2 class="section-header">📸 Çalışma Anlarından Kareler</h2>
            <div class="photo-grid">
                ${photoDataList.map(p => `
                <div class="photo-card">
                    <img src="${p.dataUrl}" class="photo-img" alt="${p.lessonName}" />
                    <div class="photo-info">
                        <div class="photo-lesson">${p.lessonName}</div>
                        <div class="photo-status">${p.aiStatus}</div>
                    </div>
                </div>`).join('')}
            </div>
        </div>` : '';

    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Liberum Montessori — Veli Raporu</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #fff; color: #222; font-size: 13px; line-height: 1.7; }

    /* Header */
    .header { background: linear-gradient(135deg, #1a4731 0%, #2D6B4F 60%, #3a8a66 100%); color: white; padding: 40px 50px 30px; }
    .header-logo { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; opacity: 0.75; margin-bottom: 8px; }
    .header-title { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
    .header-sub { font-size: 13px; opacity: 0.8; }
    .header-meta { margin-top: 20px; display: flex; gap: 30px; }
    .header-meta-item { font-size: 12px; opacity: 0.85; }
    .header-meta-item strong { font-size: 14px; opacity: 1; display: block; }

    /* Sections */
    .section { padding: 30px 50px; border-bottom: 1px solid #f0ede8; }
    .section:last-child { border-bottom: none; }
    .section-header { font-size: 16px; font-weight: 700; color: #1a4731; margin-bottom: 18px; padding-bottom: 8px; border-bottom: 2px solid #e8f5ee; }
    .section-title { font-size: 13px; font-weight: 700; color: #2D6B4F; margin: 16px 0 6px; }
    .section-title-lg { font-size: 15px; font-weight: 700; color: #1a4731; margin: 20px 0 8px; }
    .body-text { color: #444; margin-bottom: 10px; text-align: justify; }

    /* Progress bars */
    .progress-section { padding: 25px 50px; background: #fafaf8; border-bottom: 1px solid #f0ede8; }
    .progress-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .progress-label { display: flex; align-items: center; gap: 8px; width: 200px; flex-shrink: 0; }
    .area-icon { font-size: 16px; }
    .area-name { font-weight: 600; font-size: 12px; color: #333; }
    .area-count { font-size: 10px; color: #999; margin-left: 4px; }
    .progress-bar-wrap { flex: 1; background: #eee; border-radius: 99px; height: 10px; overflow: hidden; }
    .progress-bar-fill { height: 100%; border-radius: 99px; transition: width 0.3s; }
    .progress-pct { font-weight: 700; font-size: 12px; width: 38px; text-align: right; flex-shrink: 0; }

    /* Area cards */
    .materials-section { padding: 30px 50px; }
    .area-card { border-left: 4px solid #2D6B4F; background: #fafaf8; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-bottom: 16px; }
    .area-card-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
    .area-card-title { font-size: 14px; font-weight: 700; }
    .area-card-sub { font-size: 11px; color: #888; margin-top: 2px; }
    .materials-list { display: flex; flex-direction: column; gap: 5px; }
    .material-row { display: flex; align-items: center; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f0ede8; }
    .material-row:last-child { border-bottom: none; }
    .material-name { font-size: 12px; color: #444; }
    .material-master .material-name { font-weight: 700; color: #2D6B4F; }
    .material-status { font-size: 10px; font-weight: 600; border: 1px solid; border-radius: 99px; padding: 2px 8px; }

    /* Staff notes */
    .staff-section { background: #fdf9f0; }
    .staff-note { background: white; border-left: 3px solid #8B6914; padding: 12px 16px; border-radius: 0 6px 6px 0; margin-bottom: 10px; }
    .staff-text { font-style: italic; color: #555; margin-bottom: 4px; }
    .staff-author { font-size: 10px; color: #999; }

    /* Photos */
    .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .photo-card { border-radius: 8px; overflow: hidden; border: 1px solid #e8e8e8; }
    .photo-img { width: 100%; height: 160px; object-fit: cover; display: block; }
    .photo-info { padding: 8px 10px; background: #fafafa; }
    .photo-lesson { font-size: 11px; font-weight: 600; color: #333; }
    .photo-status { font-size: 10px; color: #888; margin-top: 2px; }

    /* Footer */
    .footer { background: #1a4731; color: rgba(255,255,255,0.6); text-align: center; padding: 16px; font-size: 10px; }

    /* AI Synthesis */
    .ai-section { padding: 30px 50px; }
    .ai-badge { display: inline-flex; align-items: center; gap: 6px; background: #e8f5ee; color: #2D6B4F; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 4px 10px; border-radius: 99px; margin-bottom: 16px; }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
    <div class="header-logo">Liberum Montessori Akademia</div>
    <div class="header-title">Dönem Gelişim Raporu</div>
    <div class="header-sub">Veli Bilgilendirme Belgesi</div>
    <div class="header-meta">
        <div class="header-meta-item">
            <strong>${student.name}</strong>
            Öğrenci
        </div>
        <div class="header-meta-item">
            <strong>${student.className || 'Belirtilmemiş'}</strong>
            Sınıf
        </div>
        <div class="header-meta-item">
            <strong>${period}</strong>
            Dönem
        </div>
        <div class="header-meta-item">
            <strong>${student.age || '—'}</strong>
            Yaş
        </div>
    </div>
</div>

<!-- AI SENTEZİ -->
<div class="ai-section">
    <div class="ai-badge">🤖 Yapay Zeka Pedagojik Değerlendirmesi</div>
    <h2 class="section-header">Pedagojik Gelişim Analizi</h2>
    <div>${markdownToHTML(synthesisText)}</div>
</div>

<!-- ALAN BAZLI İLERLEME -->
<div class="progress-section">
    <h2 class="section-header" style="padding: 0 0 8px 0; margin-bottom: 18px;">📊 Alan Bazlı Gelişim Endeksi</h2>
    ${progressBarsHTML}
</div>

<!-- MATERYAL LİSTESİ -->
<div class="materials-section">
    <h2 class="section-header">📚 Dönem İçerisinde Üzerinde Çalışılan Materyaller</h2>
    ${materialsHTML}
</div>

${staffHTML}
${photosHTML}

<!-- FOOTER -->
<div class="footer">
    Liberum Montessori Akademia · Bu rapor yapay zeka destekli pedagojik değerlendirme sistemi tarafından oluşturulmuştur. · ${new Date().toLocaleDateString('tr-TR')}
</div>

</body>
</html>`;
}

module.exports = { buildReportHTML };
