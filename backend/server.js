const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const uploadsDir = path.join(__dirname, "uploads");
const jobs = {};

let cachedToken = null;
let tokenExpiresAt = 0;

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadsDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname) || ".png";
    callback(null, `${randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 4 * 1024 * 1024,
    files: 4,
  },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      const error = new Error("Only JPG, PNG, and WEBP images are allowed.");
      error.statusCode = 400;
      return callback(error);
    }

    return callback(null, true);
  },
});

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173,http://localhost:5174,https://sohamadageis.github.io")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
  }),
);
app.use(express.json());

function log(message, details) {
  if (details === undefined) {
    console.log(`[backend] ${message}`);
    return;
  }

  console.log(`[backend] ${message}`, details);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    const error = new Error(`Missing required environment variable: ${name}`);
    error.statusCode = 500;
    throw error;
  }

  return value;
}

function normalizeBearerToken(token) {
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

function parseJsonString(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toSingleLineString(value) {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function extractErrorMessage(error) {
  const responseData = error?.response?.data;
  const candidates = [
    responseData?.message,
    responseData?.error?.message,
    responseData?.error_description,
    responseData?.Title,
    responseData?.Detail,
    responseData?.details,
    responseData?.error,
    error?.message,
  ];

  for (const candidate of candidates) {
    const text = toSingleLineString(candidate);
    if (text) {
      return text;
    }
  }

  const fallback = toSingleLineString(responseData);
  if (fallback) {
    return fallback;
  }

  return "Insurance processing failed.";
}

function describeError(error) {
  return {
    message: error?.message || null,
    code: error?.code || null,
    status: error?.response?.status || null,
    statusText: error?.response?.statusText || null,
    data: error?.response?.data || null,
  };
}

function validateRequiredFormFields(formFields) {
  if (!formFields.patientState) {
    const error = new Error("Patient State is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!formFields.patientZip) {
    const error = new Error("Patient ZIP is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!/^\d{5}(?:-\d{4})?$/.test(formFields.patientZip)) {
    const error = new Error("Patient ZIP must be a valid ZIP code.");
    error.statusCode = 400;
    throw error;
  }

  if (!formFields.practiceState) {
    const error = new Error("Practice State is required.");
    error.statusCode = 400;
    throw error;
  }
}

function hasFinalDecisionPayload(outputArguments) {
  const parsedOutput = parseJsonString(outputArguments);

  if (!parsedOutput || typeof parsedOutput !== "object") {
    return false;
  }

  return (
    typeof parsedOutput.decision === "string" &&
    typeof parsedOutput.confidence_score !== "undefined" &&
    Array.isArray(parsedOutput.top_candidates) &&
    typeof parsedOutput.explanation === "string"
  );
}

async function getBearerToken() {
  if (process.env.UIPATH_TOKEN) {
    return normalizeBearerToken(process.env.UIPATH_TOKEN);
  }

  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: requireEnv("UIPATH_CLIENT_ID"),
    client_secret: requireEnv("UIPATH_CLIENT_SECRET"),
    scope: process.env.UIPATH_SCOPE || "OR.Default",
  });

  const response = await axios.post("https://cloud.uipath.com/identity_/connect/token", params.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  cachedToken = `Bearer ${response.data.access_token}`;
  tokenExpiresAt = Date.now() + Math.max((response.data.expires_in - 60) * 1000, 60 * 1000);
  return cachedToken;
}

function getUiPathHeaders(token, extraHeaders = {}) {
  return {
    Authorization: token,
    "X-UIPATH-OrganizationUnitId": requireEnv("UIPATH_FOLDER_ID"),
    ...extraHeaders,
  };
}

async function getAttachmentSeedJobKey() {
  if (process.env.UIPATH_ATTACHMENT_SEED_JOB_KEY) {
    return process.env.UIPATH_ATTACHMENT_SEED_JOB_KEY;
  }

  const token = await getBearerToken();
  const baseUrl = requireEnv("UIPATH_BASE_URL").replace(/\/$/, "");
  const wrapperReleaseName = process.env.UIPATH_WRAPPER_RELEASE_NAME || "PayerWrapper.cloud.api.API.Workflow";
  const response = await axios.get(`${baseUrl}/odata/Jobs`, {
    headers: getUiPathHeaders(token),
    params: {
      $top: 1,
      $orderby: "CreationTime desc",
      $filter: `ReleaseName eq '${wrapperReleaseName.replace(/'/g, "''")}'`,
    },
  });

  const seedJobKey = response.data?.value?.[0]?.Key;
  if (!seedJobKey) {
    throw new Error("Could not find a seed UiPath wrapper job key for attachment creation.");
  }

  return seedJobKey;
}

