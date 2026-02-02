FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/dist /app/dist
EXPOSE 9006
CMD ["npx", "serve", "-s", "dist", "-l", "9006"]
