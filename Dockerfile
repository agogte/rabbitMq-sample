FROM node:18-alpine

WORKDIR /app

# python3/make/g++ are needed to build better-sqlite3 from source when no
# prebuilt musl (alpine) binary is available for this platform.
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ src/

COPY start.js .
COPY src/subscriber.js .
COPY swagger.yaml .

EXPOSE 3000

CMD ["node", "start.js"]