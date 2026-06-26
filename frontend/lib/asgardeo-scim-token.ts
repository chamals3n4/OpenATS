let cached: { token: string; expiry: number } | null = null;

const SCIM_LOG = "[SCIM-TOKEN]";

const DEFAULT_SCIM_SCOPES = [
  "internal_user_mgt_create",
  "internal_user_mgt_delete",
  "internal_user_mgt_list",
  "internal_user_mgt_update",
  "internal_user_mgt_view",
  "internal_user_credential_mgt_create",
  "internal_user_credential_mgt_delete",
  "internal_user_credential_mgt_view",
  "internal_role_mgt_create",
  "internal_role_mgt_delete",
  "internal_role_mgt_groups_update",
  "internal_role_mgt_meta_create",
  "internal_role_mgt_meta_update",
  "internal_role_mgt_update",
  "internal_role_mgt_users_update",
  "internal_role_mgt_view",
].join(" ");

export function getAsgardeoApiBase(): string {
  return (
    process.env.NEXT_PUBLIC_ASGARDEO_BASE_URL ||
    process.env.ASGARDEO_BASE_URL ||
    ""
  ).replace(/\/$/, "");
}

export function scimRequestHeaders(
  bearerToken: string,
  withJsonBody: boolean,
): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${bearerToken}`,
    Accept: "application/scim+json",
  };
  if (withJsonBody) h["Content-Type"] = "application/scim+json";
  return h;
}

export async function getScimAccessToken(): Promise<string> {
  if (cached && Date.now() < cached.expiry) {
    console.log(
      `${SCIM_LOG} returning cached token (expires in ${Math.round((cached.expiry - Date.now()) / 1000)}s)`,
    );
    return cached.token;
  }

  const clientId =
    process.env.ASGARDEO_SCIM_CLIENT_ID?.trim() ||
    process.env.ASGARDEO_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_ASGARDEO_CLIENT_ID?.trim();

  const clientSecret =
    process.env.ASGARDEO_SCIM_CLIENT_SECRET?.trim() ||
    process.env.ASGARDEO_CLIENT_SECRET?.trim();

  const baseUrl = getAsgardeoApiBase();

  console.log(`${SCIM_LOG} resolving credentials:`);
  console.log(
    `${SCIM_LOG}   clientId  source: ${
      process.env.ASGARDEO_SCIM_CLIENT_ID
        ? "ASGARDEO_SCIM_CLIENT_ID"
        : process.env.ASGARDEO_CLIENT_ID
          ? "ASGARDEO_CLIENT_ID"
          : "NEXT_PUBLIC_ASGARDEO_CLIENT_ID"
    } → ${clientId?.slice(0, 8)}...`,
  );
  console.log(
    `${SCIM_LOG}   secret    source: ${
      process.env.ASGARDEO_SCIM_CLIENT_SECRET
        ? "ASGARDEO_SCIM_CLIENT_SECRET"
        : process.env.ASGARDEO_CLIENT_SECRET
          ? "ASGARDEO_CLIENT_SECRET"
          : "NOT FOUND"
    } → length=${clientSecret?.length ?? 0}`,
  );
  console.log(`${SCIM_LOG}   baseUrl: ${baseUrl}`);

  if (!clientId || !clientSecret || !baseUrl) {
    const missing = [
      !clientId && "client ID",
      !clientSecret &&
        "client secret (set ASGARDEO_SCIM_CLIENT_SECRET or ASGARDEO_CLIENT_SECRET — NOT ASGARDEO_SECRET)",
      !baseUrl && "base URL",
    ]
      .filter(Boolean)
      .join(", ");
    throw new Error(`${SCIM_LOG} missing: ${missing}`);
  }

  const scope =
    process.env.ASGARDEO_MANAGEMENT_SCOPES?.trim() || DEFAULT_SCIM_SCOPES;

  console.log(`${SCIM_LOG} requesting new token with scopes: ${scope}`);

  const tokenUrl = `${baseUrl}/oauth2/token`;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  let res: Response;
  try {
    res = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({ grant_type: "client_credentials", scope }),
    });
  } catch (networkErr) {
    console.error(
      `${SCIM_LOG} network error reaching ${tokenUrl}:`,
      networkErr,
    );
    throw networkErr;
  }

  const responseText = await res.text();

  if (!res.ok) {
    console.error(`${SCIM_LOG} token request failed — HTTP ${res.status}:`);
    console.error(`${SCIM_LOG}   url: ${tokenUrl}`);
    console.error(`${SCIM_LOG}   body: ${responseText}`);
    throw new Error(
      `${SCIM_LOG} token request failed (${res.status}): ${responseText}`,
    );
  }

  const data = JSON.parse(responseText) as {
    access_token: string;
    expires_in: number;
    scope?: string;
  };

  console.log(`${SCIM_LOG} token obtained successfully`);
  console.log(`${SCIM_LOG}   expires_in: ${data.expires_in}s`);
  console.log(
    `${SCIM_LOG}   granted scopes: ${data.scope ?? "(not returned by server)"}`,
  );

  cached = {
    token: data.access_token,
    expiry: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cached.token;
}