async function createAttachmentRecord(fileName) {
  const token = await getBearerToken();
  const baseUrl = requireEnv("UIPATH_BASE_URL").replace(/\/$/, "");
  const seedJobKey = await getAttachmentSeedJobKey();

  log("Creating UiPath attachment record", { fileName, seedJobKey });

  const response = await axios.post(
    `${baseUrl}/odata/Attachments`,
    {
      Name: fileName,
      JobKey: seedJobKey,
    },
    {
      headers: getUiPathHeaders(token, {
        "Content-Type": "application/json",
      }),
    },
  );

  if (!response.data?.Id || !response.data?.BlobFileAccess?.Uri || !response.data?.BlobFileAccess?.Verb) {
    throw new Error("UiPath attachment creation response was incomplete.");
  }

  return response.data;
}

async function uploadAttachmentContent(uploadTarget, localFilePath, mimeType) {
  const uploadHeaders = {};
  const headerKeys = uploadTarget.Headers?.Keys || [];
  const headerValues = uploadTarget.Headers?.Values || [];

  headerKeys.forEach((key, index) => {
    uploadHeaders[key] = headerValues[index];
  });

  log("Uploading file content to UiPath attachment blob", {
    attachmentId: uploadTarget.Id,
    method: uploadTarget.Verb,
  });

  await axios.request({
    method: uploadTarget.Verb.toLowerCase(),
    url: uploadTarget.Uri,
    data: await fs.promises.readFile(localFilePath),
    headers: {
      "Content-Type": mimeType,
      ...uploadHeaders,
    },
    maxBodyLength: Infinity,
  });

}

async function uploadFileToUiPathAttachment(localFilePath, originalName, mimeType) {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const attachmentRecord = await createAttachmentRecord(safeName);

  await uploadAttachmentContent(
    {
      Id: attachmentRecord.Id,
      Uri: attachmentRecord.BlobFileAccess.Uri,
      Verb: attachmentRecord.BlobFileAccess.Verb,
      Headers: attachmentRecord.BlobFileAccess.Headers,
    },
    localFilePath,
    mimeType,
  );

  return {
    attachmentId: attachmentRecord.Id,
    fullName: safeName,
    mimeType,
  };
}

async function startPayerConfigJob({ attachments, patientState, patientZip, practiceState }) {
  const token = await getBearerToken();
  const payload = {};

  if (attachments.insuranceFrontImage) {
    payload.insurance_card_image = {
      ID: attachments.insuranceFrontImage.attachmentId,
      FullName: attachments.insuranceFrontImage.fullName,
      MimeType: attachments.insuranceFrontImage.mimeType,
    };
  }

  if (attachments.insuranceBackImage) {
    payload.insurance_card_back_image = {
      ID: attachments.insuranceBackImage.attachmentId,
      FullName: attachments.insuranceBackImage.fullName,
      MimeType: attachments.insuranceBackImage.mimeType,
    };
  }

  if (attachments.secondaryFrontImage) {
    payload.secondary_card_image = {
      ID: attachments.secondaryFrontImage.attachmentId,
      FullName: attachments.secondaryFrontImage.fullName,
      MimeType: attachments.secondaryFrontImage.mimeType,
    };
  }

  if (attachments.secondaryBackImage) {
    payload.secondary_card_back_image = {
      ID: attachments.secondaryBackImage.attachmentId,
      FullName: attachments.secondaryBackImage.fullName,
      MimeType: attachments.secondaryBackImage.mimeType,
    };
  }

  if (patientState) {
    payload.patient_state = patientState;
  }

  if (patientZip) {
    payload.patient_zip = patientZip;
  }

  if (practiceState) {
    payload.practice_state = practiceState;
  }

  const body = {
    startInfo: {
      ReleaseKey: requireEnv("UIPATH_RELEASE_KEY"),
      Strategy: "ModernJobsCount",
      JobsCount: 1,
      InputArguments: JSON.stringify(payload),
    },
  };

  log("Starting payer_config job", payload);

  const response = await axios.post(requireEnv("UIPATH_AGENT_URL"), body, {
    headers: getUiPathHeaders(token, {
      "Content-Type": "application/json",
    }),
  });

  const uiPathJobId = response.data?.value?.[0]?.Id;
  if (!uiPathJobId) {
    throw new Error("UiPath payer_config start did not return a job Id.");
  }

  return uiPathJobId;
}

