#!/usr/bin/env bash

#  WSO2 Identity Platform (Asgardeo) tenant setup for OpenATS,
#
# Prerequisites:
#   1. A tenant at https://console.asgardeo.io
#   2. An M2M application in that tenant (Applications -> New Application ->
#      M2M Application) with these APIs authorized on its API Authorization tab:
#        - Application Management API
#        - API Resource Management API
#        - Role Management API (v2)
#        - SCIM2 Users API
#   3. curl and jq installed
#
# Usage:
#   ./setup-asgardeo.sh                 # prompts for everything
#   DEBUG=1 ./setup-asgardeo.sh         # prints every request/response
#
#   Or non-interactively:
#   ASGARDEO_ORG=myorg SETUP_CLIENT_ID=xxx SETUP_CLIENT_SECRET=yyy ./setup-asgardeo.sh
#
# Note on API paths: this configures the ROOT organization, so all paths are
# /api/server/v1/... and /scim2/... The /o/ prefixed variants are only for B2B
# sub-organizations, which does not use in this script.

set -uo pipefail

DEBUG="${DEBUG:-0}"

step()  { echo ""; echo "🔧 $1"; }
ok()    { echo "   ✅ $1"; }
warn()  { echo "   ⚠️  $1" >&2; }
info()  { echo "   $1"; }
fail()  { echo ""; echo "   ❌ $1" >&2; exit 1; }
debug() { [ "$DEBUG" = "1" ] && echo "   🐛 $1" >&2; return 0; }

command -v curl >/dev/null 2>&1 || fail "curl is required. Install it and re-run."
command -v jq   >/dev/null 2>&1 || fail "jq is required. Install it and re-run."

echo "🚀 OpenATS Asgardeo setup"
echo "This configures your Asgardeo tenant automatically."
[ "$DEBUG" = "1" ] && echo "(debug mode on: full requests and responses will be printed)"

if [ -z "${ASGARDEO_ORG:-}" ]; then
  read -rp "🏢 Asgardeo org name (from console.asgardeo.io/t/<org>): " ASGARDEO_ORG
fi
if [ -z "${SETUP_CLIENT_ID:-}" ]; then
  read -rp "🔑 M2M app client ID: " SETUP_CLIENT_ID
fi
if [ -z "${SETUP_CLIENT_SECRET:-}" ]; then
  read -rsp "🔑 M2M app client secret: " SETUP_CLIENT_SECRET
  echo
fi

[ -n "${ASGARDEO_ORG:-}" ]         || fail "Org name is required"
[ -n "${SETUP_CLIENT_ID:-}" ]      || fail "Client ID is required"
[ -n "${SETUP_CLIENT_SECRET:-}" ]  || fail "Client secret is required"

BASE_URL="https://api.asgardeo.io/t/${ASGARDEO_ORG}"
APP_NAME="OpenATS"
REDIRECT_URI="http://localhost:3000"

APP_TEMPLATE_ID="nextjs-application"

USER_STORE="${USER_STORE:-DEFAULT}"

HTTP_STATUS=""
HTTP_BODY=""

api_call() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  local content_type="${4:-application/json}"

  local attempt=1
  local max_attempts=3
  local raw curl_exit

  while [ $attempt -le $max_attempts ]; do
    debug "${method} ${url}"
    [ -n "$data" ] && debug "request body: ${data}"

    if [ -n "$data" ]; then
      raw=$(curl -sS -m 60 -w $'\n%{http_code}' -X "$method" "$url" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: ${content_type}" \
        -H "Accept: application/json" \
        -d "$data" 2>&1)
      curl_exit=$?
    else
      raw=$(curl -sS -m 60 -w $'\n%{http_code}' -X "$method" "$url" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Accept: application/json" 2>&1)
      curl_exit=$?
    fi

    if [ $curl_exit -eq 0 ]; then
      HTTP_STATUS=$(echo "$raw" | tail -n1)
      HTTP_BODY=$(echo "$raw" | sed '$d')
      debug "response ${HTTP_STATUS}: ${HTTP_BODY}"

      case "$HTTP_STATUS" in
        2*) return 0 ;;
        *)  return 1 ;;
      esac
    fi

    warn "Network problem talking to Asgardeo (curl exit ${curl_exit}), attempt ${attempt}/${max_attempts}"
    debug "curl output: ${raw}"
    attempt=$((attempt + 1))
    [ $attempt -le $max_attempts ] && sleep 2
  done

  HTTP_STATUS="000"
  HTTP_BODY=""
  return 1
}

