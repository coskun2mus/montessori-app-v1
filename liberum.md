# Liberum Montessori Akademia
## Başarı Ölçüm Sistemi: Pedagojik & Algoritmik Değerlendirme Raporu

**Hazırlayan:** Liberum Yazılım Mühendisliği  
**Versiyon:** 4.0 (Tam Dinamik Değerlendirme)  
**Tarih:** Şubat 2026  
**Hedef Kitle:** Okul Yöneticisi ve Montessori Pedagogları

---

## Felsefenin Temeli: Neden Standart Notlandırma Yetersiz?

Geleneksel eğitim sistemleri başarıyı **mutlak çıktı** üzerinden ölçer: "10 üzerinden 8 aldı."
Montessori'de ise gelişim **doğrusal değil, sarmal ve tamamen bireyseldir.** Aynı materyali tamamlayan iki çocuk arasında şu farklar olabilir:

- Biri 3 yaşında, diğeri 5,5 yaşında
- Biri okulun ilk ayında, diğeri 2 yıllık öğrenci
- Biri materyali 10 günde, diğeri 2 ayda tamamladı

Standart bir not bu bağlamı tamamen görmezden gelir. **Liberum'un başarı algoritması bu bağlamı hesaplamanın merkezine koyar.** Öğrenciye verilen değer sadece bitirdiği çalışmayı değil, **kendi potansiyelini ne kadar verimli kullandığını** ölçer.

---

## Bölüm 1 — Statü Sistemi: Öğrenme Yolculuğunun Haritası

Her gözlem, öğrencinin o materyalle olan ilişkisini 4 aşamadan birinde ifade eder:

| # | Statü | Katsayı | Montessori Pedagojisindeki Yeri |
|:---:|:---|:---:|:---|
| 1 | **Sunuldu** | 0.10 | Öğretmen materyali tanıttı. Çocuk izledi. Henüz bağımsız değil. |
| 2 | **Yönlendirme** | 0.40 | Çocuk materyalle çalışıyor, öğretmenden rehberlik alıyor. |
| 3 | **Hata Kontrolü** | 0.70 | Çocuk hatalarını fark ediyor ve kendi başına düzelitiyor. Bu Montessori'nin en kritik aşamasıdır — öz-denetim kapasitesinin nişanesi. |
| 4 | **Ustalaştı** | 1.00 | Tam içselleştirme. Materyal artık çocuğun bir parçası. Akranlarına rehberlik edebilir. |

---

## Bölüm 2 — Temel Puan (baseScore): Zorluk × Statü

Her gözlemin ham değeri şu çarpımla bulunur:

$$baseScore = difficultyLevel \times statusCoefficient$$

**difficultyLevel (Zorluk Seviyesi):** Materyalin müfredattaki karmaşıklığı. 1–10 arası öğretmen tarafından tanımlanır. (Örn: "Düğme İlkleme" → 2, "Trinom Küpü" → 9)

**Örnek:** Zorluk: 6 olan bir materyal için "Hata Kontrolü" kaydı:
$$baseScore = 6 \times 0.70 = 4.20$$

---

## Bölüm 3 — Yaş Faktörü (ageFactor): Hassas Dönemlerin Algoritması

Maria Montessori, 3–6 yaş aralığını **Hassas Dönem** (Sensitive Period) olarak tanımlar. Algoritma bu biyolojik açıklığı matematikle ödüllendirir:

$$ageFactor = \text{clamp}\left(\frac{54}{ageInMonths},\ 0.75,\ 1.40\right)$$

**Referans noktası 54 ay (4,5 yaş):** Montessori 3–6 yaş programının tam medyanı.

| Yaş | ageFactor | Anlam |
|:---|:---:|:---|
| 36 ay (3 yaş) | **1.40** *(maks)* | Hassas dönemin zirvesi — genç yaştaki üstün algı ödüllendirilir. |
| 54 ay | **1.00** | Referans nokta. |
| 72 ay (6 yaş) | **0.75** *(min)* | Hassas dönem kapanıyor — aynı başarı daha olağandır. |

---

## Bölüm 4 — Kıdem Faktörü (seniorityFactor): Yeni mi, Kıdemli mi?

Okula yeni başlayan bir çocuğun adaptasyon sürecindeki başarıları daha değerlidir. Uzun süreli bir öğrenciden ise daha yüksek ritim beklenir.

$$seniorityFactor = \text{clamp}\left(1 + \frac{6 - monthsInSchool}{24},\ 0.75,\ 1.25\right)$$

| Okuldaki Süre | seniorityFactor | Anlam |
|:---|:---:|:---|
| 1 ay | **1.21** | Yeni öğrenci oryantasyon bonusu. |
| 6 ay | **1.00** | Adaptasyon tamamlandı, referans nokta. |
| 30+ ay | **0.75** *(min)* | Kıdemli öğrenciden çeviklik beklenir. |

---

## Bölüm 5 — Hız Faktörü (vF): Zamanın Pedagojik Değeri

### 5.1 Beklenen Süre (ET): Üstel Yaş Normalizasyonu

Her materyalin iki parametresi vardır:
- **minAge:** Önerilen minimum yaş (ay)
- **T_ref (expectedTimeAtMinAge):** Tam minAge'deki bir çocuktan beklenen tamamlanma süresi (gün)

Büyük çocukların küçüklerden üstel olarak (³) daha hızlı kavraması beklenir:

