const puppeteer = require('puppeteer');
const fs = require('fs');
const readline = require('readline');

// --- CHALK FIX AND SETUP ---
// Access default export for compatibility with modern Chalk versions (v5+).
let chalk = require('chalk'); 
if (chalk && chalk.default) { 
    chalk = chalk.default; 
} else {
    // Fallback if chalk is not installed or version is incompatible
    chalk = { 
        red: (s) => s, blue: (s) => s, green: (s) => s, yellow: (s) => s, 
        cyan: (s) => s, bold: (s) => s, bgWhite: { black: (s) => s }, 
        stripColor: (s) => s.replace(/\x1b\[[0-9;]*m/g, ''), 
        gray: (s) => s, magenta: (s) => s, underline: (s) => s
    };
}
// --------------------------

// --- CONFIGURATION ---
const DEFAULT_URL = "https://www.freecram.net/torrent/Salesforce.Agentforce-Specialist.v2025-09-22.q27.html";
const DEFAULT_FILENAME = 'scraped_links.txt';

// Setup readline for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// --- HELPER FUNCTIONS ---

/**
 * Logs a styled message to the console.
 * @param {string} message The message to log.
 * @param {'info'|'success'|'warn'|'error'|'start'} type The type of message.
 */
function log(message, type = 'info') {
    switch (type) {
        case 'start':
            console.log(chalk.blue(`\n🚀 ${message}`));
            break;
        case 'info':
            console.log(chalk.cyan(`\nℹ️  ${message}`));
            break;
        case 'success':
            console.log(chalk.green(`\n✅ ${message}`));
            break;
        case 'warn':
            console.log(chalk.yellow(`\n⚠️  ${message}`));
            break;
        case 'error':
            console.error(chalk.red(`\n❌ ${message}`));
            break;
        default:
            console.log(message);
    }
}

/**
 * Prompts the user for input using readline.
 * @param {string} question The question to ask.
 * @returns {Promise<string>} The user's answer.
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(chalk.yellow(question), (answer) => {
      resolve(answer);
    });
  });
}


// --- CORE SCRAPING LOGIC ---

/**
 * Scrapes questions from the specified URL.
 * @param {string} url The URL to scrape.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of question objects.
 */
async function scrapeExamQuestions(url) {
    let browser;
    
    try {
        log(`Initializing headless browser...`);
        log(`Accessing: ${url}`);
        
        // Puppeteer setup with anti-detection args
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--window-size=1920,1080',
                '--disable-blink-features=AutomationControlled'
            ],
            ignoreHTTPSErrors: true
        });
        
        const page = await browser.newPage();
        
        // Anti-bot configuration
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
        });
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });
        
        log('Navigating to the page...');
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        log('Waiting for content to load...');
        
        // Content loading strategy
        try {
            await page.waitForSelector('dl.barlist', { timeout: 10000 });
            log('Content structure found.', 'success');
        } catch (error) {
            log('Specific selector not found, waiting fixed time...', 'warn');
            await page.waitForTimeout(5000);
        }
        
        // --- CONTENT EXTRACTION ---
        log('\nExtracting content...');
        
        const questions = await page.evaluate(() => {
            const questionsList = [];
            
            // Function to robustly find the container element
            function findQuestionsContainer() {
                let container = document.querySelector('dl.barlist');
                if (!container) { 
                    const elements = document.querySelectorAll('dl, div, section');
                    for (const element of elements) {
                        if (element.textContent && (element.textContent.includes('Question 1:'))) {
                            container = element;
                            break;
                        }
                    }
                }
                if (!container) {
                    const allDl = document.querySelectorAll('dl');
                    for (const dl of allDl) {
                        if (dl.querySelectorAll('dd a[href*="/question/"]').length > 0) {
                            container = dl;
                            break;
                        }
                    }
                }
                return container;
            }
            
            const container = findQuestionsContainer();
            if (!container) return [];
            
            container.querySelectorAll('dd').forEach((dd) => {
                const link = dd.querySelector('a');
                if (link) {
                    const href = link.getAttribute('href') || '';
                    let questionText = link.textContent.trim();
                    
                    // Clean text (remove question number, inline spans, and normalize whitespace)
                    let cleanText = questionText.replace(/Question\s+\d+:\s*/i, '');
                    cleanText = cleanText.replace(/<span.*?<\/span>/gi, '');
                    cleanText = cleanText.replace(/\s+/g, ' ').trim();
                    
                    // Build full URL
                    let fullUrl = href;
                    if (href.startsWith('/')) {
                        const baseUrl = window.location.origin;
                        fullUrl = baseUrl + href;
                    }
                    
                    questionsList.push({
                        fullUrl,
                        fullQuestionText: cleanText,
                    });
                }
            });
            
            return questionsList;
        });
        
        log(`\nFound ${questions.length} questions.`, 'success');
        
        return questions;
        
    } catch (error) {
        log(`Scraping Error: ${error.message}`, 'error');
        return [];
    } finally {
        if (browser) {
            await browser.close();
            log('Browser closed', 'info');
        }
    }
}

