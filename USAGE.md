# 📖 Usage and Documentation: Freecram Question Scraper

This document details the scraper's operational workflow, configuration options, and the structure of the output files.

## 1. Execution Workflow

The scraping is executed in two critical stages, providing stability and allowing the user to confirm the deep scrape after collecting all links.

### Stage 1: Link Extraction (`scrapeExamQuestions`)

* **Goal:** Quickly visit the main list page, identify the container element, and extract the full URL for every individual question page.
* **Result:** A unique list of question URLs is compiled.

### Stage 2: Deep Content Scraping (`scrapeDeepContent`)

* **Action:** The script prompts the user to confirm the deep scrape (Y/n).
* **Process:** If confirmed, the script sequentially visits each link, extracts the full Question Text, all Options, and the Correct Answer.
* **Stability:** A configurable delay (`SCRAPING_DELAY_MS`) is used between page visits to prevent being blocked by the target site.

## 2. Configuration (`config.js`)

All essential variables are managed in `config.js`. Modify these values to customize the scraper's behavior:

| Variable | Description | Importance | Recommendation |
| :--- | :--- | :--- | :--- |
| `DEFAULT_URL` | The starting URL for the exam list page. | Medium | Set to a typical exam URL for convenience. |
| `DEFAULT_FILENAME_QA` | Base name for the structured output files. | High | Keep the name descriptive (e.g., `scraped_data`). |
| `SCRAPING_DELAY_MS` | **Delay** (in milliseconds) between visiting individual question pages. | Critical | Increase this value (e.g., to `1000` or `2000`) if the scraper times out or fails on sequential pages. |
| `MESSAGES` | Object containing all CLI strings and errors. | Low | Modify only for language localization. |

## 3. Output File Structure

### A. Structured Data (`.json`)

The JSON file contains the raw, structured data, which is ideal for programmatic use or database import.

```json
[
  {
    "questionNumber": 1,
    "question": "What is the capital of Spain?",
    "options": ["A) Barcelona", "B) Madrid", "C) Seville", "D) Valencia"],
    "answer": "B"
  }
]
```

### B. CSV Quiz Template (`.csv`)

This file is designed for immediate use as a self-assessment spreadsheet in Excel or Google Sheets.

| Column | Content | Purpose |
| :--- | :--- | :--- |
| **FULL QUESTION** | Multiline text (Question Number, Text, and all Options). | The complete text for the quiz question. |
| **CORRECT ANSWER** | The correct option letter (e.g., `B`). | The definitive answer source. |
| **CLIENT ANSWER** | **(EMPTY)** | **User Input Area:** Where the student types their chosen letter. |
| **RESULT / CORRECT VALUE** | **Formula:** Comparison logic. | Displays the result of the user's attempt. |

### Formula Logic (Column D)

The CSV contains the following formula for comparison (where `[n]` is the current row number):

88060
=IF(ISBLANK(C[n]); \text{"No Answer Selected"}; IF(C[n]=B[n]; \text{"✅ CORRECT"}; B[n]))
88060

This nested conditional logic provides complete feedback:

| Condition | Output |
| :--- | :--- |
| **Column C is Empty** | `"No Answer Selected"` |
| **Column C = Column B** | `"✅ CORRECT"` |
| **Column C $\ne$ Column B** | Value of **Column B** (Shows the correct answer upon failure) |
