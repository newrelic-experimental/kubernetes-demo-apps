FROM node:8-alpine

RUN apk --no-cache add --virtual native-deps \
g++ gcc libgcc libstdc++ linux-headers autoconf automake make nasm python git && \
npm install --quiet node-gyp -g

RUN mkdir -p /usr/src/app/
WORKDIR /usr/src/app/

COPY package.json .
RUN npm install

COPY index.js .
COPY newrelic.js .
COPY views /usr/src/app/views

EXPOSE 3000

CMD [ "node", "index.js" ]
