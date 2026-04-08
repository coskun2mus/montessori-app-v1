---
name: Montessori ET Research Integration
description: Yeni bir Expected Time (ET) modeli ve formülü simüle edildiğinde bu optimizasyonu asıl projeye entegre eden standartlaştırılmış süreci gerçekleştirir.
---

# ET Araştırma Modeli (Research) Entegrasyon Süreci

Hızlı ve sistemli bir şekilde Montessori projesindeki araştırma testlerini (`et_*.js`) kod tabanına uyarlamak için her seferinde şu adımları uygula:

1. **Analiz Fazı**: 
   Çalışma klasöründeki untracked `et_*.js` (ör: `et_vX_optimization.js`) dosyalarını tara. Optimizasyon formülünü (üstel, kübik veya yeni sabitler) tespit et.

2. **Model Entegrasyonu (`src/models/Observation.js`)**:
   Bulunan yeni ET formülünü ve katsayılarını (K sabitleri, Alfa/Pedagojik vites vb.) `Observation.js` içindeki `computeET` (veya ilgili hesaplama metoduna) adapte et.

3. **Veri Modeli (Schema) Güncellemesi**:
   Gerekiyorsa `Lesson.js` veya `Student.js` şemalarına yeni eklenen sabitleri (örn: `alfa`) ekle ve default değerleri tanımla.

4. **Dosya Alanı Düzenleme & Temizlik**:
   Projeyi kirletmemek adına tüm `et_*` ile başlayan untracked araştırma script'lerini, HTML raporlarını ve JSON output'larını `et_research_files/` klasörüne taşı (Move-Item).

5. **Track Koruması (`.gitignore`)**:
   `et_research_files/` klasörünün GitHub havuzunu şişirmemesi için klasör ismini `.gitignore` dosyasına ekle.
