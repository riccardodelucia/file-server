FROM node:16 as debug

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY src ./src

CMD ["npm", "start"]