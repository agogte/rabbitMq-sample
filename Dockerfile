FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ src/

COPY start.js .
COPY src/subscriber.js .
COPY swagger.yaml .

EXPOSE 3000

CMD ["node", "start.js"]