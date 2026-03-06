FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
COPY services ./services
COPY frontend-react ./frontend-react
RUN npm install --omit=dev && cd frontend-react && npm install && npm run build

ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}

CMD ["sh", "-c", "node services/${SERVICE_NAME}/src/index.js"]
