import fs from 'fs/promises';
import https from 'https';

const ERROR_CODE_PATTERN = /\|`?(0x[0-9A-F]+)`?<br\s*\/?>`?(-?\d+)`?\|Name:\s*\*\*([^*]+)\*\*<br\s*\/?>Message:\s*`([^`]+)`\|/i;

async function generateCsv(outputPath: string): Promise<void> {
    try {
        // Create/clear the output file with headers
        await fs.writeFile(outputPath, 'HexCode,IntCode,Name,Message\n', 'utf8');
        
        // Download and process the file
        const fileContent = await downloadFile('https://raw.githubusercontent.com/MicrosoftDocs/powerapps-docs/main/powerapps-docs/developer/data-platform/includes/data-service-error-codes.md');
        
        // Split content into lines and process each line
        const lines = fileContent.split('\n');
        for (const line of lines) {
            if (line.includes('0x') && line.includes('|')) {
                await appendErrorCodeToCsv(line, outputPath);
            }
        }
        
        console.log('CSV file generated successfully!');
    } catch (error) {
        console.error('Error generating CSV:', error);
        throw error;
    }
}

function downloadFile(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download file: ${response.statusCode}`));
                return;
            }

            let data = '';
            response.on('data', (chunk) => data += chunk);
            response.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function appendErrorCodeToCsv(inputLine: string, outputPath: string): Promise<void> {
    console.log('Processing line:', inputLine);
    const match = inputLine.match(ERROR_CODE_PATTERN);
    
    if (!match) {
        console.log('Regex parts:');
        console.log('Hex:', inputLine.match(/0x[0-9A-F]+/i));
        console.log('Int:', inputLine.match(/-?\d+/));
        console.log('Name:', inputLine.match(/\*\*([^*]+)\*\*/));
        console.log('Message:', inputLine.match(/Message:\s*`?([^|]+)`?\|/));
        console.warn('Line does not match expected format:', inputLine);
        return Promise.resolve();
    }

    const [, hexCode, intCode, name, message] = match;
    const escapedMessage = message.trim().replace(/"/g, '""'); // Escape quotes in CSV
    const csvLine = `${hexCode},${intCode},"${name.trim()}","${escapedMessage}"\n`;

    return fs.appendFile(outputPath, csvLine, 'utf8');
}

// Export functions
export { generateCsv, appendErrorCodeToCsv };

// Example usage:
generateCsv('errorcodes.csv')
    .then(() => console.log('Done!'))
    .catch(error => console.error('Failed:', error));
