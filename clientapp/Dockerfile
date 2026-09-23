FROM node:20-alpine

WORKDIR /app

COPY clientapp/package*.json ./
RUN npm install

COPY clientapp ./

EXPOSE 3000

CMD ["npm", "run", "dev"]
