/**
 * Türkçe karakterleri İngilizce karşılıklarına dönüştürür.
 * PDF üretimi gibi standart font kullanılan alanlarda hata almamak için kullanılır.
 */
function trToEn(text) {
    if (!text) return "";
    return text
        .replace(/Ğ/g, "G")
        .replace(/ğ/g, "g")
        .replace(/Ü/g, "U")
        .replace(/ü/g, "u")
        .replace(/Ş/g, "S")
        .replace(/ş/g, "s")
        .replace(/İ/g, "I")
        .replace(/ı/g, "i")
        .replace(/Ö/g, "O")
        .replace(/ö/g, "o")
        .replace(/Ç/g, "C")
        .replace(/ç/g, "c");
}

module.exports = { trToEn };