async function fetchUiPathJob(jobId) {
  const token = await getBearerToken();
  const baseUrl = requireEnv("UIPATH_BASE_URL").replace(/\/$/, "");
  const response = await axios.get(`${baseUrl}/odata/Jobs(${jobId})`, {
    headers: getUiPathHeaders(token),
  });

  return response.data;
}

async function pollJobUntilDone(jobId) {
  return pollJobUntilDoneWithProgress(jobId);
}

async function pollJobUntilDoneWithProgress(jobId, onProgress) {
  const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS || 3000);
  const pollTimeoutMs = Number(process.env.POLL_TIMEOUT_MS || 180000);
  const startedAt = Date.now();
  let lastState = null;
  let lastSubState = null;

  while (Date.now() - startedAt < pollTimeoutMs) {
    const job = await fetchUiPathJob(jobId);
    log("Polled payer_config job", { jobId, state: job.State });

    if (job.State !== lastState || job.SubState !== lastSubState) {
      lastState = job.State;
      lastSubState = job.SubState;

      if (onProgress) {
        onProgress(job);
      }
    }

    if (job.State === "Successful" && hasFinalDecisionPayload(job.OutputArguments)) {
      return job;
    }

    if (["Faulted", "Stopped"].includes(job.State)) {
      return job;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, pollIntervalMs);
    });
  }

  throw new Error("UiPath payer_config job timed out.");
}

function extractPayerConfigOutput(job) {
  const parsedOutput = parseJsonString(job.OutputArguments) || {};

  if (job.State === "Successful") {
    return {
      status: "completed",
      result: parsedOutput,
      error: null,
    };
  }

  return {
    status: "failed",
    result: parsedOutput,
    error: job.Info || `payer_config ended in state ${job.State}.`,
  };
}

function resolveUploadedCardImages(files) {
  const byField = new Map(files.map((file) => [file.fieldname, file]));

  return {
    insuranceFrontImage:
      byField.get("insuranceFrontImage") ||
      byField.get("frontImage") ||
      byField.get("front_image") ||
      byField.get("insurance_card_image") ||
      byField.get("image") ||
      null,
    insuranceBackImage:
      byField.get("insuranceBackImage") ||
      byField.get("backImage") ||
      byField.get("back_image") ||
      byField.get("insurance_card_back_image") ||
      null,
    secondaryFrontImage:
      byField.get("secondaryFrontImage") ||
      byField.get("secondary_front_image") ||
      byField.get("secondary_card_image") ||
      null,
    secondaryBackImage:
      byField.get("secondaryBackImage") ||
      byField.get("secondary_back_image") ||
      byField.get("secondary_card_back_image") ||
      null,
  };
}

