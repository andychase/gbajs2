# first stage - minifier
FROM ubuntu:latest as minifier
RUN apt-get update && apt-get install minify
COPY ./gbajs3 /var/www/

# replace env vars (javascript)
ARG CLIENT_HOST
RUN sed -i "s;<CLIENT_HOST>;${CLIENT_HOST};" /var/www/resources/gba-api.js

RUN cd /var/www/ && minify -r --match="(\.js|\.css)" -o . .

# second stage, server
FROM nginx:stable-alpine
COPY ./docker/server/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# replace env vars (nginx conf)
ARG CLIENT_HOST
RUN sed -i "s;<CLIENT_HOST>;${CLIENT_HOST};" /etc/nginx/conf.d/default.conf
COPY --from=minifier /var/www /var/www

# install fail2ban, fail2ban config
RUN apk add rsyslog fail2ban

COPY ./docker/server/fail2ban/jail.conf /etc/fail2ban/jail.conf
COPY ./docker/server/fail2ban/nginx-*.conf /etc/fail2ban/filter.d/
COPY ./docker/server/fail2ban/alljailstatus.sh /etc/fail2ban/custom/alljailstatus.sh
COPY ./docker/server/fail2ban/bancountall.sh /etc/fail2ban/custom/bancountall.sh
ENV PATH="${PATH}:/etc/fail2ban/custom/"
RUN touch /var/log/fail2ban.log

COPY ./docker/server/nginx/entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

CMD ["nginx", "-g", "daemon off;"]
