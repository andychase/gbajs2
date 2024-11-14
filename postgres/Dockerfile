FROM postgres:15.2-alpine

LABEL org.opencontainers.image.source https://github.com/thenick775/gbajs3

# copy the initialization script to the container,
# this will create the go-admin db structure as
# well as initialize gbajs3 specific content
COPY ./init_admin_db.sql /docker-entrypoint-initdb.d/
COPY ./init_gbajs3_db.sql /docker-entrypoint-initdb.d/

# replace env vars (sql)
ARG PG_DB_USER
RUN sed -i "s;<PG_DB_USER>;${PG_DB_USER};" /docker-entrypoint-initdb.d/init_admin_db.sql && \
	sed -i "s;<PG_DB_USER>;${PG_DB_USER};" /docker-entrypoint-initdb.d/init_gbajs3_db.sql

RUN chmod +x /docker-entrypoint-initdb.d/init_admin_db.sql && \
	chmod +x /docker-entrypoint-initdb.d/init_gbajs3_db.sql

# run the PostgreSQL server
CMD ["postgres"]