const puppeteer = require('puppeteer');
const fs = require('fs');
const readline = require('readline');

// --- CHALK FIX AND SETUP ---
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
const DEFAULT_FILENAME_LINKS = 'scraped_links.txt';
const DEFAULT_FILENAME_QA = 'scraped_questions_answers.json';
const SCRAPING_DELAY_MS = 100;

// Setup readline for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// --- HELPER FUNCTIONS ---

/**
 * Función de retardo.
 * @param {number} ms Milisegundos a esperar.
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Logs a styled message to the console.
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
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    // La Y en mayúscula indica que es la opción por defecto.
    rl.question(chalk.yellow(question), (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Displays the questions links and titles in the console.
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
    console.log(chalk.cyan(`\n${q.questionNumber || (index + 1)}. ${q.fullQuestionText}`));
    console.log(chalk.blue.underline(`   🔗 ${q.fullUrl}`));
  });
}

// --- STAGE 1: INITIAL LINK SCRAPING LOGIC ---

/**
 * Scrapes questions links from the main list page.
 */
async function scrapeExamQuestions(url) {
    let browser;
    
    try {
        log(`Initializing headless browser for link extraction...`);
        
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--window-size=1920,1080',
                '--disable-blink-features=AutomationControlled'
            ],
            ignoreHTTPSErrors: true
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Content loading strategy
        try {
            await page.waitForSelector('dl.barlist', { timeout: 10000 });
        } catch (error) {
            await page.waitForTimeout(5000);
        }
        
        log('\nExtracting links and titles...');
        
        const questions = await page.evaluate(() => {
            const questionsList = [];
            
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
                    
                    // 1. Extract the number
                    const match = questionText.match(/Question\s*(\d+):/i);
                    const questionNumber = match ? parseInt(match[1], 10) : null;
                    
                    // 2. Clean text for title/display
                    let cleanText = questionText.replace(/Question\s+\d+:\s*/i, '');
                    cleanText = cleanText.replace(/<span.*?<\/span>/gi, '');
                    cleanText = cleanText.replace(/\s+/g, ' ').trim();
                    
                    // 3. Build full URL
                    let fullUrl = href;
                    if (href.startsWith('/')) {
                        const baseUrl = window.location.origin;
                        fullUrl = baseUrl + href;
                    }
                    
                    questionsList.push({
                        fullUrl,
                        fullQuestionText: cleanText,
                        questionNumber: questionNumber
                    });
                }
            });
            
            return questionsList;
        });
        
        log(`\nFound ${questions.length} links.`, 'success');
        
        return questions;
        
    } catch (error) {
        log(`Link Extraction Error: ${error.message}`, 'error');
        return [];
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// --- STAGE 2: DEEP CONTENT SCRAPING LOGIC (Using SCRAPING_DELAY_MS) ---

/**
 * Visits each link to scrape the question, options, and answer letter.
 */
async function scrapeDeepContent(linksArray) {
    const scrapedData = [];
    let browser;

    if (linksArray.length === 0) {
        log('No links provided for deep scraping.', 'warn');
        return [];
    }
    
    try {
        log(`\nStarting deep content scraping for ${linksArray.length} links...`, 'start');

        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--window-size=1200,800',
            ],
            ignoreHTTPSErrors: true
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        for (let i = 0; i < linksArray.length; i++) {
            const link = linksArray[i];
            const url = link.fullUrl;
            
            log(`[${i + 1}/${linksArray.length}] Visiting: ${url}`, 'info');

            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                
                // Wait for the main QA container to load
                await page.waitForSelector('.qa', { timeout: 15000 });

                const qaItem = await page.evaluate((qNum) => { 
                    
                    const qaContainer = document.querySelector('.qa');

                    if (!qaContainer) {
                        return { error: 'QA container not found.' };
                    }
                    
                    const questionEl = qaContainer.querySelector('.qa-question');
                    const optionsEl = qaContainer.querySelector('.qa-options');
                    const answerExpEl = qaContainer.querySelector('.qa-answerexp');
                    
                    const options = [];
                    if (optionsEl) {
                        // FIX: Targeting <p> then <label>
                        optionsEl.querySelectorAll('p label').forEach(labelEl => {
                            let text = labelEl.textContent.trim();
                            options.push(text);
                        });
                    }

                    // Extract ONLY the answer letter(s)
                    const explanationText = answerExpEl ? answerExpEl.textContent.trim() : '';
                    const answerMatch = explanationText.match(/Correct Answer:\s*([A-Z, ]+)/i);
                    const finalAnswer = answerMatch && answerMatch[1] 
                                        ? answerMatch[1].replace(/,\s*$/, '').trim()
                                        : 'N/A'; 

                    return {
                        questionNumber: qNum,
                        question: questionEl ? questionEl.textContent.trim() : 'N/A (Question Missing)',
                        options: options,
                        answer: finalAnswer
                    };
                }, link.questionNumber);

                if (qaItem.error) {
                    throw new Error(qaItem.error);
                }

                scrapedData.push(qaItem);
                
                // --- DELAY IMPLEMENTATION (Using Constant) ---
                await sleep(SCRAPING_DELAY_MS); 
                // ---------------------------------------------

            } catch (pageError) {
                log(`Failed to scrape link ${i + 1} (${link.questionNumber}): ${pageError.message.substring(0, 100)}...`, 'warn');
                scrapedData.push({
                    questionNumber: link.questionNumber,
                    question: 'ERROR: Could not load or find content.',
                    options: [],
                    answer: 'N/A',
                    url: url
                });
                
                // Still add a delay even on failure
                await sleep(SCRAPING_DELAY_MS); 
            }
        }

        log(`\nSuccessfully scraped detailed content for ${scrapedData.length} items.`, 'success');
        return scrapedData;
        
    } catch (error) {
        log(`Critical Deep Scraping Error: ${error.message}`, 'error');
        return [];
    } finally {
        if (browser) {
            await browser.close();
            log('Browser closed', 'info');
        }
    }
}


