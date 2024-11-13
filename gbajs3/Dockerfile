# first stage - builder
FROM node:20.12.1-alpine3.19 AS builder
WORKDIR /app
COPY . /app

ARG CLIENT_HOST
ENV VITE_GBA_SERVER_LOCATION=${CLIENT_HOST}

RUN npm install
RUN npm run build

# second stage, server
FROM nginx:stable-alpine

LABEL org.opencontainers.image.source https://github.com/thenick775/gbajs3

COPY ./docker/nginx.conf.template /etc/nginx/templates/nginx.conf.template

# copy build
COPY --from=builder /app/dist /var/www/

# install fail2ban, fail2ban config
RUN apk add rsyslog fail2ban

COPY ./docker/fail2ban/jail.conf /etc/fail2ban/jail.conf
COPY ./docker/fail2ban/nginx-*.conf /etc/fail2ban/filter.d/
COPY ./docker/fail2ban/alljailstatus.sh /etc/fail2ban/custom/alljailstatus.sh
COPY ./docker/fail2ban/bancountall.sh /etc/fail2ban/custom/bancountall.sh
ENV PATH="${PATH}:/etc/fail2ban/custom/"
RUN touch /var/log/fail2ban.log

COPY ./docker/entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

CMD ["nginx", "-g", "daemon off;"]
