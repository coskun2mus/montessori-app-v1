const fs = require('fs');
const path = require('path');
const { Types: { ObjectId } } = require('mongoose');

const newId = () => new ObjectId().toString();

// ── VERİ HAVUZU ───────────────────────────────────────────
const firstNames = ['Ali', 'Ayşe', 'Mehmet', 'Zeynep', 'Mustafa', 'Fatma', 'Ahmet', 'Elif', 'Emir', 'Defne', 'Can', 'Duru', 'Deniz', 'Ece', 'Kerem', 'Ceren', 'Mert', 'Doğa', 'Arda', 'Ada', 'Alp', 'Nehir', 'Kaan', 'Aslı', 'Emre', 'İpek', 'Ege', 'Naz', 'Burak', 'Ela', 'Caner', 'Selin'];
const lastNames = ['Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Özdemir', 'Öztürk', 'Aydın', 'Özkan', 'Kurt', 'Arslan', 'Polat', 'Doğan', 'Kılıç', 'Çetin', 'Özer', 'Şen', 'Yalçın', 'Tekin', 'Aksoy', 'Ercan', 'Koç', 'Bulut', 'Aslan'];

const materialNames = {
  'Günlük Yaşam': ['Kaşıkla Aktarma', 'Süngerle Su Aktarma', 'Kuru Dökme', 'Düğme İliği', 'Ayakkabı Boyama', 'Masa Yıkama', 'Çiçek Düzenleme', 'Kurdele Bağlama', 'Fermuar Çalışması', 'Cımbızla Aktarma', 'Damlalıkla Su Aktarma', 'Mandal Takma', 'Sehpa Silme', 'Sebze Kesme', 'El Yıkama', 'Kilit Açma', 'Zımpara Yapma', 'Boncuk Dizme', 'Örgü Örme', 'Bez Katlama', 'Cam Silme', 'Havuç Soyma', 'Bulaşık Yıkama', 'Kemer Tokası', 'Ayakkabı Bağcığı'],
  'Duyusal': ['Pembe Kule', 'Kahverengi Merdiven', 'Kırmızı Çubuklar', 'Renk Tabletleri (1-3)', 'Geometrik Çekmeceler', 'Dokunma Tabletleri', 'Ağırlık Tabletleri', 'Isı Tüpleri', 'Koku Tüpleri', 'Ses Kutuları', 'Binom Küpü', 'Trinom Küpü', 'Düğmesiz Silindirler', 'Tutamaklı Silindirler', 'Geometrik Cisimler', 'Kumaş Eşleştirme', 'Renkli Silindirler', 'Yapıcı Üçgenler', 'Gizemli Torba', 'Kaba ve İnce Zımpara', 'Barik Tabletler', 'Termik Tabletler', 'Renk Skalası', 'Boyut Sıralama', 'Şekil Eşleştirme'],
  'Dil': ['Zımpara Harfler', 'Hareketli Alfabe', 'Metal İnsertler', 'Nesne-Kelime Eşleştirme', 'Sır Dosyası', 'Kelime Çiftlikleri', 'Hece Kutuları', 'Cümle Analizi Kutusu', 'Sessiz Okuma Kartları', 'Hikaye Anlatma Sepeti', 'Fonetik Nesneler', 'Parmak Oyunları', 'Şiir Kitabı', 'Kelime Kavanozu', 'Ünlü/Ünsüz Ayrımı', 'Kafiye Eşleştirme', 'Soru Cümlesi Kurma', 'Anlam Zıtlıkları', 'Eş Anlamlılar', 'Kelime Ailesi', 'Ses Farkındalığı', 'Öykü Dizme', 'Görsel Okuma', 'İlk Okuma Kitapları', 'Heceleme Oyunu'],
  'Matematik': ['Sayı Çubukları', 'Zımpara Sayılar', 'Mekik Kutusu', 'Sayılar ve Pullar', 'Seguin Tablaları (10-19)', 'Seguin Tablaları (11-99)', 'Boncuk Merdiveni (1-9)', 'Altın Boncuk Sistemi', 'Uzun Bölme Tahtası', 'Çarpma Tahtası', 'Toplama Yılan Oyunu', 'Çıkarma Yılan Oyunu', 'Kesir Halkaları', 'Çarpma Boncuk Kutusu', 'Damga Oyunu', 'Yüzlük Tablo', 'Nokta Oyunu', 'Çarpma Panosu', 'Çıkarma Panosu', 'Toplama Panosu', 'Ondalık Sistem Tepsi', 'Atlamalı Sayma Zincirleri', 'Pisagor Tablosu', 'Sayı Sıralama', 'Miktar Eşleştirme'],
  'Kültür': ['Dünya Yapboz Haritası', 'Kıtalar Haritası', 'Ülkeler Haritası', 'Bayraklar', 'Hayvanlar Alemi Klasörleri', 'Omurgalı/Omurgasız Kartları', 'Bitki Yapbozu', 'Çiçek Yapbozu', 'Ağaç Yapbozu', 'Kök/Gövde/Yaprak İncelemesi', 'Yer Biçimleri Model Tepsileri', 'Güneş Sistemi Modeli', 'Saat Okuma', 'Zaman Çizgisi', 'Mevsim Çarkı', 'Yanardağ Deneyi', 'Su Döngüsü', 'Mıknatıs Deneyi', 'Batma/Çıkma Deneyi', 'İnsan Vücudu Yapbozu', 'İskelet Sistemi', 'Yaşam Döngüsü', 'Gölgelerin Eşleştirilmesi', 'Pusula Kullanımı', 'Dinozorlar ve Fosiller']
};

