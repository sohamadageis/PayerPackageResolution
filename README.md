# Insurance Card Wrapper Demo

This project keeps `payer_config` unchanged and adds a wrapper-based website integration:

1. the website uploads an insurance card image
2. the backend uploads that file to a UiPath Storage Bucket
3. the backend starts `payer_wrapper`
4. `payer_wrapper` downloads the storage file inside UiPath runtime
5. `payer_wrapper` invokes `payer_config` with a real runtime file input
6. the backend polls and returns the final JSON result to the frontend

## Project Areas

- Backend: [backend/server.js](C:\Users\SohamChinchalkar\OneDrive - Adageis\Desktop\Eligibility_agent_website\backend\server.js)
- Frontend: [frontend/src/App.jsx](C:\Users\SohamChinchalkar\OneDrive - Adageis\Desktop\Eligibility_agent_website\frontend\src\App.jsx)
- UiPath wrapper notes: [payerwrapper/README.md](C:\Users\SohamChinchalkar\OneDrive - Adageis\Desktop\Eligibility_agent_website\payerwrapper\README.md)
- UiPath workflow design: [payerwrapper/WORKFLOW-DESIGN.md](C:\Users\SohamChinchalkar\OneDrive - Adageis\Desktop\Eligibility_agent_website\payerwrapper\WORKFLOW-DESIGN.md)
- Example env file: [backend/.env.example](C:\Users\SohamChinchalkar\OneDrive - Adageis\Desktop\Eligibility_agent_website\backend\.env.example)

## Backend Flow

`POST /process-insurance`

- accepts a card image with optional `patientState`, `patientZip`, and `practiceState`
- stores a local temp file
- uploads the image to the UiPath bucket using `GetWriteUri`
- starts `payer_wrapper`
- returns `{ "job_id": "...", "status": "processing" }`

`GET /status/:job_id`

- returns the current in-memory job state
- exposes the wrapper result when complete

## Required Environment Variables

- `UIPATH_BASE_URL`
- `UIPATH_TOKEN` or `UIPATH_CLIENT_ID` / `UIPATH_CLIENT_SECRET`
- `UIPATH_FOLDER_ID`
- `UIPATH_BUCKET_ID`
- `UIPATH_BUCKET_NAME`
- `UIPATH_AGENT_URL`
- `UIPATH_WRAPPER_RELEASE_KEY`

## Manual UiPath Publish Steps

1. Open the `payerwrapper` folder in UiPath Studio.
2. Finalize the workflow in [payerwrapper/WORKFLOW-DESIGN.md](C:\Users\SohamChinchalkar\OneDrive - Adageis\Desktop\Eligibility_agent_website\payerwrapper\WORKFLOW-DESIGN.md).
3. Publish the process as `payer_wrapper`.
4. Deploy `payer_wrapper` in the same Orchestrator folder as `payer_config`.
5. Confirm the storage bucket used by the backend is also in that same folder.
6. Copy the deployed wrapper release key into `UIPATH_WRAPPER_RELEASE_KEY`.
7. Start the backend and frontend.

## Local Run

Backend:

```bash
cd backend
npm install
npm start
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Important Constraint

This integration no longer tries to pass storage-bucket identifiers directly into `payer_config`. The wrapper is the place where the storage file is converted into the real runtime file input expected by that process.
