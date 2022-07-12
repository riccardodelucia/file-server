##########################################

FROM node:16 as base

ARG ARG_VERSION=latest
ENV VERSION=$ARG_VERSION
ARG ARG_BUILD=0
ENV BUILD=$ARG_BUILD

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

ENV USERNAME=fileserver
ENV GROUPNAME=fileserver
ENV USERNAME_UID=1001
ENV GROUPNAME_GID=1001
RUN groupadd -g ${GROUPNAME_GID} -r ${GROUPNAME} && useradd -l -r -u ${USERNAME_UID} -g ${GROUPNAME} ${USERNAME} && \
    chmod -R 775 . && \
    npm install --omit=dev

USER node
