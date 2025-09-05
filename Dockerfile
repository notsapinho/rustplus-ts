# ----- BASE ------
FROM node:lts AS stage-base

WORKDIR /app

# ----- DEPENDENCIES ------
FROM stage-base AS stage-dependencies
COPY package.json yarn.lock .yarnrc.yml ./
RUN corepack enable
RUN yarn install

# ----- BUILD ------
FROM stage-dependencies AS stage-build

COPY . .
RUN yarn build

# ----- MAIN ------
FROM stage-build AS stage-prod

ENV NODE_ENV=production
CMD ["yarn", "start:prod"]