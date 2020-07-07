# specify the node base image with your desired version node:<version>
FROM node:14.5.0
RUN apt-get update && apt-get install -y libfontconfig
 
ENV app_dir /usr/src/app
WORKDIR ${app_dir}
COPY package*.json ./

RUN npm install --production
COPY . .
ENTRYPOINT ["node", "./lib/index.js"]