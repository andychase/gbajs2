FROM nginx:stable-alpine
COPY ./docker/server/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY ./gbajs3 /var/www

#RUN apk add rsyslog fail2ban

COPY ./docker/server/fail2ban/jail.conf /etc/fail2ban/jail.conf
COPY ./docker/server/fail2ban/nginx-*.conf /etc/fail2ban/filter.d/
COPY ./docker/server/fail2ban/alljailstatus.sh /etc/fail2ban/custom/alljailstatus.sh
COPY ./docker/server/fail2ban/bancountall.sh /etc/fail2ban/custom/bancountall.sh
ENV PATH="${PATH}:/etc/fail2ban/custom/"
RUN touch /var/log/fail2ban.log

COPY ./docker/server/auth/certs /certs

COPY ./docker/server/nginx/entrypoint.sh /entrypoint.sh

CMD ["nginx", "-g", "daemon off;"]
