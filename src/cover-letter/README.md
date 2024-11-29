# CoverLetterService Workflow Overview

This document provides a brief overview of the steps required to process cover letters in batch mode using `CoverLetterService`.

## Steps to Process Cover Letters

### 1. Create a Cover Letter (Step 1)

- **Method**: `create(createCoverLetterDto)`
- **Purpose**: Creates a cover letter for a job if it doesn't already exist.
- **Details**: This step takes user input, which includes the job ID and pitch, and creates a cover letter linked to a specific job.

### 2. Generate Cover Letter Batch (Step 2)

- **Method**: `createBatchCover()`
- **Purpose**: Finds eligible cover letters and creates a batch for processing.
- **Conditions**:
  - `generatedCoverLetter` must be null (no existing generated content).
  - `userPitch` must not be null (user provided input is required).
  - `batch` must be `false` (letter must not have been processed before).
  - `job.suited` must be `true` (job must be marked as suitable).
- **Details**: This step marks qualifying cover letters as part of a batch and sends them for further processing by generating structured data.

### 3. Monitor Batch Processing (Step 3)

- **Method**: `checkCoverBatches()` (runs every 10 seconds)
- **Purpose**: Checks for completed batches, processes cover data, and updates the database.
- **Details**: Uses a cron job to continuously monitor for batches that are ready. Once found, it extracts the generated cover letters and updates the corresponding records.

### 4. Extract Cover Information (Step 4)

- **Method**: `processCoverObject(cover)`
- **Purpose**: Extracts the cover letter details from the batch JSON for database updates.
- **Details**: Parses the JSON response from OpenAI to obtain the generated cover letter content, which is then stored in the database for later use.
