# Liberum Montessori Akademia
## Başarı Ölçüm Sistemi: Pedagojik & Algoritmik Değerlendirme Raporu

**Hazırlayan:** Liberum Yazılım Mühendisliği  
**Versiyon:** 3.0  
**Tarih:** Şubat 2026  
**Hedef Kitle:** Okul Yöneticisi

---

## Felsefenin Temeli: Neden Standart Notlandırma Yetersiz?

Geleneksel eğitim sistemleri başarıyı **mutlak çıktı** üzerinden ölçer: "10 üzerinden 8 aldı."
Montessori'de ise gelişim **doğrusal değil, sarmal ve tamamen bireyseldir.** Aynı materyali tamamlayan iki çocuk arasında şu farklar olabilir:

- Biri 3 yaşında, diğeri 5,5 yaşında
- Biri okulun ilk ayında, diğeri 2 yıllık öğrenci
- Biri materyali 10 günde, diğeri 2 ayda tamamladı

Standart bir not bu bağlamı tamamen görmezden gelir. **Liberum'un başarı algoritması bu bağlamı hesaplamanın merkezine koyar.**

---

## Bölüm 1 — Statü Sistemi: Öğrenme Yolculuğunun Haritası

Her gözlem, öğrencinin o materyalle olan ilişkisini 4 aşamadan birinde ifade eder:

| # | Statü | Katsayı | Montessori Pedagojisindeki Yeri |
|:---:|:---|:---:|:---|
| 1 | **Sunuldu** | 0.10 | Öğretmen materyali tanıttı. Çocuk izledi. Henüz bağımsız değil. |
| 2 | **Yönlendirme** | 0.40 | Çocuk materyalle çalışıyor, öğretmenden rehberlik alıyor. |
| 3 | **Hata Kontrolü** | 0.70 | Çocuk hatalarını fark ediyor ve kendi başına düzelitiyor. Bu Montessori'nin en kritik aşamasıdır — öz-denetim kapasitesinin nişanesi. |
| 4 | **Ustalaştı** | 1.00 | Tam içselleştirme. Materyal artık çocuğun bir parçası. |

> **Not:** "Çalışıyor" ifadesi önceki versiyonda kullanılıyordu; pedagojik olarak daha doğru bir tanımla "Yönlendirme" olarak güncellendi.

---

## Bölüm 2 — Temel Puan (baseScore): Zorluk × Statü

Her gözlemin ham değeri şu çarpımla bulunur:

$$baseScore = difficultyLevel \times statusCoefficient$$

**difficultyLevel (Zorluk Seviyesi):** Materyalin müfredattaki karmaşıklığı. 1–10 arası öğretmen tarafından tanımlanır. Örneğin "Akma ve Dökme" → 2, "Altın Boncuklar" → 8.

**statusCoefficient:** Yukarıdaki tablodaki katsayı.

**Örnek:** Zorluk: 6 olan bir materyal için "Hata Kontrolü" kaydı:
$$baseScore = 6 \times 0.70 = 4.20$$

---

## Bölüm 3 — Yaş Faktörü (ageFactor): Hassas Dönemlerin Dijital Karşılığı

Maria Montessori, 3–6 yaş aralığını **Hassas Dönem** (Sensitive Period) olarak tanımlar: çocuğun belirli becerileri öğrenmek için biyolojik olarak en açık olduğu dönem. Bu pencere kapandıktan sonra aynı öğrenme çok daha fazla çaba gerektirir.

Algoritma bu gerçeği matematikle ifade eder:

$$ageFactor = \text{clamp}\left(\frac{54}{ageInMonths},\ 0.75,\ 1.40\right)$$

**Referans noktası 54 ay (4,5 yaş):** Montessori 3–6 yaş programının tam medyanı.

| Yaş | ageFactor | Anlam |
|:---|:---:|:---|
| 36 ay (3 yaş) | **1.40** *(maks)* | Hassas dönemin zirvesi — başarı ödüllendirilir |
| 54 ay (4,5 yaş) | **1.00** | Referans nokta |
| 72 ay (6 yaş) | **0.75** *(min)* | Hassas dönem kapanıyor — aynı başarı daha az "sürpriz" |

> 3 yaşında "Altın Boncuklar"ı ustalaşan bir çocuk, 6 yaşında aynı materyali ustalaşan bir çocuktan **%87 daha yüksek** ageFactor'e sahiptir.

---

## Bölüm 4 — Kıdem Faktörü (seniorityFactor): Yeni mi, Kıdemli mi?

Okula yeni başlayan bir çocuk adaptasyon sürecindedir; bu dönemdeki başarılar beklenmedik ve değerlidir. Uzun süreli bir öğrenciden ise daha yüksek beklentiler tutarlıdır.

