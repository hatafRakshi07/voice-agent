# Asterisk PBX container
#
# Uses the official Asterisk 20 LTS image.
# Our config files are bind-mounted in at runtime (see docker-compose.yml).
# Recordings are stored in /var/spool/asterisk/recording and shared with
# the backend container via the "recordings" named volume.

FROM asterisk:20

# Remove bundled sample configs that conflict with ours
RUN rm -f /etc/asterisk/pjsip.conf \
          /etc/asterisk/extensions.conf \
          /etc/asterisk/modules.conf \
          /etc/asterisk/logger.conf

# Expose SIP (UDP+TCP) and RTP range
EXPOSE 5060/udp 5060/tcp 10000-10099/udp

# Healthcheck — Asterisk responds to AMI on 5038 but we use a simpler check
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD asterisk -rx "core show version" || exit 1

CMD ["asterisk", "-f", "-vvv"]