// --- OUTPUT HANDLERS ---

/**
 * Displays the questions in the console.
 * @param {Array<Object>} questions 
 */
function displayQuestions(questions) {
  if (!questions || questions.length === 0) {
    log("\nNo questions found to display.", 'error');
    return;
  }
  
  console.log(chalk.gray('\n' + '='.repeat(80)));
  console.log(chalk.bold.yellow(`📚 EXAM QUESTION LIST - Total: ${questions.length} questions`));
  console.log(chalk.gray('='.repeat(80)));
  
  questions.forEach((q, index) => {
    console.log(chalk.cyan(`\n${index + 1}. ${q.fullQuestionText}`));
    console.log(chalk.blue.underline(`   🔗 ${q.fullUrl}`));
  });
}

/**
 * Saves the links to a file in the format: links = [link1, link2, ...]
 * @param {Array<Object>} questions The array of question objects.
 * @param {string} filename The name of the file to save.
 */
function saveLinksToFile(questions, filename) {
  try {
    // Map links and wrap them in quotes for list format
    const linkList = questions.map(q => `  "${q.fullUrl}"`).join(',\n');
    
    let content = `// Scraped on: ${new Date().toLocaleString()}\n`;
    content += `// Total links found: ${questions.length}\n\n`;
    content += `links = [\n${linkList}\n];\n`;
    
    fs.writeFileSync(filename, content, 'utf8');
    log(`Simplified link list saved successfully to: ${filename}`, 'success');
  } catch (error) {
    log(`Error saving file: ${error.message}`, 'error');
  }
}

// --- MAIN EXECUTION ---

async function main() {
  console.log(chalk.green('='.repeat(80)));
  console.log(chalk.bold.yellow('🤖 ADVANCED PUPPETEER SCRAPER CLI'));
  console.log(chalk.green('='.repeat(80)));
  
  const testUrl = DEFAULT_URL;

  // Ask for URL
  const userUrl = await askQuestion(`\n🌐 Enter the URL (Press Enter to use test URL: ${testUrl}): `);
  const url = userUrl.trim() || testUrl;
  
  console.log('\n' + chalk.green('='.repeat(80)));
  log('STARTING SCRAPING PROCESS...', 'start');
  console.log(chalk.green('='.repeat(80)));
  
  // Scrape the questions
  const questions = await scrapeExamQuestions(url);
  
  if (questions.length > 0) {
    // Display questions
    displayQuestions(questions);
    
    // Save to file
    const saveAnswer = await askQuestion("\n💾 Save link list to file (links = [...])? (y/n): ");
    if (saveAnswer.toLowerCase() === 'y') {
      const filenameAnswer = await askQuestion(`📄 Enter filename (${DEFAULT_FILENAME}): `);
      const filename = filenameAnswer.trim() || DEFAULT_FILENAME;
      saveLinksToFile(questions, filename);
    }
  } else {
    log('\n⚠️  No questions were found.', 'error');
  }
  
  console.log('\n' + chalk.green('='.repeat(80)));
  log('PROCESS COMPLETED', 'success');
  console.log(chalk.green('='.repeat(80)));
  
  rl.close();
}

main().catch(error => {
    log(`CRITICAL ERROR: ${error.message}`, 'error');
    rl.close();
});