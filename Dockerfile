# specify the node base image with your desired version node:<version>
FROM node:14.5.0-alpine3.10
COPY . .
RUN npm install --production
ENTRYPOINT ["node", "/lib/index.js"]