# Liberum Montessori Puanlama Algoritması: Akış ve Formülasyon Rehberi

Bu belge, Montessori algoritmasının uçtan uca nasıl çalıştığını, formüllerin mantığını ve kod tabanında (codebase) hangi dosyalarda nasıl uygulandığını detaylandırmaktadır.

## 1. Temel Bileşenler ve Sabitler

**Dosya Konumu:** `src/models/Observation.js` (Satır 49-55)

Sistemin temeli, öğrencinin materyal üzerindeki eforunu 4 seviyeli bir katsayı ile derecelendirmeye dayanır.

*   `Sunuldu` = 0.1
*   `Yönlendirme` = 0.4
*   `Hata Kontrolü` = 0.7
*   `Ustalaştı` = 1.0

Buna ek olarak, her materyalin 1 ile 10 arasında değişen bir **Zorluk Seviyesi (Difficulty Level / D)** vardır.

## 2. Ana Formül: Dinamik Başarı Puanı (`successScore`)

**Dosya Konumu:** `src/models/Observation.js` (Satır 111-170 arası `successScore` virtual fonksiyonu)

Öğrencinin aldığı nihai puan düz bir `Zorluk * Katsayı` değildir. Üzerine 3 farklı pedagogik çarpan eklenir: Yaş Faktörü, Kıdem Faktörü ve Hız Faktörü.

**Formülün Matematiksel İfadesi:**
> Computed Score = (Base Score) × (Age Factor) × (Seniority Factor) × (Velocity Factor)
>
> Puan Sınırlandırması (Clamp): Sonuç her zaman `0.1` ile `10.0` arasında sınırlandırılır (Kırpılır).

### A. Base Score (Taban Puan)
`const baseScore = D * coefficient;`
Zorluk seviyesinin ve durum katsayısının doğrudan çarpımıdır. Örneğin, zorluğu 4 olan bir materyalde "Ustalaştı" ise taban puan 4.0'dır.

### B. Age Factor (Yaş Faktörü)
Çocuğun mevcut yaşını ölçer. 54 ay (4,5 yaş) referans alınır. 
`const ageFactor = clamp(54 / ageInMonths, 0.75, 1.40);`
*   Çocuk gençse (örneğin 36 ay), çarpan `1.40`'a (Maksimum) kadar çıkar. Başarısı ödüllendirilir.
*   Çocuk büyükse (örneğin 66 ay), çarpan `0.81`'e düşer.

### C. Seniority Factor (Kıdem Faktörü)
Öğrencinin okula kayıt olmasından itibaren geçen süreyi (ay) ölçer. İlk 6 ay oryantasyon olduğu için bonus uygulanır.
`const seniorityFactor = clamp(1 + (6 - monthsInSchool) / 24, 0.75, 1.25);`
*   Daha yeni öğrencilerin puanları %25'e kadar (1.25) artırılır.
*   Tecrübeli öğrencilerden beklenen olgunluk daha yüksek olduğu için çarpan yavaş yavaş 0.75'e çekilir.

### D. Velocity Factor (Hız Faktörü - vF)
Sadece çocuk **"Ustalaştı"** statüsüne ulaştığında hesaplanır. Materyali algılama hızını, okulun beklediği sürece (Expected Time - ET) oranlar.

1.  **Beklenen Süre (ET) Hesabı:**
    `ET = max(1, T_ref × (minAge / currentAge)³)` 
    *(minAge: Materyalin hedef yaşı, currentAge: Çocuğun materyale başladığı yaş, T_ref: Beklenen ortalama süre)*
2.  **Hız Çarpanı (vF) Hesabı:**
    `vF = clamp(ET / actualTimeDays, 0.50, 1.50)`
    *(actualTimeDays: Sunuldu konumundan Ustalaştı konumuna geçen gerçek gün sayısı)*
    *   **Hızlı Öğrenme:** Çocuk ET'den çok daha kısa sürede tamamlarsa (`ET > actualTimeDays`) vF `1.50`'ye kadar çıkar. Puanı uçar.
    *   **Yavaş Öğrenme:** Çocuk beklenenden çok daha uzun sürede tamamlarsa (`ET < actualTimeDays`) vF oranı `0.50`'ye kadar düşer.

`Adalet Kuralı` **Kaldırılmış Hali:** Ortalama ve çok tecrübeli/yavaş öğrencileri ayrıştırmak için artık alt limit yoktur. Yavaş tamamlayan öğrencinin nihai skoru, kendi taban skorunun bile yarısına (örneğin 4.0'dan 2.0'a) rahatlıkla inebilmektedir.

---

## 3. Raporlama ve Backend Akışı

**Dosya Konumu:** `src/app.js` (Satır 255-323 - `api/observations/student/:studentId/area-summary`)

Mongoose üzerindeki `successScore` bir **virtual**'dır. Yani veritabanına kaydedilmez, her çağrıldığında o anki yaş ve zamana göre baştan dinamik olarak hesaplanır. (Gerçek zamanlı değerlendirme sağlar).

Raporlama ekranı (/raporlar) açıldığında api şu adımları izler:

1.  **Filtreleme:** Öğrenciye ait tüm gözlemler (observations) çekilir.
2.  **Best Observation (En İyi Deneme):** Eğer bir materyal üzerinde birden fazla gözlem varsa (Örn: Pazartesi "Sunuldu", Cuma "Hata Kontrolü", Haftaya Çarşamba "Ustalaştı"), API bunları durum rütbesine göre (`Ustalaştı` en büyük) tarar ve sadece en üst rütbeli gözlemi hesaplamaya alır.
3.  **Alan Toplamları:** Öğrencinin materyallerden aldığı dinamik `o.successScore` değerleri `totalScore` olarak toplanır.
4.  **Tavan Hesaplaması (Denominator):** Materyalin taban `difficultyLevel` (Maksimum Puan) değerleri toplanarak `totalMax` oluşturulur.
5.  **Ağırlıklı Başarı Oranı:** `totalScore / totalMax` işlemi yapılır. Hızlı çocuklar bu toplamı max toplamın üzerinde taşıyarak %100'ün üzerine çıkabilirler.

---

## 4. Frontend Görselleştirme

**Dosya Konumu:** `views/reports.html`

Sunucudan hesaplanarak dönen JSON verisi önyüzde dinamik renklendirmeyle gösterilir.

```javascript
/* Başarı Oranına Göre Rengi Çeviren Algoritma */
function ratioTier(r) { return r < 0.40 ? 'low' : r < 0.70 ? 'mid' : 'high'; }

if (r >= 0.70) return '#27ae60'; // Yeşil (Başarılı)
if (r >= 0.40) return '#f39c12'; // Turuncu (Orta / Gelişen)
return '#e74c3c'; // Kırmızı (Müdahale Gerekli / Yavaş veya Zorlanıyor)
```

Öğrenci bir alanda hesaplanan `%120` başarıya sahipse bu metin dinamik olarak yeşil renge bürünecek ve ebeveyne gurur verici bir `[ Puan / Zorluk ]` rasyosuyla `(Örn: 4.8 / 4.0)` "Üstün Başarı" olarak yansıtılacaktır. Yavaş bir çocuk veya erken zorlanılan durumda ise kırmızı / turuncu renk uyarısıyla ebeveyn durumu açıkça takip edebilir.
