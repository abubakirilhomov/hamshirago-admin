FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g http-server
EXPOSE 3000
CMD sh -c "http-server dist -p ${PORT:-3000} -a 0.0.0.0 --proxy http://0.0.0.0:${PORT:-3000}?"
