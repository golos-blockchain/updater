FROM node:16.1

WORKDIR /var/app
COPY . /var/app
RUN yarn install

ENV PORT 3000
ENV NODE_ENV production

EXPOSE 3000
CMD [ "yarn", "run", "prod" ]