$$ET = \max\left(1,\ T_{ref} \times \left(\frac{minAge}{currentAge}\right)^3\right)$$

### 5.2 Hız Çarpanı (vF)

Hız Faktörü (`vF`) **yalnızca "Ustalaştı" statüsünde** hesaplanır. Çocuğun organik tamamlama süresi (ActualTime), beklenen süreye (ET) bölünür.

$$vF = \text{clamp}\left(\frac{ET}{ActualTime},\ 0.50,\ 1.50\right)$$

- ET'nin yarısında bitirdi → **vF = 1.50 (hız bonusu)**
- Tam ET'de bitirdi → **vF = 1.00 (norm)**
- ET'nin iki katında bitirdi → **vF = 0.50 (yavaşlık yansıması)**

---

## Bölüm 6 — Tam Organik Final Formülü (V4 Sürümü)

Önceki sürümlerde var olan, öğrencinin puanını yapay olarak yüksek tutan matematiksel "Adalet Kuralı (Alt Limit)" V4 itibarıyla kaldırılmıştır. Sistem artık yavaş öğrenmeyi organik şekilde puana yansıtır (Ceza değil, somut durum tespiti).

$$\boxed{adjustedScore = \text{clamp}\left(D \cdot c \cdot ageFactor \cdot seniorityFactor \cdot vF,\ 0.1,\ 10.0\right)}$$

### Kullanıcı Arayüzü (X / Y) Raporlaması
Arayüz (Raporlar) ekranında pedagojik şeffaflık sağlamak adına, puanlar **Puan / Zorluk Seviyesi (X / Y)** şeklinde gösterilir.
*   **Hızlı ve Yetenekli Öğrenci:** Puan (X), Zorluk Seviyesini (Y) geçebilir. Örneğin zorluğu 4.0 olan bir materyalde üstün vF bonusuyla **4.8 / 4.0 — %120 Başarı** elde edilebilir.
*   **Destek Gereken Yavaş Öğrenci:** Öğrenci materyalde "Ustalaşsa" dahi süreci çok uzadıysa, vF çarpanı doğal olarak skoru düşürecek ve **3.1 / 4.0 — %78 Başarı** olarak yansıyacaktır. Bu pedagoga doğrudan müdahale haritası çizer.

---

## Bölüm 7 — Karşılaştırmalı Senaryo Analizi

### Senaryo A — Üstün Potansiyel (Hızlı Öğrenme)
**Öğrenci:** 38 ay, 2 aydır okulda · **Materyal:** Zorluk 6, minAge = 48 ay, T_ref = 21 gün · **Statü:** Ustalaştı · **ActualTime:** 10 gün

| Bileşen | Değer | Açıklama |
|:---|:---:|:---|
| baseScore | 6.0 | 6 × 1.0 |
| ageFactor | 1.40 | 54/38 → maks |
| seniorityFactor | 1.17 | Yeni öğrenci bonusu |
| vF | **1.50** | Beklenenden çok erken |
| **Önyüz Raporu** | **9.8 / 6.0** | **%163 Başarı!** Çocuğun olağanüstü hızı grafiklere yüksek potansiyel olarak yansır. |

### Senaryo B — Destek Gereksinimi (Yavaş Öğrenme)
**Öğrenci:** 68 ay, 24 aydır okulda · **Aynı materyal (Zorluk 6)** · **Statü:** Ustalaştı · **ActualTime:** 45 gün (ET'den çok daha uzun)

| Bileşen | Değer | Açıklama |
|:---|:---:|:---|
| baseScore | 6.0 | 6 × 1.0 (Ustalaştı de facto tabanı) |
| ageFactor | 0.79 | 54/68 (Yaşına göre görece geç) |
| seniorityFactor | 0.75 | Kıdemli, beklenti yüksek |
| vF | **0.50** | ET'nin iki katı sürede bitirilmiş |
| **Önyüz Raporu** | **1.8 / 6.0** | **%30 Başarı.** (Öğrenci işi bitirse de, harcanan anormal süre neticesinde alarm rengi Kırmızı'ya döner ve pedagog uyarılır). |

---

## Bölüm 8 — Yönetici Karar Destek Sinyalleri (Renk Skalası)

Raporlar arayüzünde oluşan nihai (Yüzde) oranlar şu renklerle eşleşir:

| Başarı Rasyosu | Renk Skalası | Pedagojik Anlam |
|:---:|:---:|:---|
| **< %40** | 🔴 Kırmızı | Müdahale/Destek Sinyali (Çok yavaş süreç veya erken bırakma) |
| **%40 - %69** | 🟡 Turuncu | Normal-Gelişen Öğrenme Eğrisi |
| **≥ %70** | 🟢 Yeşil | Güçlü Performans ve Bağımsızlık (Hata Kontrolü / Ustalaşma) |

---

## Teknik Özet — Veri Modeli

```javascript
Lesson        → difficultyLevel, minAge, expectedTimeAtMinAge (T_ref)
Student       → birthDate, enrollmentDate
Observation   → status, startDate, completionDate, successScore (virtual döküm)
```

Tüm hesaplama **sunucu tarafında**, `Observation.successScore` adlı bir **virtual alan** içinde gerçekleşir. Veritabanına statik kaydedilmez; öğrencinin o anki yaşına ve güncel tarih farklarına göre canlı (`real-time`) hesaplanır.

*Bu belge Liberum Montessori Akademia (v4.0) Tam Dinamik Değerlendirme algoritması için hazırlanmıştır — Şubat 2026.*