$$seniorityFactor = \text{clamp}\left(1 + \frac{6 - monthsInSchool}{24},\ 0.75,\ 1.25\right)$$

| Okuldaki Süre | seniorityFactor | Anlam |
|:---|:---:|:---|
| 1 ay | **1.21** | Yeni öğrenci bonusu |
| 6 ay | **1.00** | Adaptasyon tamamlandı, referans nokta |
| 30+ ay | **0.75** *(min)* | Kıdemli öğrenciden daha fazlası beklenir |

---

## Bölüm 5 — Hız Faktörü (vF): Zamanın Değeri

### 5.1 Neden Hız Önemli?

Montessori'de çalışma süresi de bir sinyaldir. Materyali beklenen sürede tamamlamak formun yanında ritmin de sağlıklı olduğunu gösterir. Fazla hızlı tamamlamak olgunlaşmamış bir "geçme" riski, çok yavaş ise bilişsel bir güçlüğün işareti olabilir.

Hız Faktörü (`vF`) **yalnızca "Ustalaştı" statüsünde** hesaplanır; devam eden çalışmalara hız baskısı uygulamak Montessori felsefesiyle çelişir.

### 5.2 Beklenen Süre (ET): Üstel Yaş Normalizasyonu

Her materyalin iki parametresi öğretmen tarafından tanımlanır:
- **minAge:** Materyalin önerildiği minimum yaş (ay)
- **T_ref (expectedTimeAtMinAge):** Tam minAge'deki bir çocuktan beklenen tamamlanma süresi (gün)

Formül, büyük çocuktan daha hızlı bitirmesi bekleyen bir dinamikle çalışır:

$$ET = \max\left(1,\ T_{ref} \times \left(\frac{minAge}{currentAge}\right)^3\right)$$

**currentAge:** Çocuğun o materyali ilk "Sunuldu" olarak işaretlendiği andaki yaşı (ay).

**Neden küpsel (³)?** Bilişsel olgunluk yaşla üstel artar. 6 yaşındaki bir çocuk 4 yaşındakinden sadece iki kat değil, çok daha hızlı öğrenir. Küp almak bu gerçekçi eğrimi modeller.

**Örnek:** T_ref = 21 gün, minAge = 48 ay olan bir materyal için:

| Çocuğun yaşı | ET (beklenen süre) | Yorum |
|:---|:---:|:---|
| 48 ay (minAge) | **21 gün** | Referans — norm |
| 60 ay | **11 gün** | Büyük çocuktan %48 daha hızlı beklenir |
| 72 ay | **6 gün** | En büyük gruptan hız beklentisi en yüksek |
| 36 ay *(erken sunum)* | *(özel kural)* | Aşağıya bakınız |

### 5.3 Hız Faktörü (vF) Hesaplaması

**Normal Sunum** (currentAge ≥ minAge):
$$vF = \text{clamp}\left(\frac{ET}{ActualTime},\ 0.50,\ 1.50\right)$$

- **ActualTime:** "Sunuldu" tarihi ile "Ustalaştı" tarihi arasındaki gün farkı.
- ET'nin yarısında bitirdi → vF = 1.50 (hız bonusu)
- Tam ET'de bitirdi → vF = 1.00 (norm)
- ET'nin iki katında bitirdi → vF = 0.50 (hız cezası)

**Erken Sunum** (currentAge < minAge): Çocuk önerilen minimum yaşın altında bu materiyal ile tanıştırılmış.

| Durum | vF | Yorum |
|:---|:---:|:---|
| ActualTime ≤ T_ref | **1.50** | Üstün yetenek: minimum yaş altında referans sürede bitirdi |
| ActualTime > T_ref | **1.00** | Yaşından büyük iş yaptı, yavaş olsa da ceza verilmez |

---

## Bölüm 6 — Adalet Kuralı: Büyük Çocukla Adil Yarışma

**Sorun:** ageFactor, büyük çocuklara doğası gereği düşük çarpan verir. Eğer büyük bir çocuk materyali tam olarak beklenen hızda bitirirse (vF = 1.0 anlamına gelir), skoru yine de baseScore'un altına düşebilir. Bu adil değildir; çocuk sisteme uygun davranmıştır.

**Çözüm:** "Kendi ET hızında tamamla → en az baseScore al" garantisi.

$$adjustedScore = \text{clamp}\left(\max(baseScore,\ baseScore \times ageFactor \times seniorityFactor \times vF),\ 0.1,\ 10.0\right)$$

`max(baseScore, ...)` ifadesi bu garantiyi sağlar: ne kadar yaşlı ve ne kadar kıdemli olursa olsun, bir öğrenci beklenen hızda materyali tamamladığında en az `difficultyLevel × 1.0` puan alır.

