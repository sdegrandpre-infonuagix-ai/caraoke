# module: livekit — self-hosted SFU (Story 1.5)

Runs the **LiveKit** open-source SFU on ECS Fargate in `ca-central-1`, fronted by a Network
Load Balancer (TCP signaling + UDP media). This is the production live-voice plane for Epic 4
and is **independent of the throwaway WebRTC** in `tools/phase0-harness` (Story 1.3).

## Guarantees

- **Residency (NFR10):** all resources are in-region; the module is only ever instantiated
  from a Canadian-region env root.
- **Distributed state (AR6):** the SFU points at the existing `redis` module's endpoint over
  TLS (`redis.use_tls`), so multiple SFU tasks share state and scale horizontally.
- **Encryption (NFR6):** WebRTC media is **SRTP/DTLS end-to-end** by construction — that is
  how LiveKit/WebRTC transports media; nothing extra to configure. Redis is reached over TLS.
  API keys live in **KMS-encrypted Secrets Manager** (`<prefix>/livekit`), injected at
  runtime via the `LIVEKIT_KEYS` container secret — never inline in config or state.
- **Health checks:** each NLB target group health-checks the SFU (TCP probe on the signaling
  port). The API media integration also exposes an application-level health check
  (`services/api/src/integrations/media`).

## Set the API keys (out-of-band)

The secret value is a `apikey: secret` YAML map, e.g.:

```bash
aws secretsmanager put-secret-value \
  --secret-id caraoke-dev/livekit \
  --secret-string 'devkey: <generate-a-strong-secret>' \
  --region ca-central-1
```

## Path to the Bell Wavelength Zone (NFR5)

Phase 0 measures real Bell-cellular voice latency against ≤150ms (NFR3). If the last few
milliseconds matter, relocate the SFU to the **Montreal Bell Wavelength Zone** with the same
deployment shape:

1. Add a Wavelength subnet + carrier gateway in the `vpc` module (carrier-IP egress).
2. Set this module's `private_subnet_ids` to the Wavelength subnet and place the task there;
   keep Redis in the parent Region (LiveKit↔Redis over the VPC).
3. Advertise the carrier IP (set `rtc.node_ip`) so clients reach media at the edge.

The client-facing contract (signaling URL + keys) is unchanged, so only infra moves — the
app and the media integration abstraction stay the same.

## Known caveat (Fargate + NLB media)

Behind an NLB, `rtc.use_external_ip` auto-detects the task IP, not the NLB address. For a
single-task dev SFU this is usually fine; for production, pin `rtc.node_ip` to the NLB/EIP
(or move to the Wavelength/EC2 shape above). Tracked for the Epic 4 hardening pass.