show_error() {
  local label="$1"
  warn "${label} failed (HTTP ${HTTP_STATUS})"
  if [ -n "$HTTP_BODY" ]; then
    echo "$HTTP_BODY" | jq . 2>/dev/null || echo "$HTTP_BODY"
  else
    echo "   (empty response body)"
  fi
}

step "Getting management access token"

REQUESTED_SCOPES="internal_application_mgt_create internal_application_mgt_update \
internal_application_mgt_view internal_application_mgt_delete \
internal_application_internal_api_update internal_application_business_api_update \
internal_application_mgt_client_secret_view internal_application_mgt_client_secret_create \
internal_api_resource_create internal_api_resource_view internal_api_resource_update \
internal_role_mgt_create internal_role_mgt_view internal_role_mgt_update \
internal_role_mgt_delete internal_role_mgt_users_update internal_role_mgt_groups_update \
internal_role_mgt_permissions_update \
internal_user_mgt_create internal_user_mgt_view internal_user_mgt_list \
internal_user_mgt_update internal_user_mgt_delete"

TOKEN_RAW=$(curl -sS -m 60 -w $'\n%{http_code}' -X POST "${BASE_URL}/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "${SETUP_CLIENT_ID}:${SETUP_CLIENT_SECRET}" \
  --data-urlencode "grant_type=client_credentials" \
  --data-urlencode "scope=${REQUESTED_SCOPES}" 2>&1)
TOKEN_CURL_EXIT=$?

if [ $TOKEN_CURL_EXIT -ne 0 ]; then
  echo "$TOKEN_RAW"
  fail "Could not reach ${BASE_URL}/oauth2/token (curl exit ${TOKEN_CURL_EXIT}). Check your network and that the org name '${ASGARDEO_ORG}' is correct."
fi

TOKEN_STATUS=$(echo "$TOKEN_RAW" | tail -n1)
TOKEN_BODY=$(echo "$TOKEN_RAW" | sed '$d')
debug "token response ${TOKEN_STATUS}: ${TOKEN_BODY}"

TOKEN=$(echo "$TOKEN_BODY" | jq -r '.access_token // empty' 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "$TOKEN_BODY" | jq . 2>/dev/null || echo "$TOKEN_BODY"
  fail "Could not get an access token (HTTP ${TOKEN_STATUS}). Check the client ID/secret and that the M2M app is authorized for the required APIs."
fi

GRANTED_SCOPES=$(echo "$TOKEN_BODY" | jq -r '.scope // empty')
ok "Got token"
[ -n "$GRANTED_SCOPES" ] && info "Granted scopes: ${GRANTED_SCOPES}"

for required in internal_application_mgt_create internal_application_internal_api_update internal_role_mgt_create internal_user_mgt_create; do
  case " $GRANTED_SCOPES " in
    *" $required "*) ;;
    *) warn "Scope '${required}' was not granted. Authorize the matching API on your M2M app or some steps will fail." ;;
  esac
done


# Application creating step(nextjs type template)
step "Creating application '${APP_NAME}'"

APP_ID=""
if api_call GET "${BASE_URL}/api/server/v1/applications?filter=name+eq+${APP_NAME}"; then
  APP_ID=$(echo "$HTTP_BODY" | jq -r '.applications[0].id // empty')
fi

if [ -n "$APP_ID" ]; then
  ok "App already exists (id: ${APP_ID}), reusing it"
