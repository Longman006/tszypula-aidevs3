
import * as fs from 'fs';
import * as path from 'path';

export default class TextHelper {
    static extractXmlBlockContent(content: string, blockName: string): string {
        const blockMatch = content.match(new RegExp(`<${blockName}>(.*?)<\/${blockName}>`, 's'));
        if (!blockMatch) {
            return '';
        }
        const extractedContent = blockMatch[1].trim();
        return extractedContent;
    }

    static extractTextFromFilesInFolder(folder: string): string {
        const files = fs.readdirSync(folder);
        const text = files.map((file: string) => fs.readFileSync(path.join(folder, file), 'utf-8')).join('\n');
        return text;
    }
}