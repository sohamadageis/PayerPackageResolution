const axios = require("axios");

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

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function hasFinalDecisionPayload(rawValue) {
  if (!rawValue) {
    return false;
  }

  let parsedValue = rawValue;

  if (typeof rawValue === "string") {
    try {
      parsedValue = JSON.parse(rawValue);
    } catch (_error) {
      return false;
    }
  }

  if (!parsedValue || typeof parsedValue !== "object") {
    return false;
  }

  return (
    typeof parsedValue.decision === "string" &&
    typeof parsedValue.confidence_score !== "undefined" &&
    Array.isArray(parsedValue.top_candidates) &&
    typeof parsedValue.explanation === "string"
  );
}

async function getHeaders() {
  const token = await getAccessToken();

  return {
    Authorization: `Bearer ${token}`,
    ...getFolderHeaders(),
  };
}

async function startAgentJob(inputArguments) {
  try {
    assertUiPathConfig([
      "UIPATH_ORG_NAME",
      "UIPATH_TENANT_NAME",
      "UIPATH_RELEASE_KEY",
    ]);

    const startInfo = {
      ReleaseKey: process.env.UIPATH_RELEASE_KEY,
      Strategy: "JobsCount",
      JobsCount: 1,
      InputArguments: JSON.stringify(inputArguments),
    };

    if (process.env.UIPATH_PROCESS_KEY) {
      startInfo.ProcessKey = process.env.UIPATH_PROCESS_KEY;
    }

    const response = await axios.post(
      `${getOrchestratorBaseUrl()}/Jobs/UiPath.Server.Configuration.OData.StartJobs`,
      {
        startInfo,
      },
      {
        headers: {
          ...(await getHeaders()),
          "Content-Type": "application/json",
        },
      },
    );

    const jobId = response.data?.value?.[0]?.Id;
    if (!jobId) {
      throw new Error("Missing job id");
    }

    return jobId;
  } catch (_error) {
    if (_error.statusCode) {
      throw _error;
    }

    const providerMessage = _error.response?.data?.message;
    const startError = new Error(providerMessage || "Failed to start agent job");
    startError.statusCode = 500;
    throw startError;
  }
}

async function fetchJob(jobId) {
  const response = await axios.get(`${getOrchestratorBaseUrl()}/Jobs(${jobId})`, {
    headers: await getHeaders(),
  });

  return response.data;
}

async function pollJobUntilComplete(jobId) {
  const pollInterval = Number(process.env.POLL_INTERVAL_MS || 3000);
  const timeout = Number(process.env.POLL_TIMEOUT_MS || 180000);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    const job = await fetchJob(jobId);

    if (job.State === "Successful") {
      if (hasFinalDecisionPayload(job.OutputArguments)) {
        return job;
      }
    }

    if (job.State === "Faulted") {
      const faultError = new Error(job.Info || "Agent job failed");
      faultError.statusCode = 500;
      throw faultError;
    }

    if (job.State === "Stopped") {
      const stoppedError = new Error(job.Info || "Agent job stopped");
      stoppedError.statusCode = 500;
      throw stoppedError;
    }

    await wait(pollInterval);
  }

  const timeoutError = new Error("Agent timed out");
  timeoutError.statusCode = 408;
  throw timeoutError;
}

module.exports = {
  startAgentJob,
  pollJobUntilComplete,
};
