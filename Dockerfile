FROM node:16 as debug

RUN mkdir -p /usr/share/app

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY src ./src

CMD ["npm", "start"]