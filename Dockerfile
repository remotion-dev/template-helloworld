# This is a dockerized version of a server that you can easily deploy somewhere.
# If you don't want server rendering, you can safely delete this file.

FROM buildkite/puppeteer:5.2.1

COPY package*.json ./
COPY tsconfig.json ./
COPY src src
COPY *.ts .
COPY *.tsx .

RUN apt clean
RUN apt update

RUN apt install -y ffmpeg
RUN npm i



EXPOSE 8000

CMD ["npm", "run", "server"] 
