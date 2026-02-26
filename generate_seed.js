/**
 * Liberum Montessori — Demo Veri Üretici
 * Referans tarih: 20 Şubat 2026
 * Çıktı: seed_data.json (tek düz gözlem dizisi)
 */

const fs = require('fs');

// ── SABİTLER ──────────────────────────────────────────────────────────────
const REF = new Date('2026-02-20');
const addMonths = (d, m) => { const r = new Date(d); r.setMonth(r.getMonth() + m); return r; };
const subMonths = (d, m) => addMonths(d, -m);
const randInt   = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick      = arr => arr[randInt(0, arr.length - 1)];
const isoDate   = d => d.toISOString().slice(0, 10);
const fakeId    = () => Math.random().toString(36).slice(2, 26).padEnd(24, '0');

// ── İSİMLER ───────────────────────────────────────────────────────────────
const BOY_NAMES = ['Ahmet','Mehmet','Ali','Yusuf','Ömer','Eren','Burak','Can','Ege','Kaan',
                   'Mert','Berk','Arda','Furkan','Selim','Kerem','Baran','Tuna','Alp','Doruk'];
const GIRL_NAMES= ['Zeynep','Elif','Ayşe','Fatma','Selin','İrem','Defne','Lara','Ceren','Ece',
                   'Naz','Beren','Ada','Asya','Su','Pınar','Duru','Leyla','Nisa','Güneş'];
const SURNAMES  = ['Yılmaz','Kaya','Demir','Çelik','Şahin','Yıldız','Öztürk','Arslan',
                   'Doğan','Aydın','Erdoğan','Koç','Güler','Aktaş','Polat','Demirci',
                   'Kurt','Bulut','Acar','Keskin'];

// ── MATERYAL KATALOĞU ─────────────────────────────────────────────────────
const AREAS = {
  'Günlük Yaşam': {
    lessons: ['Akma ve Dökme','Düğme İlikleme','Masa Silme','Çiçek Düzenleme','Yiyecek Hazırlama'],
    diffRange: [1, 5]
  },
  'Duyusal': {
    lessons: ['Pembe Kule','Kahverengi Merdiven','Renk Tabletleri','Geometrik Cisimler','Ses Kutuları'],
    diffRange: [2, 6]
  },
  'Dil': {
    lessons: ['Hareketli Alfabe','Fonetik Kartlar','Kelime-Obje Eşleştirme','Cümle Analizi','Hikaye Yazma'],
    diffRange: [2, 8]
  },
  'Matematik': {
    lessons: ['Altın Boncuklar','Seguin Tabloları','Boncuk Zinciri','Uzun Çubuğlar','Çarpma Tahtası'],
    diffRange: [3, 9]
  },
  'Kültür': {
    lessons: ['Dünya Haritası','Hayvan Sınıflandırma','Bitki Anatomisi','Zaman Çizelgesi','Müzik Aletleri'],
    diffRange: [2, 7]
  }
};

const STATUSES   = ['Sunuldu', 'Yönlendirme', 'Hata Kontrolü', 'Ustalaştı'];
// Gerçekçi dağılım ağırlıkları (Sunuldu en fazla, Ustalaştı en az)
const STATUS_W   = [35, 30, 20, 15];

function weightedPick(items, weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]; if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

// ── ÖĞRENCİ ÜRET ─────────────────────────────────────────────────────────
function makeStudent(index, profile = 'normal') {
  const isBoy     = Math.random() > 0.5;
  const firstName = pick(isBoy ? BOY_NAMES : GIRL_NAMES);
  const lastName  = pick(SURNAMES);

  let ageMonths, schoolMonths;

  if (profile === 'hassas') {
    // 36–40 ay: Hassas dönem örneği
    ageMonths   = randInt(36, 40);
    schoolMonths= randInt(1, 4);
  } else if (profile === 'kıdemli') {
    // 64–68 ay: Kıdemli/beklenen örnek
    ageMonths   = randInt(64, 68);
    schoolMonths= randInt(18, 30);
  } else if (profile === 'dengesiz') {
    // Matematik güçlü, Dil zayıf olacak
    ageMonths   = randInt(48, 60);
    schoolMonths= randInt(6, 18);
  } else {
    ageMonths   = randInt(36, 72);
    schoolMonths= randInt(1, 36);
  }

  const birthDate      = subMonths(REF, ageMonths);
  // Kayıt tarihi: çocuk en az 30 aylıkken başlayabilir
  const earliestEnroll = addMonths(birthDate, 30);
  let   enrollDate     = subMonths(REF, schoolMonths);
  if (enrollDate < earliestEnroll) enrollDate = earliestEnroll;

  return {
    _id:            fakeId(),
    firstName,
    lastName,
    name:           `${firstName} ${lastName}`,
    birthDate:      isoDate(birthDate),
    enrollmentDate: isoDate(enrollDate),
    ageMonths,
    schoolMonths,
    profile
  };
}