// --- OUTPUT HANDLERS ---

function saveLinksToFile(questions, filename) {
  try {
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

function saveQaToFile(qaData, filename) {
    try {
        const jsonContent = JSON.stringify(qaData, null, 2);
        fs.writeFileSync(filename, jsonContent, 'utf8');
        log(`Structured QA data saved successfully to: ${filename}`, 'success');
    } catch (error) {
        log(`Error saving QA file: ${error.message}`, 'error');
    }
}

// --- MAIN EXECUTION ---

async function main() {
  console.log(chalk.green('='.repeat(80)));
  console.log(chalk.bold.yellow('🤖 ADVANCED PUPPETEER SCRAPER CLI'));
  console.log(chalk.green('='.repeat(80)));
  
  const testUrl = DEFAULT_URL;
  
  // 1. Initial URL Prompt
  const userUrl = await askQuestion(`\n🌐 Enter the list URL (Press Enter to use test URL: ${testUrl}): `);
  const url = userUrl.trim() || testUrl;
  
  console.log('\n' + chalk.green('='.repeat(80)));
  log('STAGE 1: STARTING LINK EXTRACTION...', 'start');
  console.log(chalk.green('='.repeat(80)));
  
  // 2. Scrape links
  const questionLinks = await scrapeExamQuestions(url);
  
  if (questionLinks.length > 0) {
    // 3. Display and Save Links
    displayQuestions(questionLinks);
    
    // Y/n prompt default
    const saveAnswer = await askQuestion("\n💾 Save the link list to a file (links = [...])? (Y/n): ");
    if (saveAnswer.toLowerCase() === 'y' || saveAnswer === '') {
      const filenameAnswer = await askQuestion(`📄 Enter filename (${DEFAULT_FILENAME_LINKS}): `);
      const filename = filenameAnswer.trim() || DEFAULT_FILENAME_LINKS;
      saveLinksToFile(questionLinks, filename);
    }
    
    // Y/n prompt default
    const deepScrapeAnswer = await askQuestion(`\n🧠 Do you want to perform deep scraping (Q/A/Options) on the ${questionLinks.length} links found? (Y/n): `);
    
    if (deepScrapeAnswer.toLowerCase() === 'y' || deepScrapeAnswer === '') {
        
        console.log('\n' + chalk.green('='.repeat(80)));
        log('STAGE 2: STARTING DEEP CONTENT SCRAPING...', 'start');
        console.log(chalk.green('='.repeat(80)));

        // 4. Perform Deep Scraping
        const qaData = await scrapeDeepContent(questionLinks);

        if (qaData.length > 0) {
            // Y/n prompt default
            const saveQaAnswer = await askQuestion(`\n💾 Save structured Q/A data (JSON format) for ${qaData.length} items? (Y/n): `);

            if (saveQaAnswer.toLowerCase() === 'y' || saveQaAnswer === '') {
                const qaFilenameAnswer = await askQuestion(`📄 Enter filename (${DEFAULT_FILENAME_QA}): `);
                const qaFilename = qaFilenameAnswer.trim() || DEFAULT_FILENAME_QA;
                saveQaToFile(qaData, qaFilename);
            }
        } else {
             log('\n⚠️  Deep scraping finished, but no structured data was collected.', 'error');
        }
    }
    
  } else {
    log('\n⚠️  No links were found during the initial scraping stage.', 'error');
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