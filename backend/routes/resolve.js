const express = require("express");
const multer = require("multer");

const { uploadAttachment } = require("../services/attachments");
const { startAgentJob, pollJobUntilComplete } = require("../services/jobs");

const router = express.Router();

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return callback(new AppError("Only JPG, PNG, and WEBP images are allowed.", 400));
    }

    return callback(null, true);
  },
});

const relationshipValues = new Set(["Self", "Spouse", "Child", "Other"]);

const optionalFields = new Set([
  "subscriber_first_name",
  "subscriber_last_name",
  "relationship_to_subscriber",
  "payer_name_raw",
  "plan_name_raw",
  "group_number",
  "employer_name",
  "insurance_address",
  "card_front_text",
  "card_back_text",
  "practice_name",
  "practice_state",
  "insurance_card_back_image",
]);

function formatDateString(value) {
  if (!value) {
    return undefined;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return value;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${month}/${day}/${year}`;
  }

  return value;
}

function cleanValue(value) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function buildInputArguments(body, attachments) {
  const payload = {
    patient_first_name: cleanValue(body.patient_first_name),
    patient_last_name: cleanValue(body.patient_last_name),
    patient_dob: formatDateString(cleanValue(body.patient_dob)),
    patient_state: cleanValue(body.patient_state),
    patient_zip: cleanValue(body.patient_zip),
    subscriber_first_name: cleanValue(body.subscriber_first_name),
    subscriber_last_name: cleanValue(body.subscriber_last_name),
    relationship_to_subscriber: cleanValue(body.relationship_to_subscriber),
    payer_name_raw: cleanValue(body.payer_name_raw),
    plan_name_raw: cleanValue(body.plan_name_raw),
    member_id: cleanValue(body.member_id),
    group_number: cleanValue(body.group_number),
    employer_name: cleanValue(body.employer_name),
    insurance_address: cleanValue(body.insurance_address),
    card_front_text: cleanValue(body.card_front_text),
    card_back_text: cleanValue(body.card_back_text),
    practice_name: cleanValue(body.practice_name),
    practice_state: cleanValue(body.practice_state),
  };

  if (attachments.frontImage) {
    payload.insurance_card_image = attachments.frontImage;
  }

  if (attachments.backImage) {
    payload.insurance_card_back_image = attachments.backImage;
  }

  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

function validateRequest(body, files) {
  const hasFrontImage = Boolean(files?.frontImage?.[0]);
  if (!hasFrontImage) {
    const meaningfulText = Object.entries(body).some(([key, value]) => {
      if (optionalFields.has(key)) {
        return false;
      }

      return Boolean(cleanValue(value));
    });

    if (!meaningfulText) {
      throw new AppError("Provide a front image or at least some patient and insurance details.", 400);
    }
  }

  const relationship = cleanValue(body.relationship_to_subscriber);
  if (relationship && !relationshipValues.has(relationship)) {
    throw new AppError("Invalid relationship to subscriber value.", 400);
  }

  const zip = cleanValue(body.patient_zip);
  if (zip && !/^\d{5}$/.test(zip)) {
    throw new AppError("Patient ZIP must be 5 digits.", 400);
  }

  const stateFields = ["patient_state", "practice_state"];
  for (const field of stateFields) {
    const value = cleanValue(body[field]);
    if (value && !/^[A-Z]{2}$/.test(value)) {
      throw new AppError(`${field} must be a 2-letter uppercase state code.`, 400);
    }
  }
}

function parseOutputArguments(rawValue) {
  if (!rawValue) {
    throw new AppError("Agent returned invalid output", 500);
  }

  if (typeof rawValue === "object") {
    return rawValue;
  }

  try {
    return JSON.parse(rawValue);
  } catch (_error) {
    throw new AppError("Agent returned invalid output", 500);
  }
}

router.post(
  "/",
  upload.fields([
    { name: "frontImage", maxCount: 1 },
    { name: "backImage", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      validateRequest(req.body, req.files);

      const attachments = {};
      const frontImageFile = req.files?.frontImage?.[0];
      const backImageFile = req.files?.backImage?.[0];

      if (frontImageFile) {
        attachments.frontImage = await uploadAttachment(frontImageFile);
      }

      if (backImageFile) {
        attachments.backImage = await uploadAttachment(backImageFile);
      }

      const inputArguments = buildInputArguments(req.body, attachments);
      const jobId = await startAgentJob(inputArguments);
      const completedJob = await pollJobUntilComplete(jobId);
      const parsedOutput = parseOutputArguments(completedJob.OutputArguments);

      return res.json(parsedOutput);
    } catch (error) {
      return next(error);
    }
  },
);

module.exports = router;
