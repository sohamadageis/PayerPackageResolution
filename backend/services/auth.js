const axios = require("axios");
const { assertUiPathConfig } = require("./config");

let cachedToken = null;
let tokenExpiresAt = 0;

async function fetchAccessToken() {
  assertUiPathConfig(["UIPATH_CLIENT_ID", "UIPATH_CLIENT_SECRET", "UIPATH_SCOPE"]);
  const scope = process.env.UIPATH_SCOPE || "OR.Default";
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.UIPATH_CLIENT_ID,
    client_secret: process.env.UIPATH_CLIENT_SECRET,
    scope,
  });

  try {
    const response = await axios.post(
      "https://cloud.uipath.com/identity_/connect/token",
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    cachedToken = response.data.access_token;
    tokenExpiresAt = Date.now() + Math.max((response.data.expires_in - 60) * 1000, 60 * 1000);

    return cachedToken;
  } catch (_error) {
    const providerMessage = _error.response?.data?.error;
    const providerDescription = _error.response?.data?.error_description;
    const authError = new Error(
      providerMessage === "invalid_scope"
        ? `Authentication failed: the configured UiPath scope is not allowed for this app.${providerDescription ? ` ${providerDescription}` : ""}`
        : "Authentication failed",
    );
    authError.statusCode = 500;
    throw authError;
  }
}

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  return fetchAccessToken();
}

module.exports = {
  getAccessToken,
};
