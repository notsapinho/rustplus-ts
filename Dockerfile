# ----- BASE ------
FROM node:22-alpine AS stage-base

WORKDIR /app

# ----- DEPENDENCIES ------
FROM stage-base AS stage-dependencies

COPY package.json  ./
COPY yarn.lock ./
COPY .yarnrc.yml ./
COPY .env ./

RUN corepack enable
RUN yarn install

# ----- BUILD ------
FROM stage-dependencies AS stage-build

COPY assets ./assets
COPY tsconfig.json ./
COPY src ./src
COPY .swcrc ./

RUN yarn build

# ----- MAIN ------
FROM stage-build AS stage-prod

ENV NODE_ENV=production
CMD ["yarn", "start:prod"]