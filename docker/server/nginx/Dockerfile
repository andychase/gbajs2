# first stage - builder
FROM node:21.1.0-alpine3.18 as builder
WORKDIR /app
COPY ./gbajs3 /app

ARG CLIENT_HOST
ENV VITE_GBA_SERVER_LOCATION=${CLIENT_HOST}

RUN npm install
RUN npm run build

# second stage, server
FROM nginx:stable-alpine
COPY ./docker/server/nginx/nginx.conf.template /etc/nginx/templates/nginx.conf.template

# copy build
COPY --from=builder /app/dist /var/www/

# legacy v1 archived
ARG CLIENT_HOST
COPY ./legacy/v1.zip /var/www/
RUN cd /var/www/ && \
	unzip ./v1.zip && \
	rm ./v1.zip && \
	find ./v1/ -type f -exec sed -i "s;<CLIENT_HOST>;${CLIENT_HOST};" {} +

# install fail2ban, fail2ban config
RUN apk add rsyslog fail2ban

COPY ./docker/server/nginx/fail2ban/jail.conf /etc/fail2ban/jail.conf
COPY ./docker/server/nginx/fail2ban/nginx-*.conf /etc/fail2ban/filter.d/
COPY ./docker/server/nginx/fail2ban/alljailstatus.sh /etc/fail2ban/custom/alljailstatus.sh
COPY ./docker/server/nginx/fail2ban/bancountall.sh /etc/fail2ban/custom/bancountall.sh
ENV PATH="${PATH}:/etc/fail2ban/custom/"
RUN touch /var/log/fail2ban.log

COPY ./docker/server/nginx/entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

CMD ["nginx", "-g", "daemon off;"]
