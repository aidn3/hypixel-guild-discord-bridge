FROM node:lts-bookworm
LABEL authors="aidn5, HyxonQz"
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*


WORKDIR /app

COPY package* /app
RUN npm install

COPY . /app

ENTRYPOINT ["npm", "start"]
