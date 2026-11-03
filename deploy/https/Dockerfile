FROM caddy:2.11.7-builder-alpine AS builder
RUN xcaddy build v2.11.7 --with github.com/caddy-dns/duckdns@86ea11d23d37c85f3900a8c3093405e2bcd68d2e

FROM caddy:2.11.7-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
# Only unprivileged ports are used inside this container. Remove the official
# image's file capability so the binary works with an empty capability set.
RUN setcap -r /usr/bin/caddy \
    && addgroup -g 10002 bbptls && adduser -D -H -u 10002 -G bbptls bbptls
USER 10002:10002
