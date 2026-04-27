const axios = require("axios");
const FormData = require("form-data");

const { getAccessToken } = require("./auth");
const { assertUiPathConfig } = require("./config");

function getOrchestratorBaseUrl() {
  const org = process.env.UIPATH_ORG_NAME;
  const tenant = process.env.UIPATH_TENANT_NAME;

  return `https://cloud.uipath.com/${org}/${tenant}/orchestrator_/odata`;
}

function getFolderHeaders() {
  if (process.env.UIPATH_FOLDER_ID) {
    return {
      "X-UIPATH-OrganizationUnitId": process.env.UIPATH_FOLDER_ID,
    };
  }

  return {
    "X-UIPATH-FolderPath": process.env.UIPATH_FOLDER_NAME,
  };
}

async function uploadAttachment(file) {
  assertUiPathConfig(["UIPATH_ORG_NAME", "UIPATH_TENANT_NAME"]);
  const token = await getAccessToken();
  const form = new FormData();

  form.append("file", file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype,
  });

  try {
    const response = await axios.post(
      `${getOrchestratorBaseUrl()}/JobAttachments/UiPath.Server.Configuration.OData.UploadJobAttachment`,
      form,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          ...getFolderHeaders(),
          ...form.getHeaders(),
        },
        maxBodyLength: Infinity,
      },
    );

    return {
      ID: response.data.Key,
      FullName: response.data.FullName || file.originalname,
      MimeType: response.data.MimeType || file.mimetype,
    };
  } catch (_error) {
    if (_error.statusCode) {
      throw _error;
    }

    const providerMessage = _error.response?.data?.message;
    const uploadError = new Error(providerMessage || "Failed to upload card image");
    uploadError.statusCode = 500;
    throw uploadError;
  }
}

module.exports = {
  uploadAttachment,
};
