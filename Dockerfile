FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY package.json package-lock.json ./

RUN npm install

RUN npm install -g openclaw \
  && ln -sf "$(npm config get prefix)/bin/openclaw" /usr/local/bin/openclaw

COPY . .

ARG DATABASE_URL
ARG NEXT_PUBLIC_AWS_REGION
ARG NEXT_PUBLIC_COGNITO_USER_POOL_ID
ARG NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID

ENV DATABASE_URL=${DATABASE_URL}
ENV NEXT_PUBLIC_AWS_REGION=${NEXT_PUBLIC_AWS_REGION}
ENV NEXT_PUBLIC_COGNITO_USER_POOL_ID=${NEXT_PUBLIC_COGNITO_USER_POOL_ID}
ENV NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=${NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID}

RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]