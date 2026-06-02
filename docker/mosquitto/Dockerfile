FROM eclipse-mosquitto:2.0

COPY mosquitto.conf /mosquitto/config/mosquitto.conf
COPY passwd /mosquitto/config/passwd
COPY acl /mosquitto/config/acl

RUN chmod 600 /mosquitto/config/passwd && chmod 644 /mosquitto/config/acl