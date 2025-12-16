# 🚀 Freecram Question Scraper

**Repository:** https://github.com/d4bit/FreecramQuestionScraper

An advanced Node.js scraping tool designed to extract questions, options, and correct answers from online exam lists, generating structured data in **JSON** and an **Excel-ready CSV** quiz template.

## ✨ Key Features

* **Quiz Template Generation:** Automatically creates a CSV file formatted for self-assessment in Excel/Sheets, complete with an auto-scoring formula.
* **Two-Stage Scraping:** Efficiently handles large lists by first extracting links, then performing a deep scrape with controlled delays.
* **Modular Design:** Separates core logic (`main.js`) from utilities (`utils.js`) for easy maintenance and expansion.
* **Configurable:** Uses `config.js` to manage all file paths, delays, and default URLs.

## 🛠️ Requirements

* **Node.js** (LTS version recommended)
* **npm** (Bundled with Node.js)

## ⚡ Quick Start

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/d4bit/FreecramQuestionScraper
    cd FreecramQuestionScraper
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Run the Scraper:**
    ```bash
    npm start
    ```
    *(The script will prompt you for the exam URL.)*

---
**➡️ For detailed setup and usage instructions, please refer to the dedicated documentation:**

* [**INSTALLATION.md**](INSTALLATION.md) (Complete setup guide)
* [**USAGE.md**](USAGE.md) (Explanation of the workflow, configuration, and output files)
