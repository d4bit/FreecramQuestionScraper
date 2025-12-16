/**
 * config.js
 * Configuration constants and message strings for the FreeCram Questions Scraper.
 */

// --- CONFIGURATION CONSTANTS ---
const DEFAULT_URL = "https://www.freecram.net/torrent/Salesforce.Agentforce-Specialist.v2025-09-22.q27.html";
const DEFAULT_FILENAME_LINKS = 'scraped_links.txt';
const DEFAULT_FILENAME_QA = 'scraped_questions_answers.json';
const SCRAPING_DELAY_MS = 350;

// --- MESSAGE STRINGS ---
const MESSAGES = {
    CLI_HEADER: '🤖 FREECRAM QUESTIONS SCRAPER',
    STAGE_1_START: 'STAGE 1: STARTING LINK EXTRACTION...',
    STAGE_2_START: 'STAGE 2: STARTING DEEP CONTENT SCRAPING...',
    PROCESS_COMPLETED: 'PROCESS COMPLETED',
    LOG_INIT_BROWSER: 'Initializing headless browser for link extraction...',
    LOG_EXTRACT_LINKS: 'Extracting links and titles...',
    LOG_NO_LINKS: 'No questions found to display.',
    LOG_LINKS_FOUND: (count) => `Found ${count} links.`,
    LOG_NO_DEEP_LINKS: 'No links provided for deep scraping.',
    LOG_DEEP_START: (count) => `Starting deep content scraping for ${count} links...`,
    LOG_PAUSE: (ms) => `Pausing for ${ms / 1000} seconds...`,
    LOG_DEEP_SUCCESS: (count) => `Successfully scraped detailed content for ${count} items.`,
    LOG_DEEP_FAIL_EMPTY: '⚠️  Deep scraping finished, but no structured data was collected.',
    LOG_NO_LINKS_FOUND: '⚠️  No links were found during the initial scraping stage.',
    PROMPT_URL: (url) => `🌐 Enter the list URL (Press Enter to use test URL: ${url}): `,
    PROMPT_SAVE_LINKS: "💾 Save the link list to a file (links = [...])? (Y/n): ",
    PROMPT_LINKS_FILENAME: (defaultName) => `📄 Enter filename (${defaultName}): `,
    PROMPT_DEEP_SCRAPE: (count) => `🧠 Do you want to perform deep scraping (Q/A/Options) on the ${count} links found? (Y/n): `,
    PROMPT_SAVE_QA: (count) => `💾 Save structured Q/A data (JSON format) for ${count} items? (Y/n): `,
    PROMPT_QA_FILENAME: (defaultName) => `📄 Enter filename (${defaultName}): `,
    ERROR_LINK_EXTRACT: (msg) => `Link Extraction Error: ${msg}`,
    ERROR_DEEP_CRITICAL: (msg) => `Critical Deep Scraping Error: ${msg}`,
    ERROR_SCRAPE_FAIL: (i, qNum, msg) => `Failed to scrape link ${i} (${qNum}): ${msg}...`,
    ERROR_FILE_SAVE: (msg) => `Error saving file: ${msg}`,
    ERROR_CRITICAL: (msg) => `CRITICAL ERROR: ${msg}`
};

module.exports = {
    DEFAULT_URL,
    DEFAULT_FILENAME_LINKS,
    DEFAULT_FILENAME_QA,
    SCRAPING_DELAY_MS,
    MESSAGES
};