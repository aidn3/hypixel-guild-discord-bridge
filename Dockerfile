FROM node:alpine
LABEL authors="aidn5, HyxonQz"
ENV NODE_ENV=production

WORKDIR /app
COPY . /app

RUN npm install

ENTRYPOINT ["npm", "start"]
