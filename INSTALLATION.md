# 🛠️ Installation Guide: Freecram Question Scraper

This guide provides step-by-step instructions to set up and run the scraper on your local machine.

## 1. Prerequisites Check

Ensure you have the following software installed. This project requires Node.js to execute.

| Requirement | Command to Check | Expected Output (Example) |
| :--- | :--- | :--- |
| **Node.js** | `node -v` | `v20.x.x` or higher |
| **npm** | `npm -v` | `10.x.x` or higher |

If these are missing, please download and install the LTS version from the official [Node.js website](https://nodejs.org/).

## 2. Setup

### A. Clone the Repository

Open your terminal and clone the project:

```bash
git clone https://github.com/d4bit/FreecramQuestionScraper
cd FreecramQuestionScraper
```

### B. Project Structure Overview

The core components of the scraper are highly modular:

| File | Role | Description |
| :--- | :--- | :--- |
| `main.js` | **Execution Core** | Contains the high-level `puppeteer` logic and controls the two-stage scraping workflow. |
| `utils.js` | **Utility Kit** | Handles all peripheral tasks: console output, user input, file saving (JSON/CSV), and dependency handling (`chalk`). |
| `config.js` | **Configuration** | Central file for customizing default URLs, file names, scraping delays, and all CLI messages. |
| `package.json` | **Dependencies** | Defines required external packages, primarily `puppeteer` for browser automation. |
| `README.md` | **Introduction** | Project overview and Quick Start guide. |
| `USAGE.md` | **Documentation** | Detailed guide on configuration and output structure. |

### C. Install Dependencies

In the root project directory (`FreecramQuestionScraper`), run the following command to download all necessary modules:

```bash
npm install
```

## 3. Running the Scraper

The project is configured to run using the `npm start` script for execution.

1.  **Execute the Script:**
    ```bash
    npm start
    ```

2.  **Input:** The script will first prompt you for the exam list URL.
3.  **Output:** After the process is complete, two files will be generated in the root directory:
    * `scraped_questions_answers.json`
    * `scraped_questions_answers.csv`

---
**Next Step:** See [**USAGE.md**](USAGE.md) for details on the configuration and how to use the output files.
