# specify the node base image with your desired version node:<version>
FROM node:14.5.0
RUN apt-get update && apt-get install -y libfontconfig
COPY . .
ENV app_dir /
RUN npm install --production
ENTRYPOINT ["node", "/lib/index.js"]