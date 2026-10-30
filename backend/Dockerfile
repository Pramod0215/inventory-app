FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node backend ./

USER node
EXPOSE 5000

CMD ["npm", "start"]
