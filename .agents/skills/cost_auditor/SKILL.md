---
name: Montessori Cost & Token Auditor
description: Yapay zeka kullanım maliyetlerini denetler, token optimizasyonu yapar ve bütçe dostu model seçimleri önerir.
---

# Token Auditing & Cost Management

Bu yetenek, okulun API maliyetlerini kontrol altında tutmak için şu kuralları uygular:

## 1. Token Tahmini
Yeni bir prompt tasarlandığında veya veri paketi büyütüldüğünde:
- Ortalama Input/Output token miktarını hesapla.
- Her fotoğrafın ~258 token olduğunu hatırla.
- Bir veli raporu için 100 materyal dökümünün ~3.000 token olabileceğini öngör.

## 2. Model Seçim Rehberi
- **Aşama 1 (Foto Analiz):** Hız ve düşük maliyet için her zaman `gemini-1.5-flash` veya `gemini-3-flash` öner.
- **Aşama 2 (Sentez Rapor):** Yaratıcılık gerekiyorsa `Pro` modelleri önerilebilir ancak okul sayısı fazlaysa `Flash` modelinin yeterliliğini savun.

## 3. Veri Optimizasyonu
- Yapay Zeka'ya veri yollarken gereksiz MongoDB field'larını (`_id`, `__v`) temizle. Sadece anlamlı pedagojik verileri (Materyal ismi, durum, öğretmen notu) göndererek "Input Token" tasarrufu sağla.

## 4. Kullanıcı Bilgilendirme
- Büyük çaplı veri işleme (Örn: "Tüm okulun raporunu bas") taleplerinde kullanıcıya tahmini maliyet aralığını (Örn: "Bu işlem yaklaşık 10-15 Cent tutar") bildir.