async function processInsurance(jobId, uploadedFiles, formFields) {
  const localFilePaths = Object.values(uploadedFiles).map((file) => file.path);

  try {
    log("Processing insurance job started", {
      jobId,
      uploadedFields: Object.keys(uploadedFiles),
      localFilePaths,
    });
    const attachmentUploads = {};

    for (const [fieldName, file] of Object.entries(uploadedFiles)) {
      log("Uploading attachment for field", {
        jobId,
        fieldName,
        localFilePath: file.path,
        originalName: file.originalname,
        mimeType: file.mimetype,
      });
      attachmentUploads[fieldName] = await uploadFileToUiPathAttachment(file.path, file.originalname, file.mimetype);
      log("Attachment upload completed", {
        jobId,
        fieldName,
        attachmentId: attachmentUploads[fieldName]?.attachmentId || null,
      });
    }

    log("Starting UiPath job from backend", {
      jobId,
      formFields,
      attachmentFields: Object.keys(attachmentUploads),
    });
    const uiPathJobId = await startPayerConfigJob({
      attachments: attachmentUploads,
      patientState: formFields.patientState,
      patientZip: formFields.patientZip,
      practiceState: formFields.practiceState,
    });

    jobs[jobId] = {
      ...jobs[jobId],
      uiPathJobId,
      attachments: attachmentUploads,
      uiPathState: "Pending",
      uiPathSubState: null,
      workflowHistory: [
        {
          state: "Accepted",
          subState: null,
          timestamp: new Date().toISOString(),
        },
        {
          state: "Pending",
          subState: null,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    log("UiPath job started", { jobId, uiPathJobId });
    const completedJob = await pollJobUntilDoneWithProgress(uiPathJobId, (job) => {
      const currentHistory = jobs[jobId]?.workflowHistory || [];
      const nextEntry = {
        state: job.State || null,
        subState: job.SubState || null,
        timestamp: new Date().toISOString(),
      };

      jobs[jobId] = {
        ...jobs[jobId],
        uiPathState: job.State || null,
        uiPathSubState: job.SubState || null,
        workflowHistory: [...currentHistory, nextEntry],
      };
    });
    log("UiPath job completed polling", { jobId, uiPathJobId, state: completedJob?.State || null });
    const payerOutput = extractPayerConfigOutput(completedJob);

    jobs[jobId] = {
      ...jobs[jobId],
      status: payerOutput.status,
      result: payerOutput.result,
      error: payerOutput.error,
      uiPathJobId,
      uiPathState: completedJob?.State || null,
      uiPathSubState: completedJob?.SubState || null,
    };
  } catch (error) {
    log("Insurance processing failed", describeError(error));
    jobs[jobId] = {
      ...jobs[jobId],
      status: "failed",
      error: extractErrorMessage(error),
      uiPathState: jobs[jobId]?.uiPathState || null,
      uiPathSubState: jobs[jobId]?.uiPathSubState || null,
    };
  } finally {
    await Promise.all(localFilePaths.map((filePath) => fs.promises.unlink(filePath).catch(() => {})));
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post(
  "/process-insurance",
  upload.any(),
  async (req, res, next) => {
  try {
    const cardImages = resolveUploadedCardImages(req.files || []);

    const formFields = {
      patientState: req.body.patientState?.trim() || "",
      patientZip: req.body.patientZip?.trim() || "",
      practiceState: req.body.practiceState?.trim() || "",
    };

    validateRequiredFormFields(formFields);

    const jobId = randomUUID();
    jobs[jobId] = {
      job_id: jobId,
      status: "processing",
      result: null,
      error: null,
      uiPathJobId: null,
      attachments: {},
      uiPathState: "Accepted",
      uiPathSubState: null,
      workflowHistory: [
        {
          state: "Accepted",
          subState: null,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    log("Accepted insurance processing request", {
      jobId,
      insuranceFrontImage: cardImages.insuranceFrontImage?.originalname || null,
      insuranceBackImage: cardImages.insuranceBackImage?.originalname || null,
      secondaryFrontImage: cardImages.secondaryFrontImage?.originalname || null,
      secondaryBackImage: cardImages.secondaryBackImage?.originalname || null,
      ...formFields,
    });

    void processInsurance(
      jobId,
      {
        ...(cardImages.insuranceFrontImage ? { insuranceFrontImage: cardImages.insuranceFrontImage } : {}),
        ...(cardImages.insuranceBackImage ? { insuranceBackImage: cardImages.insuranceBackImage } : {}),
        ...(cardImages.secondaryFrontImage ? { secondaryFrontImage: cardImages.secondaryFrontImage } : {}),
        ...(cardImages.secondaryBackImage ? { secondaryBackImage: cardImages.secondaryBackImage } : {}),
      },
      formFields,
    );

    return res.status(202).json({
      job_id: jobId,
      status: "processing",
    });
  } catch (error) {
    return next(error);
  }
  },
);

app.get("/status/:job_id", (req, res) => {
  const job = jobs[req.params.job_id];

  if (!job) {
    return res.status(404).json({ message: "Job not found." });
  }

  return res.json({
    status: job.status,
    result: job.result,
    error: job.status === "failed" ? job.error : null,
    uiPathState: job.uiPathState || null,
    uiPathSubState: job.uiPathSubState || null,
    workflowHistory: job.workflowHistory || [],
    coordination_of_benefits_notice: job.result?.coordination_of_benefits_notice || null,
  });
});

app.use((err, _req, res, _next) => {
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "Each image must be 4MB or smaller." });
  }

  if (err?.message) {
    return res.status(err.statusCode || 500).json({ message: err.message });
  }

  return res.status(500).json({ message: "Unexpected server error." });
});

app.listen(port, () => {
  log(`Insurance processor backend listening on port ${port}`);
});
