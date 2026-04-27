import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

export async function resolveInsurancePackage(formData) {
  const response = await api.post("/resolve", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}
