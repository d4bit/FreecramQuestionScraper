const puppeteer = require('puppeteer');

// Import configuration
const { 
    DEFAULT_URL, 
    DEFAULT_FILENAME_LINKS, 
    DEFAULT_FILENAME_QA, 
    SCRAPING_DELAY_MS, 
    MESSAGES 
} = require('./config'); 

// Import utilities
const { 
    sleep, 
    log, 
    logProgress, 
    askQuestion, 
    closeReadline,
    saveLinksToFile, 
    saveQaToFile,
    printSeparator,
    generateCSVFromQa
} = require('./utils');

// --- CORE SCRAPING FUNCTIONS ---

/**
 * Extracts question links from the main list page.
 * @param {string} url URL of the exam list page.
 * @returns {Promise<Array<Object>>} Array of question objects with URL, text, and number.
 */
async function scrapeExamQuestions(url) {
    let browser;
    
    try {
        log(MESSAGES.LOG_INIT_BROWSER);
        
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
        
        try {
            await page.waitForSelector('dl.barlist', { timeout: 10000 });
        } catch (error) {
            // Wait for a few seconds if the selector is not immediately available
            await page.waitForTimeout(5000);
        }
        
        log(MESSAGES.LOG_EXTRACT_LINKS);
        
        const questions = await page.evaluate(() => {
            const questionsList = [];
            
            function findQuestionsContainer() {
                let container = document.querySelector('dl.barlist');
                if (!container) { 
                    const elements = document.querySelectorAll('dl, div, section');
                    for (const element of elements) {
                        // Attempt to find the container based on common text patterns
                        if (element.textContent && (element.textContent.includes('Question 1:'))) {
                            container = element;
                            break;
                        }
                    }
                }
                if (!container) {
                    const allDl = document.querySelectorAll('dl');
                    for (const dl of allDl) {
                        // Find a dl element containing question links
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
                    
                    const match = questionText.match(/Question\s*(\d+):/i);
                    const questionNumber = match ? parseInt(match[1], 10) : null;
                    
                    // Clean the text from prefixes and unnecessary HTML/spaces
                    let cleanText = questionText.replace(/Question\s+\d+:\s*/i, '');
                    cleanText = cleanText.replace(/<span.*?<\/span>/gi, '');
                    cleanText = cleanText.replace(/\s+/g, ' ').trim();
                    
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
        
        log(MESSAGES.LOG_LINKS_FOUND(questions.length), 'success');
        
        return questions;
        
    } catch (error) {
        log(MESSAGES.ERROR_LINK_EXTRACT(error.message), 'error');
        return [];
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Visits each link to extract detailed question content, options, and answer.
 * @param {Array<Object>} linksArray Array of question objects with URLs.
 * @returns {Promise<Array<Object>>} Array of structured QA data.
 */
async function scrapeDeepContent(linksArray) {
    const scrapedData = [];
    let browser;

    if (linksArray.length === 0) {
        log(MESSAGES.LOG_NO_DEEP_LINKS, 'warn');
        return [];
    }
    
    try {
        log(MESSAGES.LOG_DEEP_START(linksArray.length), 'start');

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
            
            // --- PROGRESS INDICATOR ---
            const progress = Math.round(((i + 1) / linksArray.length) * 100);
            const progressMessage = `SCRAPING PROGRESS: ${progress}% (${i + 1}/${linksArray.length}) - Current Question: ${link.questionNumber || 'N/A'}`;
            logProgress(progressMessage);
            // -----------------------------

            try {
                await page.goto(link.fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                
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
                        optionsEl.querySelectorAll('p label').forEach(labelEl => {
                            let text = labelEl.textContent.trim();
                            options.push(text);
                        });
                    }

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
                
                // Pause for delay
                await sleep(SCRAPING_DELAY_MS); 

            } catch (pageError) {
                logProgress(`SCRAPING PROGRESS: ${progress}% (${i + 1}/${linksArray.length}) - ERROR on Q${link.questionNumber}`);
                console.log();
                log(MESSAGES.ERROR_SCRAPE_FAIL(i + 1, link.questionNumber, pageError.message.substring(0, 100)), 'warn');
                
                scrapedData.push({
                    questionNumber: link.questionNumber,
                    question: 'ERROR: Could not load or find content.',
                    options: [],
                    answer: 'N/A',
                    url: link.fullUrl
                });
                
                await sleep(SCRAPING_DELAY_MS); 
            }
        }
        
        console.log(); // Finalize progress line
        log(MESSAGES.LOG_DEEP_SUCCESS(scrapedData.length), 'success');
        return scrapedData;
        
    } catch (error) {
        log(MESSAGES.ERROR_DEEP_CRITICAL(error.message), 'error');
        return [];
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// --- MAIN EXECUTION ---
async function main() {
  
  // 1. Print Header
  printSeparator();
  log(MESSAGES.CLI_HEADER, '');
  printSeparator();
  
  // 2. Initial URL Prompt
  const testUrl = DEFAULT_URL;
  const userUrl = await askQuestion(MESSAGES.PROMPT_URL(testUrl));
  const url = userUrl.trim() || testUrl;
  
  printSeparator(true);
  log(MESSAGES.STAGE_1_START, 'start');
  printSeparator();
  
  // 3. Scrape links
  const questionLinks = await scrapeExamQuestions(url);
  
  if (questionLinks.length > 0) {
    // 4. AUTO-SAVE Links
    saveLinksToFile(questionLinks, DEFAULT_FILENAME_LINKS, MESSAGES);
    
    // 5. Deep Scraping Prompt (Keep the question about deep scraping)
    const deepScrapeAnswer = await askQuestion(MESSAGES.PROMPT_DEEP_SCRAPE(questionLinks.length));
    
    if (deepScrapeAnswer.toLowerCase() === 'y' || deepScrapeAnswer === '') {
        
        printSeparator(true);
        log(MESSAGES.STAGE_2_START, 'start');
        printSeparator();

        // 6. Perform Deep Scraping
        const qaData = await scrapeDeepContent(questionLinks);

        if (qaData.length > 0) {
            // 7. AUTO-SAVE QA Data
            saveQaToFile(qaData, DEFAULT_FILENAME_QA, MESSAGES);
            generateCSVFromQa(qaData, DEFAULT_FILENAME_QA, MESSAGES);
        } else {
             log(MESSAGES.LOG_DEEP_FAIL_EMPTY, 'error');
        }
    }
    
  } else {
    log(MESSAGES.LOG_NO_LINKS_FOUND, 'error');
  }
  
  printSeparator(true);
  log(MESSAGES.PROCESS_COMPLETED, 'success');
  printSeparator();
  
  closeReadline();
}

main().catch(error => {
    log(MESSAGES.ERROR_CRITICAL(error.message), 'error');
    closeReadline();
});