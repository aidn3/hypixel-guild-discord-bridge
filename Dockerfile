FROM node:alpine
LABEL authors="aidn5, HyxonQz"

WORKDIR /app
COPY . /app

RUN npm install

ENTRYPOINT ["npm", "start"]
