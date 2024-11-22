FROM node:lts-alpine as ts-compiler
WORKDIR /usr/app
COPY package*.json ./
COPY tsconfig*.json ./
RUN npm install
COPY . ./
RUN npm run build

FROM node:lts-alpine as ts-remover
WORKDIR /usr/app
COPY --from=ts-compiler /usr/app/package*.json ./
COPY --from=ts-compiler /usr/app/build ./
RUN npm install --omit=dev

FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /usr/app
COPY --from=ts-remover /usr/app ./
USER 1000
ENV NODE_ENV=production
CMD ["index.js"]