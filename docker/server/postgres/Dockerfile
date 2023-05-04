FROM postgres:15.2-alpine

# copy the initialization script to the container,
# this will create the go-admin db structure as
# well as initialize gbajs3 specific content
COPY ./server/postgres/init_admin_db.sql /docker-entrypoint-initdb.d/
COPY ./server/postgres/init_gbajs3_db.sql /docker-entrypoint-initdb.d/

RUN chmod +x /docker-entrypoint-initdb.d/init_admin_db.sql
RUN chmod +x /docker-entrypoint-initdb.d/init_gbajs3_db.sql

# run the PostgreSQL server
CMD ["postgres"]