else
  CREATE_APP_PAYLOAD=$(jq -n \
    --arg name "$APP_NAME" \
    --arg templateId "$APP_TEMPLATE_ID" \
    --arg redirectUri "$REDIRECT_URI" \
    '{
      name: $name,
      description: "OpenATS local development application",
      templateId: $templateId,
      advancedConfigurations: {
        discoverableByEndUsers: false,
        skipLoginConsent: true,
        skipLogoutConsent: true
      },
      authenticationSequence: {
        type: "DEFAULT",
        steps: [
          { id: 1, options: [ { idp: "LOCAL", authenticator: "basic" } ] }
        ]
      },
      inboundProtocolConfiguration: {
        oidc: {
          grantTypes: ["authorization_code"],
          publicClient: false,
          callbackURLs: [$redirectUri]
        }
      }
    }')

  if api_call POST "${BASE_URL}/api/server/v1/applications" "$CREATE_APP_PAYLOAD"; then
    APP_ID=$(echo "$HTTP_BODY" | jq -r '.id // empty' 2>/dev/null)
    # 201 often returns an empty body with a Location header, so look it up.
    if [ -z "$APP_ID" ]; then
      if api_call GET "${BASE_URL}/api/server/v1/applications?filter=name+eq+${APP_NAME}"; then
        APP_ID=$(echo "$HTTP_BODY" | jq -r '.applications[0].id // empty')
      fi
    fi
    [ -n "$APP_ID" ] || fail "Application appeared to be created but could not be found by name"
    ok "Created app (id: ${APP_ID})"
  else
    show_error "Creating application"
    fail "Could not create the application"
  fi
fi

# OIDC protocol config
step "Configuring OIDC protocol settings"

OIDC_CURRENT=""
if api_call GET "${BASE_URL}/api/server/v1/applications/${APP_ID}/inbound-protocols/oidc"; then
  OIDC_CURRENT="$HTTP_BODY"
else
  warn "Could not read current OIDC config, will send a fresh one"
fi