// ── GÖZLEM ÜRET ──────────────────────────────────────────────────────────
function makeObservations(student) {
  const obs = [];

  // Her öğrenciye 2-5 farklı alan
  const areaKeys = Object.keys(AREAS);
  const numAreas = randInt(2, 5);
  const chosenAreas = [...areaKeys].sort(() => Math.random() - 0.5).slice(0, numAreas);

  chosenAreas.forEach(area => {
    const areaData = AREAS[area];
    const lesson   = pick(areaData.lessons);
    let   difficulty;

    // Profil bazlı zorluk
    if (student.profile === 'hassas') {
      // Hassas dönem çocuğuna zorluk 4-7 → yüksek ageFactor × iyi baseScore
      difficulty = randInt(4, 7);
    } else if (student.profile === 'kıdemli' && (area === 'Günlük Yaşam' || area === 'Duyusal')) {
      // Kıdemli çocuğa kolay materyal → düşük adjustedScore
      difficulty = randInt(1, 3);
    } else if (student.profile === 'dengesiz') {
      // Matematik güçlü
      if (area === 'Matematik') difficulty = randInt(7, 9);
      else if (area === 'Dil')  difficulty = randInt(1, 3);
      else difficulty = randInt(...areaData.diffRange);
    } else {
      difficulty = randInt(areaData.diffRange[0], areaData.diffRange[1]);
    }

    // Progresif gözlem: %40 ihtimal — aynı materyalde ilerleme zinciri
    const doProgression = Math.random() < 0.40;

    if (doProgression) {
      // Çalışıyor → Hata Kontrolü → Ustalaştı (2-3 kayıt, kronolojik)
      const chain = ['Yönlendirme', 'Hata Kontrolü', 'Ustalaştı'].slice(randInt(0, 1));
      chain.forEach((status, i) => {
        // Her adım 2-6 hafta ilerler
        const daysAgo = randInt(170 - i * 45, 170 - i * 30);
        const obsDate = new Date(REF);
        obsDate.setDate(obsDate.getDate() - daysAgo);
        obs.push({
          _id:            fakeId(),
          studentId:      student._id,
          name:           student.name,
          birthDate:      student.birthDate,
          enrollmentDate: student.enrollmentDate,
          lessonName:     lesson,
          category:       area,
          difficulty,
          status,
          observationDate: isoDate(obsDate)
        });
      });
    } else {
      // Tek gözlem
      const daysAgo = randInt(1, 183); // son 6 ay
      const obsDate = new Date(REF);
      obsDate.setDate(obsDate.getDate() - daysAgo);

      // Profil bazlı status
      let status;
      if (student.profile === 'hassas')
        status = weightedPick(STATUSES, [10, 20, 30, 40]); // Ustalaştı ağırlıklı
      else if (student.profile === 'kıdemli')
        status = 'Ustalaştı'; // kolay + kıdemli → ustalaştı ama puan düşer
      else
        status = weightedPick(STATUSES, STATUS_W);

      obs.push({
        _id:            fakeId(),
        studentId:      student._id,
        name:           student.name,
        birthDate:      student.birthDate,
        enrollmentDate: student.enrollmentDate,
        lessonName:     lesson,
        category:       area,
        difficulty,
        status,
        observationDate: isoDate(obsDate)
      });
    }
  });

  return obs;
}

// ── ANA ÜRETIM ────────────────────────────────────────────────────────────
Math.random = (() => {
  // Tekrar üretilebilir seed (opsiyonel — kaldırılabilir)
  let seed = 20260220;
  return () => {
    seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
})();

const students = [];

// Profil dağılımı: normal 37, hassas 6, kıdemli 4, dengesiz 3 = 50
const profiles = [
  ...Array(37).fill('normal'),
  ...Array(6).fill('hassas'),
  ...Array(4).fill('kıdemli'),
  ...Array(3).fill('dengesiz')
].sort(() => Math.random() - 0.5);

profiles.forEach((profile, i) => students.push(makeStudent(i + 1, profile)));

const allObservations = students.flatMap(makeObservations);

fs.writeFileSync(
  'seed_data.json',
  JSON.stringify(allObservations, null, 2),
  'utf-8'
);

console.log(`✅ ${students.length} öğrenci, ${allObservations.length} gözlem → seed_data.json`);

// Profil özeti
const byProfile = {};
students.forEach(s => { byProfile[s.profile] = (byProfile[s.profile] || 0) + 1; });
console.log('📊 Profil dağılımı:', byProfile);

// Yaş istatistikleri
const ages = students.map(s => s.ageMonths);
console.log(`👶 Yaş aralığı: ${Math.min(...ages)}–${Math.max(...ages)} ay`);
console.log(`📅 Gözlem tarihleri: Sep 2025 – Feb 2026 aralığında dağılımlı`);
