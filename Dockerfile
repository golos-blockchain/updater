FROM node:16.1 as build

WORKDIR /var/app
COPY . /var/app
RUN yarn install

FROM node:16.1-alpine

WORKDIR /var/app
COPY --from=build /var/app /var/app

ENV PORT 3000
ENV NODE_ENV production

EXPOSE 3000
CMD [ "yarn", "run", "prod" ]
