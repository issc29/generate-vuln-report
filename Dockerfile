# specify the node base image with your desired version node:<version>
FROM 14.5.0-alpine3.10

WORKDIR /usr/src/app
COPY package*.json ./

RUN npm install
COPY . .
CMD [ "node", "index.js" ]