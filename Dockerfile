FROM node:16.16.0-alpine
WORKDIR /app
COPY package.json /app
COPY package-lock.json /app
COPY . /app
RUN npm i
ENTRYPOINT [ "node", "./index.js"]