---

## Bölüm 7 — Birleşik Final Formülü

$$\boxed{adjustedScore = \text{clamp}\left(\max\left(D \cdot c,\ D \cdot c \cdot ageFactor \cdot seniorityFactor \cdot vF\right),\ 0.1,\ 10.0\right)}$$

Burada:
- **D** = difficultyLevel (1–10)
- **c** = statusCoefficient (0.10 / 0.40 / 0.70 / 1.00)
- **vF** = Ustalaştı statüsünde ET/ActualTime; diğerlerinde 1.0

### Değer Yorumlama Rehberi

| Skor Aralığı | Renk | Anlam |
|:---:|:---:|:---|
| 0.1 – 3.0 | 🔴 | Gelişim başlıyor ya da beklenti karşılanmıyor |
| 3.1 – 7.0 | 🟡 | Normal gelişim seyri |
| 7.1 – 10.0 | 🟢 | Güçlü performans — potansiyel tespit |

---

## Bölüm 8 — Graceful Degradation: Eksik Veri Durumu

Sistem, eksik veri nedeniyle asla skor üretmeyi durdurmaz:

| Eksik Veri | Sistem Davranışı |
|:---|:---|
| `minAge` veya `T_ref` tanımlanmamış | vF = 1.0 alınır, hesaplama devam eder |
| `startDate` / `completionDate` yok | vF = 1.0 alınır (eski kayıtlar etkilenmez) |
| `lesson` populate edilmemiş | successScore = null (güvenli çıkış) |
| `student` populate edilmemiş | Yalnızca baseScore döner |

---

## Bölüm 9 — Karşılaştırmalı Senaryo Analizi

### Senaryo A — Hassas Dönem Üstün Başarısı
**Öğrenci:** 38 ay, 2 aydır okulda · **Materyal:** Zorluk 6, minAge = 48 ay, T_ref = 21 gün · **Statü:** Ustalaştı · **ActualTime:** 15 gün

| Bileşen | Değer | Açıklama |
|:---|:---:|:---|
| baseScore | 6.0 | 6 × 1.0 |
| ageFactor | 1.40 | 54/38 → maks |
| seniorityFactor | 1.17 | Yeni öğrenci bonusu |
| vF | **1.50** | Erken sunum + AT ≤ T_ref |
| **adjustedScore** | **10.0** *(sınırlı)* | Üstün yetenek sinyali |

### Senaryo B — Büyük Çocuk, Adalet Kuralı Devrede
**Öğrenci:** 68 ay, 24 aydır okulda · **Aynı materyal** · **Statü:** Ustalaştı · **ActualTime:** 9 gün (tam ET'de)

| Bileşen | Değer | Açıklama |
|:---|:---:|:---|
| baseScore | 6.0 | 6 × 1.0 |
| ageFactor | 0.79 | 54/68 |
| seniorityFactor | 0.75 | Kıdemli, beklenti yüksek |
| vF | 1.0 | ET = 9 gün, ActualTime = 9 gün |
| ham hesap | 3.57 | 6 × 0.79 × 0.75 × 1.0 |
| **Adalet Kuralı** | **→ 6.0** | max(6.0, 3.57) → baseScore garantisi |

---

## Bölüm 10 — Yönetici Karar Destek Sinyalleri

Sistem otomatik olarak üç kritik pedagojik sinyali üretir:

1. **Potansiyel Altı Gelişim:** Ham statü iyi (Ustalaştı), ancak adjustedScore düşük. → Çocuk yaşına/kıdemine göre bu materyalde yavaş ilerliyor. Materyal çok erken sunulmuş olabilir.

2. **Üstün Potansiyel (Talent Alert):** adjustedScore sürekli 7.0+. → Alan derinleştirme, üst materyal sunumu düşünülebilir.

3. **Alan Dengesizliği:** Raporlar sayfasında alan bazlı bar chart dengesizlik gösteriyorsa. → Örneğin Matematik 8.2, Dil 2.1 → dil alanına özel müdahale işareti.

---

## Teknik Özet — Veri Modeli

```
Lesson        → difficultyLevel, minAge, expectedTimeAtMinAge (T_ref)
Student       → birthDate, enrollmentDate
Observation   → status, startDate, completionDate, successScore (virtual)
```

Tüm hesaplama **sunucu tarafında**, `Observation.successScore` adlı bir **virtual alan** içinde gerçekleşir. Veritabanına kaydedilmez; her sorgu anında canlı hesaplanır.

---

*Bu belge Liberum Montessori Akademia v3.0 algoritması için hazırlanmıştır — Şubat 2026.*