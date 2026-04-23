# 1. Hafif bir Node imajı kullan
FROM node:20-slim

# 2. Puppeteer / Chromium için gerekli sistem bağımlılıkları
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-noto \
    fonts-noto-cjk \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 3. Çalışma dizinini belirle
WORKDIR /usr/src/app

# 4. Bağımlılıkları kopyala ve yükle
COPY package*.json ./
RUN npm install --only=production

# 5. Tüm kodu kopyala
COPY . .

# 6. Cloud Run genelde 8080 portunu bekler
ENV PORT=8080
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
EXPOSE 8080

# 7. Uygulamayı başlat
CMD [ "node", "src/app.js" ]