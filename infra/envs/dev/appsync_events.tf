# AppSync Events API — real-time pub/sub for in-session domain events (playback.scheduled,
# partner.ready, session.reconnecting, ...). The API publishes over HTTP; the two mobile clients
# subscribe over WebSocket to channel /caraoke/session/<sessionId> (namespace "caraoke").
#
# Auth: API_KEY for the road test (server publishes with x-api-key; clients subscribe with the
# same key, which the app embeds by design). Harden later to Cognito-authed subscribe + a
# separate publish credential so a client can't forge events.

resource "aws_appsync_api" "events" {
  name = "${local.name_prefix}-events"

  event_config {
    auth_provider {
      auth_type = "API_KEY"
    }
    connection_auth_mode {
      auth_type = "API_KEY"
    }
    default_publish_auth_mode {
      auth_type = "API_KEY"
    }
    default_subscribe_auth_mode {
      auth_type = "API_KEY"
    }
  }
}

resource "aws_appsync_channel_namespace" "caraoke" {
  api_id = aws_appsync_api.events.api_id
  name   = "caraoke"
}

resource "aws_appsync_api_key" "events" {
  api_id      = aws_appsync_api.events.api_id
  description = "Caraoke session events (publish + subscribe)"
  # AppSync API keys default to a 7-day expiry — set ~1 year so it doesn't silently expire
  # mid-test (max allowed is 365 days). NOTE: still needs rotation before this date, which means
  # updating the EAS env var + rebuilding the apps. The real fix is Cognito-auth (deferred).
  expires = "2027-07-01T00:00:00Z"
}

# The raw DNS map (HTTP + REALTIME endpoints) — surfaced so URL construction can be corrected
# if the key names differ from the expected HTTP/REALTIME.
output "appsync_dns" {
  description = "AppSync Events endpoints map."
  value       = aws_appsync_api.events.dns
}

output "appsync_realtime_url" {
  description = "EXPO_PUBLIC_APPSYNC_REALTIME_URL for the mobile client."
  value       = "wss://${aws_appsync_api.events.dns["REALTIME"]}/event/realtime"
}

output "appsync_api_key" {
  description = "EXPO_PUBLIC_APPSYNC_API_KEY (also the API's publish key)."
  value       = aws_appsync_api_key.events.key
  sensitive   = true
}
