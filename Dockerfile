# specify the node base image with your desired version node:<version>
FROM node:14.5.0
RUN apt-get update && apt-get install -y libfontconfig
WORKDIR /github/workspace
COPY . /github/workspace
RUN npm install --production
ENTRYPOINT ["node", "lib/index.js"]