if [ -n "$OIDC_CURRENT" ]; then
  OIDC_PAYLOAD=$(echo "$OIDC_CURRENT" | jq \
    --arg redirectUri "$REDIRECT_URI" \
    '
      # clientId and clientSecret must be kept: the API validates them on
      # update and rejects the request with "Invalid ClientID provided" if
      # they are missing. Only .state is server-managed and read-only.
      del(.state)
      | .grantTypes = ["authorization_code", "client_credentials", "refresh_token"]
      | .publicClient = false
      | .callbackURLs = [$redirectUri]
      | .allowedOrigins = ["http://localhost:3000"]
      | .accessToken = ((.accessToken // {})
          | .type = "JWT"
          | .userAccessTokenExpiryInSeconds = 3600
          | .applicationAccessTokenExpiryInSeconds = 3600
          | .accessTokenAttributes = [
              "http://wso2.org/claims/emailaddress",
              "http://wso2.org/claims/givenname",
              "http://wso2.org/claims/lastname",
              "http://wso2.org/claims/roles",
              "http://wso2.org/claims/applicationRoles"
            ])
      | .refreshToken = ((.refreshToken // {}) | .renewRefreshToken = true)
    ')
else
  OIDC_PAYLOAD=$(jq -n --arg redirectUri "$REDIRECT_URI" \
    '{
      grantTypes: ["authorization_code", "client_credentials", "refresh_token"],
      publicClient: false,
      callbackURLs: [$redirectUri],
      allowedOrigins: [$redirectUri],
      accessToken: {
        type: "JWT",
        userAccessTokenExpiryInSeconds: 3600,
        applicationAccessTokenExpiryInSeconds: 3600,
        accessTokenAttributes: [
          "http://wso2.org/claims/emailaddress",
          "http://wso2.org/claims/givenname",
          "http://wso2.org/claims/lastname",
          "http://wso2.org/claims/roles",
          "http://wso2.org/claims/applicationRoles"
        ]
      },
      refreshToken: { renewRefreshToken: true }
    }')
fi

if api_call PUT "${BASE_URL}/api/server/v1/applications/${APP_ID}/inbound-protocols/oidc" "$OIDC_PAYLOAD"; then
  ok "Grant types, allowed origins, JWT access token attributes and refresh token renewal set"
else
  show_error "Configuring OIDC protocol"
  warn "Set grant types and JWT access token manually on the app's Protocol tab"
fi

step "Configuring requested claims"

CLAIMS_PAYLOAD='{
  "claimConfiguration": {
    "dialect": "LOCAL",
    "requestedClaims": [
      { "claim": { "uri": "http://wso2.org/claims/emailaddress" }, "mandatory": false },
      { "claim": { "uri": "http://wso2.org/claims/givenname" },    "mandatory": false },
      { "claim": { "uri": "http://wso2.org/claims/lastname" },     "mandatory": false },
      { "claim": { "uri": "http://wso2.org/claims/roles" },        "mandatory": false },
      { "claim": { "uri": "http://wso2.org/claims/applicationRoles" }, "mandatory": false }
    ]
  }
}'

if api_call PATCH "${BASE_URL}/api/server/v1/applications/${APP_ID}" "$CLAIMS_PAYLOAD"; then
  ok "Claims configured (email, given name, last name, roles, application roles)"
else
  show_error "Configuring claims"
  warn "Add these on the app's User Attributes tab manually if needed"
fi

step "Setting username/password login flow"

BASIC_AUTHENTICATOR=""
if api_call GET "${BASE_URL}/api/server/v1/authenticators"; then
  BASIC_AUTHENTICATOR=$(echo "$HTTP_BODY" | jq -r '
    ( if type == "array" then . else (.authenticators // []) end )
    | map(select((.type // "") == "LOCAL" or (.definedBy // "") == "SYSTEM"))
    | map(select((.name // "") | ascii_downcase | test("basic")))
    | .[0].name // empty' 2>/dev/null)
  debug "discovered basic authenticator: ${BASIC_AUTHENTICATOR:-<none>}"
fi

AUTH_CANDIDATES=()
[ -n "$BASIC_AUTHENTICATOR" ] && AUTH_CANDIDATES+=("$BASIC_AUTHENTICATOR")
AUTH_CANDIDATES+=("BasicAuthenticator" "basic")

FLOW_SET=0
for CANDIDATE in "${AUTH_CANDIDATES[@]}"; do
  AUTH_FLOW_PAYLOAD=$(jq -n --arg auth "$CANDIDATE" \
    '{
      authenticationSequence: {
        type: "USER_DEFINED",
        steps: [ { id: 1, options: [ { idp: "LOCAL", authenticator: $auth } ] } ],
        subjectStepId: 1,
        attributeStepId: 1
      }
    }')

  if api_call PATCH "${BASE_URL}/api/server/v1/applications/${APP_ID}" "$AUTH_FLOW_PAYLOAD"; then
    ok "Login flow set to username/password (authenticator: ${CANDIDATE})"
    FLOW_SET=1
    break
  fi
  debug "authenticator '${CANDIDATE}' rejected, trying next"
done

if [ $FLOW_SET -eq 0 ]; then
  show_error "Setting login flow"
  warn "Leaving the default login flow, which is already username/password. No action needed unless you want a custom flow."
fi

step "Enabling app-native authentication API"

if api_call PATCH "${BASE_URL}/api/server/v1/applications/${APP_ID}" \
  '{ "advancedConfigurations": { "enableAPIBasedAuthentication": true } }'; then
  ok "App-native authentication enabled"
else
  show_error "Enabling app-native authentication"
fi

step "Authorizing SCIM2 / role / credential management APIs"

RESOURCE_NAMES=(
  "SCIM2 Users API"
  "SCIM2 Roles V1/V2 API"
  "SCIM2 Roles V3 API"
  "User Credential Management API"
  "User Credential Management API v2"
)

get_resource_scopes() {
  local resource_id="$1"
  if api_call GET "${BASE_URL}/api/server/v1/api-resources/${resource_id}/scopes"; then
    echo "$HTTP_BODY" | jq -r '
      ( if type == "array" then . else (.scopes // []) end )
      | [ .[].name ] | join(" ")' 2>/dev/null
    return 0
  fi
  if api_call GET "${BASE_URL}/api/server/v1/api-resources/${resource_id}"; then
    echo "$HTTP_BODY" | jq -r '[ (.scopes // [])[].name ] | join(" ")' 2>/dev/null
    return 0
  fi
  echo ""
  return 1
}

ALL_RESOURCES=""
TENANT_FILTER=$(printf 'type eq TENANT' | jq -sRr @uri)
if api_call GET "${BASE_URL}/api/server/v1/api-resources?limit=100&filter=${TENANT_FILTER}"; then
  ALL_RESOURCES="$HTTP_BODY"
elif api_call GET "${BASE_URL}/api/server/v1/api-resources?limit=100"; then
  warn "Type-filtered lookup failed, falling back to the unfiltered list"
  ALL_RESOURCES="$HTTP_BODY"
else
  show_error "Listing API resources"
  warn "Skipping API authorization, do it manually on the app's API Authorization tab"
fi

if [ -n "$ALL_RESOURCES" ]; then
  RESOURCE_COUNT=$(echo "$ALL_RESOURCES" | jq -r '(.apiResources // []) | length' 2>/dev/null)
  debug "found ${RESOURCE_COUNT} API resources"
  debug "names: $(echo "$ALL_RESOURCES" | jq -r '[.apiResources[]?.name] | join(", ")' 2>/dev/null)"

  for RESOURCE_NAME in "${RESOURCE_NAMES[@]}"; do
    # Exact match first, then case-insensitive, since Asgardeo renames these
    # slightly between versions.
    RESOURCE_ID=$(echo "$ALL_RESOURCES" | jq -r --arg name "$RESOURCE_NAME" \
      '.apiResources[]? | select(.name == $name) | .id' | head -n1)

    if [ -z "$RESOURCE_ID" ]; then
      RESOURCE_ID=$(echo "$ALL_RESOURCES" | jq -r --arg name "$RESOURCE_NAME" \
        '.apiResources[]? | select((.name // "" | ascii_downcase) == ($name | ascii_downcase)) | .id' | head -n1)
    fi

    if [ -z "$RESOURCE_ID" ]; then
      warn "API resource '${RESOURCE_NAME}' not found in this tenant, skipping"
      continue
    fi

    RESOURCE_SCOPES=$(get_resource_scopes "$RESOURCE_ID")
    if [ -z "$RESOURCE_SCOPES" ]; then
      warn "Could not read scopes for '${RESOURCE_NAME}', skipping"
      continue
    fi
    debug "${RESOURCE_NAME} scopes: ${RESOURCE_SCOPES}"

    SCOPES_JSON=$(echo "$RESOURCE_SCOPES" | tr ' ' '\n' | jq -R . | jq -s 'map(select(length > 0))')
    AUTHORIZE_PAYLOAD=$(jq -n --arg id "$RESOURCE_ID" --argjson scopes "$SCOPES_JSON" \
      '{ id: $id, policyIdentifier: "RBAC", scopes: $scopes }')

    if api_call POST "${BASE_URL}/api/server/v1/applications/${APP_ID}/authorized-apis" "$AUTHORIZE_PAYLOAD"; then
      ok "Authorized ${RESOURCE_NAME}"
    else
      # 409 just means it is already authorized.
      if [ "$HTTP_STATUS" = "409" ]; then
        ok "${RESOURCE_NAME} already authorized"
      elif [ "$HTTP_STATUS" = "403" ]; then
        show_error "Authorizing ${RESOURCE_NAME}"
        warn "403 here usually means the M2M app is missing the 'internal_application_internal_api_update' scope."
        warn "In the console, open your M2M app > API Authorization > Application Management API and tick all scopes."
      else
        show_error "Authorizing ${RESOURCE_NAME}"
      fi
    fi
  done

  info "Tip: run with DEBUG=1 to see every API resource name available in your tenant."
fi

FULL_SCOPES="openid profile email offline_access internal_role_mgt_create internal_role_mgt_delete internal_role_mgt_groups_update internal_role_mgt_meta_create internal_role_mgt_meta_update internal_role_mgt_update internal_role_mgt_users_update internal_role_mgt_view internal_user_credential_mgt_create internal_user_credential_mgt_delete internal_user_credential_mgt_view internal_user_mgt_create internal_user_mgt_delete internal_user_mgt_list internal_user_mgt_update internal_user_mgt_view"

step "Creating application roles"

ROLES_ENDPOINT="${BASE_URL}/scim2/v2/Roles"
SUPER_ADMIN_ROLE_ID=""

for ROLE_NAME in "Super Admin" "Hiring Manager" "Interviewer"; do
  ROLE_ID=""

  ENCODED_FILTER=$(printf 'displayName eq "%s" and audience.value eq "%s"' "$ROLE_NAME" "$APP_ID" \
    | jq -sRr @uri)

  if api_call GET "${ROLES_ENDPOINT}?filter=${ENCODED_FILTER}"; then
    ROLE_ID=$(echo "$HTTP_BODY" | jq -r '.Resources[0].id // empty')
  fi

  if [ -n "$ROLE_ID" ]; then
    ok "Role '${ROLE_NAME}' already exists, reusing it"
  else
    ROLE_PAYLOAD=$(jq -n --arg name "$ROLE_NAME" --arg appId "$APP_ID" \
      '{
        displayName: $name,
        audience: { type: "APPLICATION", value: $appId },
        permissions: [],
        schemas: []
      }')

    if api_call POST "$ROLES_ENDPOINT" "$ROLE_PAYLOAD"; then
      ROLE_ID=$(echo "$HTTP_BODY" | jq -r '.id // empty')
      ok "Created role '${ROLE_NAME}'"
    else
      show_error "Creating role '${ROLE_NAME}'"
    fi
  fi

  [ "$ROLE_NAME" = "Super Admin" ] && SUPER_ADMIN_ROLE_ID="$ROLE_ID"
done

step "Fetching JWKS URI and issuer"

DISCOVERY=$(curl -sS -m 60 "${BASE_URL}/oauth2/token/.well-known/openid-configuration" 2>&1)
if [ $? -eq 0 ]; then
  JWKS_URI=$(echo "$DISCOVERY" | jq -r '.jwks_uri // empty' 2>/dev/null)
  ISSUER=$(echo "$DISCOVERY" | jq -r '.issuer // empty' 2>/dev/null)
  if [ -n "$JWKS_URI" ] && [ -n "$ISSUER" ]; then
    ok "Got JWKS URI and issuer"
  else
    warn "Could not parse the discovery document"
    JWKS_URI=""; ISSUER=""
  fi
else
  warn "Could not fetch the OIDC discovery document"
  JWKS_URI=""; ISSUER=""
fi

step "Creating a test user"

read -rp "   👤 Test user email: " TEST_EMAIL
read -rp "   👤 First name: " TEST_FIRST_NAME
read -rp "   👤 Last name: " TEST_LAST_NAME
read -rsp "   🔒 Password (min 8 chars, upper + lower + digit): " TEST_PASSWORD
echo

USER_ID=""
CREATED_USERNAME=""
create_user() {
  local username="$1"
  local payload
  payload=$(jq -n \
    --arg username "$username" \
    --arg email "$TEST_EMAIL" \
    --arg first "$TEST_FIRST_NAME" \
    --arg last "$TEST_LAST_NAME" \
    --arg password "$TEST_PASSWORD" \
    '{
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      userName: $username,
      password: $password,
      name: { givenName: $first, familyName: $last },
      emails: [ { value: $email, primary: true } ]
    }')
  api_call POST "${BASE_URL}/scim2/Users" "$payload" "application/scim+json"
}

lookup_user() {
  local username="$1"
  local f
  f=$(printf 'userName eq "%s"' "$username" | jq -sRr @uri)
  if api_call GET "${BASE_URL}/scim2/Users?filter=${f}"; then
    echo "$HTTP_BODY" | jq -r '.Resources[0].id // empty'
  fi
}

if [ -n "$TEST_EMAIL" ]; then
  for CANDIDATE_USERNAME in "${USER_STORE}/${TEST_EMAIL}" "${TEST_EMAIL}"; do
    if create_user "$CANDIDATE_USERNAME"; then
      USER_ID=$(echo "$HTTP_BODY" | jq -r '.id // empty')
      CREATED_USERNAME=$(echo "$HTTP_BODY" | jq -r '.userName // empty')
      [ -z "$CREATED_USERNAME" ] && CREATED_USERNAME="$CANDIDATE_USERNAME"
      ok "Test user created (${CREATED_USERNAME})"
      break
    fi

    if [ "$HTTP_STATUS" = "409" ]; then
      warn "User '${CANDIDATE_USERNAME}' already exists, reusing it"
      USER_ID=$(lookup_user "$CANDIDATE_USERNAME")
      if [ -n "$USER_ID" ]; then
        CREATED_USERNAME="$CANDIDATE_USERNAME"
        break
      fi
    fi

    if echo "$HTTP_BODY" | grep -qi "read only"; then
      debug "userstore for '${CANDIDATE_USERNAME}' is read-only, trying next"
      continue
    fi

    show_error "Creating test user as '${CANDIDATE_USERNAME}'"
  done

  if [ -z "$USER_ID" ]; then
    warn "Could not create the test user automatically."
    warn "Create one in the console under User Management > Users, then assign it the Super Admin role."
    warn "If every attempt said 'read only', set USER_STORE=<your writable userstore> and re-run."
  fi
fi

if [ -n "$USER_ID" ] && [ -n "$SUPER_ADMIN_ROLE_ID" ]; then
  ASSIGNED=0
  for ATTEMPT in "qualified" "no-display"; do
    if [ "$ATTEMPT" = "qualified" ]; then
      ASSIGN_PAYLOAD=$(jq -n --arg userId "$USER_ID" --arg display "${CREATED_USERNAME:-$TEST_EMAIL}" \
        '{
          schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
          Operations: [
            { op: "add", value: { users: [ { value: $userId, display: $display } ] } }
          ]
        }')
    else
      ASSIGN_PAYLOAD=$(jq -n --arg userId "$USER_ID" \
        '{
          schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
          Operations: [
            { op: "add", value: { users: [ { value: $userId } ] } }
          ]
        }')
    fi

    if api_call PATCH "${ROLES_ENDPOINT}/${SUPER_ADMIN_ROLE_ID}" "$ASSIGN_PAYLOAD" "application/scim+json"; then
      ok "Assigned Super Admin to ${CREATED_USERNAME:-$TEST_EMAIL}"
      ASSIGNED=1
      break
    fi
    debug "role assignment attempt '${ATTEMPT}' failed"
  done

  if [ $ASSIGNED -eq 0 ]; then
    show_error "Assigning Super Admin role"
    warn "Assign it manually under User Management > Roles > Super Admin > Users"
  fi
elif [ -n "$USER_ID" ]; then
  warn "Super Admin role id unknown, assign the role manually in the console"
fi

# UPDATING .envs
# if api_call GET "${BASE_URL}/api/server/v1/applications/${APP_ID}"; then
#   CLIENT_ID=$(echo "$HTTP_BODY" | jq -r '.clientId // empty')
#   CLIENT_SECRET=$(echo "$HTTP_BODY" | jq -r '.clientSecret // empty')
# fi
#
# echo ""
# echo "──────────────────────────────────────────────────────────"
# echo "📄 frontend/.env"
# echo "──────────────────────────────────────────────────────────"
# echo "NEXT_PUBLIC_ASGARDEO_BASE_URL=${BASE_URL}"
# echo "NEXT_PUBLIC_ASGARDEO_CLIENT_ID=${CLIENT_ID}"
# echo "ASGARDEO_CLIENT_SECRET=${CLIENT_SECRET}"
# echo "NEXT_PUBLIC_ASGARDEO_SCOPES=\"${FULL_SCOPES}\""
# echo ""
# echo "──────────────────────────────────────────────────────────"
# echo "📄 backend/.env"
# echo "──────────────────────────────────────────────────────────"
# echo "ASGARDEO_JWKS_URL=${JWKS_URI}"
# echo "ASGARDEO_ISSUER=${ISSUER}"
# echo "──────────────────────────────────────────────────────────"

echo ""
echo "🎉 DONE"
echo "   App id:   ${APP_ID}"
echo "   Console:  https://console.asgardeo.io/t/${ASGARDEO_ORG}/develop/applications/${APP_ID}"
[ -n "$TEST_EMAIL" ] && echo "   Login as: ${CREATED_USERNAME:-$TEST_EMAIL} (Super Admin)"
echo ""
echo "   .env output is commented out at the bottom of this script."
echo "   Uncomment that block when you want the client ID/secret printed."
