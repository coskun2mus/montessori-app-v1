# 1. Hafif bir Node imajı kullan
FROM node:18-slim

# 2. Çalışma dizinini belirle
WORKDIR /usr/src/app

# 3. Bağımlılıkları kopyala ve yükle
COPY package*.json ./
RUN npm install --only=production

# 4. Tüm kodu kopyala
COPY . .

# 5. Cloud Run genelde 8080 portunu bekler
ENV PORT=8080
EXPOSE 8080

# 6. Uygulamayı başlat
CMD [ "node", "src/app.js" ]