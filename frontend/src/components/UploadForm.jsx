import { useMemo, useState } from "react";

import { resolveInsurancePackage } from "../api/agentApi";
import { US_STATES } from "../constants";
import LoadingSpinner from "./LoadingSpinner";

const initialFormState = {
  patient_first_name: "",
  patient_last_name: "",
  patient_dob: "",
  patient_state: "",
  patient_zip: "",
  member_id: "",
  payer_name_raw: "",
  plan_name_raw: "",
  group_number: "",
  subscriber_first_name: "",
  subscriber_last_name: "",
  relationship_to_subscriber: "Self",
  practice_state: "",
  practice_name: "",
  employer_name: "",
  insurance_address: "",
  card_front_text: "",
  card_back_text: "",
};

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSize = 4 * 1024 * 1024;

function UploadField({ label, helperText, file, onFileChange, id }) {
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(selectedFiles) {
    const nextFile = selectedFiles?.[0];
    if (!nextFile) {
      return;
    }

    onFileChange(nextFile);
  }

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <label
        htmlFor={id}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition ${
          isDragging ? "border-indigo-600 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50"
        }`}
      >
        <span className="text-sm font-medium text-slate-700">Drag and drop or click to upload</span>
        <span className="mt-2 text-xs text-slate-500">{helperText}</span>
        {file ? <span className="mt-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm">{file.name}</span> : null}
      </label>
      <input
        id={id}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
}

function Input({ label, error, ...props }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        <input
          {...props}
          className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${
            error ? "border-red-300 bg-red-50" : "border-slate-300 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          }`}
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <select
        {...props}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      >
        {children}
      </select>
    </label>
  );
}

