FROM node:lts-bookworm
LABEL authors="aidn5, HyxonQz"
ENV NODE_ENV=production

WORKDIR /app

COPY package* /app
RUN npm install

COPY . /app

ENTRYPOINT ["npm", "start"]