const outputDir = path.join(__dirname, 'simulation_data');

// 1. SINIFLARI OKU (Böylece ID'ler korunacak)
if (!fs.existsSync(path.join(outputDir, 'classes.json'))) {
  console.error("HATA: classes.json bulunamadı. Lütfen önce ilk verileri tam üretin.");
  process.exit(1);
}
const classes = JSON.parse(fs.readFileSync(path.join(outputDir, 'classes.json'), 'utf-8'));

// 2. ÖĞRENCİ ÜRETİMİ (100 Kişi, Realistic Names)
const students = [];
const startRange = new Date('2023-01-01').getTime();
const endRange = new Date('2026-02-01').getTime();

for (let i = 0; i < 100; i++) {
  const currentAgeMonths = Math.floor(Math.random() * (72 - 30 + 1)) + 30; // 30-72 months
  const now = new Date();
  const birthDate = new Date(now.setMonth(now.getMonth() - currentAgeMonths));

  const enrollmentTime = startRange + Math.random() * (endRange - startRange);
  const enrollmentDate = new Date(enrollmentTime);
  
  const assignedClass = classes[Math.floor(Math.random() * classes.length)];
  const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lName = lastNames[Math.floor(Math.random() * lastNames.length)];

  students.push({
    _id: newId(),
    firstName: fName,
    lastName: lName,
    birthDate: birthDate,
    enrollmentDate: enrollmentDate,
    gender: Math.random() > 0.5 ? 'Kız' : 'Erkek',
    currentClass: assignedClass._id,
    status: 'Aktif',
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

// 3. MATERYAL ÜRETİMİ (Gerçek İsimler, 125 Materyal)
const areas = Object.keys(materialNames);
const materials = [];

areas.forEach(area => {
  materialNames[area].forEach((mName, i) => {
    const diff = Math.floor(Math.random() * 10) + 1; // 1-10
    const minAge = Math.floor(Math.random() * (60 - 30 + 1)) + 30; // 30-60
    const baseDays = 10 + (diff * 10);
    const expectedTime = Math.floor(baseDays + Math.random() * 20 - 10);

    materials.push({
      _id: newId(),
      area: area,
      lessonName: mName,
      difficultyLevel: diff,
      minAge: minAge,
      expectedTimeAtMinAge: expectedTime,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });
});

// 4. GÖZLEM ÜRETİMİ (Realistic Distributions)
const observations = [];
const statuses = ['Sunuldu', 'Yönlendirme', 'Hata Kontrolü', 'Ustalaştı'];

students.forEach(student => {
  const enrollmentMs = new Date(student.enrollmentDate).getTime();
  const todayMs = new Date().getTime();
  const studentFullName = `${student.firstName} ${student.lastName}`;
  const teacherName = classes.find(c => c._id === student.currentClass).teacherName;

  areas.forEach(area => {
    const areaMaterials = materials.filter(m => m.area === area);
    const selectedCount = Math.floor(Math.random() * 4) + 4; // 4 to 7 materials per area per student
    const selected = areaMaterials.sort(() => 0.5 - Math.random()).slice(0, selectedCount);

    selected.forEach(mat => {
      const startMs = enrollmentMs + Math.random() * (todayMs - enrollmentMs) * 0.8;
      
      const scenarioRand = Math.random();
      let durationMs = mat.expectedTimeAtMinAge * 24 * 60 * 60 * 1000;
      if (scenarioRand < 0.33) durationMs *= 0.5; // Hızlı
      else if (scenarioRand > 0.66) durationMs *= 2.0; // Yavaş

      // NOT ALWAYS 100%!
      // Let's decide how far the student got on this specific material.
      // 40% chance they Mastered it (4 steps). 30% Hata Kontrolü (3 steps). 20% Yönlendirme (2). 10% Sunuldu (1).
      const progressRand = Math.random();
      let stepsToTake = 4;
      if (progressRand < 0.10) stepsToTake = 1;
      else if (progressRand < 0.30) stepsToTake = 2;
      else if (progressRand < 0.60) stepsToTake = 3;

      const stepMs = durationMs / 3; 

      for (let idx = 0; idx < stepsToTake; idx++) {
        const obsTime = new Date(startMs + (idx * stepMs));
        const status = statuses[idx];

        // Ensure we don't log observations in the future
        if (obsTime.getTime() > todayMs) break;

        observations.push({
          _id: newId(),
          student: student._id,
          studentName: studentFullName, // Added for JSON clarity
          lesson: mat._id,
          lessonName: mat.lessonName,   // Added for JSON clarity
          teacherName: teacherName,
          status: status,
          observationDate: obsTime,
          startDate: new Date(startMs),
          completionDate: status === 'Ustalaştı' ? obsTime : null,
          note: `Senaryo: ${scenarioRand < 0.33 ? 'Hızlı' : scenarioRand < 0.66 ? 'Normal' : 'Yavaş'}`,
          createdAt: obsTime,
          updatedAt: obsTime
        });
      }
    });
  });
});

fs.writeFileSync(path.join(outputDir, 'materials.json'), JSON.stringify(materials, null, 2));
fs.writeFileSync(path.join(outputDir, 'students.json'), JSON.stringify(students, null, 2));
fs.writeFileSync(path.join(outputDir, 'observations.json'), JSON.stringify(observations, null, 2));

console.log('✅ Simülasyon Verileri (Realistik) Başarıyla Oluşturuldu!');
console.log(`- Öğrenciler: ${students.length}`);
console.log(`- Materyaller: ${materials.length}`);
console.log(`- Gözlemler: ${observations.length}`);