export default function UploadForm({ onResolved, onError }) {
  const [formState, setFormState] = useState(initialFormState);
  const [files, setFiles] = useState({ frontImage: null, backImage: null });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasFrontImage = useMemo(() => Boolean(files.frontImage), [files.frontImage]);

  function updateField(name, value) {
    setFormState((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function validateFile(file) {
    if (!acceptedTypes.includes(file.type)) {
      return "Only JPG, PNG, and WEBP images are allowed.";
    }

    if (file.size > maxFileSize) {
      return "Each image must be 4MB or smaller.";
    }

    return null;
  }

  function handleFileChange(name, file) {
    const fileError = validateFile(file);
    if (fileError) {
      onError(fileError);
      return;
    }

    setFiles((current) => ({
      ...current,
      [name]: file,
    }));
  }

  function validateForm() {
    const nextErrors = {};

    if (formState.patient_zip && !/^\d{5}$/.test(formState.patient_zip)) {
      nextErrors.patient_zip = "ZIP must be 5 digits.";
    }

    if (!hasFrontImage) {
      const hasAnyText = Object.values(formState).some((value) => value.trim() !== "");
      if (!hasAnyText) {
        nextErrors.frontImage = "Upload a front image or provide text details.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = new FormData();

      if (files.frontImage) {
        payload.append("frontImage", files.frontImage);
      }

      if (files.backImage) {
        payload.append("backImage", files.backImage);
      }

      Object.entries(formState).forEach(([key, value]) => {
        if (value.trim() !== "") {
          payload.append(key, value.trim());
        }
      });

      const result = await resolveInsurancePackage(payload);
      onResolved(result);
    } catch (error) {
      const status = error?.response?.status;
      const backendMessage = error?.response?.data?.message || "";

      if (status === 408) {
        onError("The agent is taking longer than expected. Please try again.");
      } else if (status === 429) {
        onError("Too many requests right now. Please wait a minute and try again.");
      } else if (backendMessage.startsWith("UiPath configuration is incomplete")) {
        onError("The resolver is not fully configured yet. Add the UiPath org, tenant, folder, and process settings.");
      } else if (backendMessage.startsWith("Authentication failed")) {
        onError("The resolver could not authenticate with UiPath. Check the backend client credentials and scope.");
      } else if (backendMessage.includes("Folder does not exist or the user does not have access to the folder")) {
        onError("UiPath accepted the app credentials, but this external app is not assigned to the configured Orchestrator folder yet.");
      } else if (backendMessage) {
        onError(backendMessage);
      } else {
        onError("We couldn't resolve the insurance package right now. Please check the form and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <LoadingSpinner visible={isSubmitting} />
      <form onSubmit={handleSubmit} className="space-y-8 rounded-3xl bg-white p-6 shadow-md sm:p-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <UploadField
              id="frontImage"
              label="Front Card Image"
              helperText="JPG, PNG, or WEBP up to 4MB"
              file={files.frontImage}
              onFileChange={(file) => handleFileChange("frontImage", file)}
            />
            {errors.frontImage ? <p className="mt-2 text-sm text-red-600">{errors.frontImage}</p> : null}
          </div>
          <UploadField
            id="backImage"
            label="Back Card Image (Optional)"
            helperText="Use this for claims address or extra plan details"
            file={files.backImage}
            onFileChange={(file) => handleFileChange("backImage", file)}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Input label="Patient First Name" value={formState.patient_first_name} onChange={(e) => updateField("patient_first_name", e.target.value)} />
          <Input label="Patient Last Name" value={formState.patient_last_name} onChange={(e) => updateField("patient_last_name", e.target.value)} />
          <Input label="Date of Birth" type="date" value={formState.patient_dob} onChange={(e) => updateField("patient_dob", e.target.value)} />
          <Select label="Patient State" value={formState.patient_state} onChange={(e) => updateField("patient_state", e.target.value)}>
            <option value="">Select state</option>
            {US_STATES.map((state) => (
              <option key={`patient-${state}`} value={state}>
                {state}
              </option>
            ))}
          </Select>
          <Input
            label="Patient ZIP"
            value={formState.patient_zip}
            maxLength={5}
            error={errors.patient_zip}
            onChange={(e) => updateField("patient_zip", e.target.value.replace(/\D/g, "").slice(0, 5))}
          />
          <Input
            label="Member ID (Optional)"
            value={formState.member_id}
            error={errors.member_id}
            onChange={(e) => updateField("member_id", e.target.value)}
          />
          <Input label="Payer Name" value={formState.payer_name_raw} onChange={(e) => updateField("payer_name_raw", e.target.value)} />
          <Input label="Plan Name" value={formState.plan_name_raw} onChange={(e) => updateField("plan_name_raw", e.target.value)} />
          <Input label="Group Number" value={formState.group_number} onChange={(e) => updateField("group_number", e.target.value)} />
          <Select
            label="Relationship to Subscriber"
            value={formState.relationship_to_subscriber}
            onChange={(e) => updateField("relationship_to_subscriber", e.target.value)}
          >
            {["Self", "Spouse", "Child", "Other"].map((relationship) => (
              <option key={relationship} value={relationship}>
                {relationship}
              </option>
            ))}
          </Select>
          <Input
            label="Subscriber First Name"
            value={formState.subscriber_first_name}
            onChange={(e) => updateField("subscriber_first_name", e.target.value)}
          />
          <Input
            label="Subscriber Last Name"
            value={formState.subscriber_last_name}
            onChange={(e) => updateField("subscriber_last_name", e.target.value)}
          />
          <Input label="Practice Name" value={formState.practice_name} onChange={(e) => updateField("practice_name", e.target.value)} />
          <Select label="Practice State" value={formState.practice_state} onChange={(e) => updateField("practice_state", e.target.value)}>
            <option value="">Select state</option>
            {US_STATES.map((state) => (
              <option key={`practice-${state}`} value={state}>
                {state}
              </option>
            ))}
          </Select>
          <Input label="Employer Name" value={formState.employer_name} onChange={(e) => updateField("employer_name", e.target.value)} />
          <Input label="Claims Address" value={formState.insurance_address} onChange={(e) => updateField("insurance_address", e.target.value)} />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">
            Front Card OCR Text (Optional)
            <textarea
              value={formState.card_front_text}
              onChange={(e) => updateField("card_front_text", e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Back Card OCR Text (Optional)
            <textarea
              value={formState.card_back_text}
              onChange={(e) => updateField("card_back_text", e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          Resolve Insurance Package
        </button>
      </form>
    </>
  );
}
