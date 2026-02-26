# Liberum Montessori Akademia
## Yaş ve Kıdem Ayarlı Başarı Algoritması: Teknik ve Pedagojik Değerlendirme Raporu

**Hazırlayan:** Liberum Yazılım Mühendisliği  
**Versiyon:** 1.0  
**Tarih:** Şubat 2026  
**Hedef Kitle:** Okul Yöneticisi 

---

### 1. Problemin Tanımı — Doğrusal Olmayan Gelişim
Geleneksel okul sistemleri başarıyı mutlak çıktı üzerinden ölçer. Montessori'de ise gelişim **doğrusal değil, sarmal ve bireyseldir.** Bağlamdan yoksun bir puan, bağlamı olan bir gelişimi ölçemez.



### 2. Algoritma Mimarisi — Mühendislik Yaklaşımı

#### 2.1 Formül
$$adjustedScore = \text{clamp}(baseScore \times ageFactor \times seniorityFactor, 0.01, 10.00)$$

#### 2.2 Bileşen Analizi

* **Base Score:** $lesson.difficultyLevel (1–10) \times statusCoefficient$
* **Age Factor:** $\text{clamp}(54 / ageInMonths, 0.75, 1.40)$
    * *Referans:* 54 ay (4,5 yaş) - Montessori 3-6 yaş medyanı.
* **Seniority Factor:** $\text{clamp}(1 + (6 − monthsInSchool) / 24, 0.75, 1.25)$
    * *Referans:* 6. ay - Adaptasyon eşiği.

| Status | Katsayı | Montessori Karşılığı |
| :--- | :--- | :--- |
| Sunuldu | 0.1 | Pasif tanışma |
| Çalışıyor | 0.4 | Aktif pratik |
| Hata Kontrolü | 0.7 | Öz-düzeltme kapasitesi |
| Ustalaştı | 1.0 | Tam içselleştirme |



### 3. Pedagojik Validasyon — Hassas Dönemler (Sensitive Periods)
Maria Montessori’nin **Hassas Dönemler** ilkesi, `ageFactor` ile dijitalleştirilmiştir. 36-48 ay bandındaki çocuklar, biyolojik olarak en açık oldukları dönemde materyal tamamladıklarında algoritma tarafından sistematik olarak ödüllendirilir.

### 4. Göreceli Başarı ve Adil Normalizasyon
Farklı yaş ve kıdemdeki iki çocuğun aynı materyaldeki "Ustalaştı" çıktısı, sistem tarafından bağlamsal olarak normalize edilir:

* **Öğrenci A (3 yaş, yeni):** $4.0 \times 1.40 \times 1.21 = \mathbf{6.78}$
* **Öğrenci B (5.5 yaş, kıdemli):** $4.0 \times 0.82 \times 0.75 = \mathbf{2.46}$

### 5. Veri Analitiği ve Karar Destek
Bu sistem yöneticiye üç temel sinyal üretir:
1.  **Potansiyel Altı Gelişim:** Yüksek kaba puan, düşük ayarlanmış puan.
2.  **Hızlı Gelişim (Talent):** Sürekli 8.0+ ayarlanmış puan.
3.  **Alan Analizi:** Matematik/Dil/Duyusal alanlarındaki dengesizliklerin anlık tespiti.

---
*Bu rapor Liberum Montessori Akademia için otomatik olarak üretilmiştir.*