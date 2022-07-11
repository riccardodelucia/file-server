##########################################

FROM node:16 as base

RUN mkdir -p /usr/share/app

WORKDIR /usr/src/app

COPY package*.json ./

COPY src ./src

CMD ["npm", "start"]


##########################################

FROM base as build

ENV NODE_ENV=development

RUN npm install


##########################################

FROM base as prod

ENV NODE_ENV=production

ENV USERNAME=node
ENV GROUPNAME=node
ENV USERNAME_UID=1001
ENV GROUPNAME_GID=1001
RUN groupadd -g ${GROUPNAME_GID} -r ${GROUPNAME} && useradd -l -r -u ${USERNAME_UID} -g ${GROUPNAME} ${USERNAME}

RUN npm install --omit=dev

RUN chmod -R 775 .

USER node
