const fs = require('fs');
const readline = require('readline');
let chalk = require('chalk'); 

// --- CHALK FIX AND SETUP (Ensure chalk works or has a fallback) ---
if (chalk && chalk.default) { 
    chalk = chalk.default; 
} else {
    // Simple fallback if chalk is unavailable or version is incompatible
    chalk = { 
        red: (s) => s, blue: (s) => s, green: (s) => s, yellow: (s) => s, 
        cyan: (s) => s, bold: (s) => s, magenta: (s) => s,
        stripColor: (s) => s.replace(/\x1b\[[0-9;]*m/g, ''), 
        underline: (s) => s
    };
}
// --------------------------

// Readline configuration for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Delays execution for the specified number of milliseconds.
 * @param {number} ms Milliseconds to wait.
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Logs a styled message to the console, adding format and emojis.
 * @param {string} message Message to log (without newlines or emojis).
 * @param {('start'|'info'|'success'|'warn'|'error')} [type='info'] Message type for styling.
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
 * Logs progress to the console, overwriting the previous line.
 * @param {string} message The progress message to display.
 */
function logProgress(message) {
    // \r returns the cursor to the beginning of the line.
    process.stdout.write(chalk.bold.magenta(`\r${message}`));
}

/**
 * Prompts the user for input using the readline interface.
 * @param {string} question The question to display.
 * @returns {Promise<string>} The user's response.
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    // Add newline at the beginning of the prompt here
    rl.question(chalk.yellow(`\n${question}`), (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Closes the readline interface.
 */
function closeReadline() {
    rl.close();
}

/**
 * Prints a separator line (80 equals signs) formatted in green.
 * @param {boolean} [addNewlineBefore=false] Whether to add a newline before the separator.
 */
function printSeparator(addNewlineBefore = false) {
    const separator = '='.repeat(80);
    if (addNewlineBefore) {
        console.log(`\n${chalk.green(separator)}`);
    } else {
        console.log(chalk.green(separator));
    }
}

/**
 * Saves the list of question links to a file.
 * @param {Array<Object>} questions Array of question objects.
 * @param {string} filename The name of the file to save to.
 * @param {Object} MESSAGES Message object from config.
 */
function saveLinksToFile(questions, filename, MESSAGES) {
  try {
    const linkList = questions.map(q => `  "${q.fullUrl}"`).join(',\n');
    
    let content = `// Scraped on: ${new Date().toLocaleString()}\n`;
    content += `// Total links found: ${questions.length}\n\n`;
    content += `links = [\n${linkList}\n];\n`;
    
    fs.writeFileSync(filename, content, 'utf8');
    log(`Simplified link list saved successfully to: ${filename}`, 'success');
  } catch (error) {
    log(MESSAGES.ERROR_FILE_SAVE(error.message), 'error');
  }
}

/**
 * Saves the structured Question/Answer data in JSON format.
 * @param {Array<Object>} qaData Array of Question/Answer objects.
 * @param {string} filename The name of the file to save to.
 * @param {Object} MESSAGES Message object from config.
 */
function saveQaToFile(qaData, filename, MESSAGES) {
    try {
        const jsonContent = JSON.stringify(qaData, null, 2);
        fs.writeFileSync(filename, jsonContent, 'utf8');
        log(`Structured QA data saved successfully to: ${filename}`, 'success');
    } catch (error) {
        log(MESSAGES.ERROR_FILE_SAVE(error.message), 'error');
    }
}

module.exports = {
    sleep,
    log,
    logProgress,
    askQuestion,
    closeReadline,
    saveLinksToFile,
    saveQaToFile,
    printSeparator
};