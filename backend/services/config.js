const PLACEHOLDER_VALUES = new Set([
  "your_client_id_here",
  "your_client_secret_here",
  "your_org_name",
  "your_tenant_name",
  "your_folder_name",
  "your_folder_id",
  "insurance-card-agent",
]);

function isMissing(value) {
  if (!value) {
    return true;
  }

  return PLACEHOLDER_VALUES.has(value);
}

function assertUiPathConfig(requiredKeys) {
  const missingKeys = requiredKeys.filter((key) => isMissing(process.env[key]));

  if (missingKeys.length > 0) {
    const error = new Error(
      `UiPath configuration is incomplete. Missing: ${missingKeys.join(", ")}`,
    );
    error.statusCode = 500;
    throw error;
  }
}

module.exports = {
  assertUiPathConfig,
};
