import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { ChatCompletion, ChatCompletionContentPart, ChatCompletionContentPartImage, ChatCompletionContentPartText, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAIService } from "./OpenAIService";
import { AudioHelper } from './AudioHelper';
import PoligonApi from '../src/common/api/poligon.api';

type category = 'people' | 'hardware' | 'other';
const openAIService = new OpenAIService();
const folder = join(__dirname, 'pliki_z_fabryki');
const audioHelper = new AudioHelper(folder);

function extractXmlBlockContent(content: string, blockName: string): string {
    const blockMatch = content.match(new RegExp(`<${blockName}>(.*?)<\/${blockName}>`, 's'));
    if (!blockMatch) {
        return '';
    }
    const extractedContent = blockMatch[1].trim();
    return extractedContent;
}

async function categorizeContent(contentPart: ChatCompletionContentPart[]): Promise<string> {

    const messages: ChatCompletionMessageParam[] = [
        {
            role: "system",
            content: `You are a file content categorizer. Categorize the given file content as 'people' or 'hardware' or 'other'. Categorize as 'people' only if the content is about a captured person or the persons current location, otherwise do not use the people category. Categorize as 'hardware' if the content is about hardware repairs or maintenance. Categorize as 'other' if the content does not fit into the other two categories. In the <summary> block provide a summary of the file content. In the <thinking> block provide your thinking process. Lastly, respond in the <category> block with only the category name.`
        },
        {
            role: "user",
            content: contentPart
        }
    ];

    const chatCompletion = await openAIService.completion({ messages }) as ChatCompletion;
    //console.log(chatCompletion.choices[0].message.content);
    return chatCompletion.choices[0].message.content || '';
}

async function categorizeFile(file: string): Promise<category> {
    const fileFormat = file.split('.').pop();
    let part: ChatCompletionContentPart = {
        text: '',
        type: 'text'
    };
    let content: string;
    let category: category;
    switch (fileFormat) {
        case 'png':
            part = await createImagePart(file);
            break;
        case 'txt':
            part = await createTextPart(file);
            break;
        case 'mp3':
            part = await createAudioPart(file);
            break;
        default:
    }
    content = await categorizeContent([part]);
    category = extractXmlBlockContent(content, 'category') as category;
    console.log(`\nProcessing file: ${file} - ${category} ${content}`);
    return category;
}

async function createImagePart(file: string): Promise<ChatCompletionContentPartImage> {
        const filePath = join(folder, file);
        const fileData = await readFile(filePath);
        const base64Image = fileData.toString('base64');
        return {
            type: "image_url",
            image_url: {
                url: `data:image/png;base64,${base64Image}`,
                detail: "high"
            }
        } as ChatCompletionContentPartImage;
}

async function createTextPart(file: string): Promise<ChatCompletionContentPartText> {
    const filePath = join(folder, file);
    const fileData = await readFile(filePath);
    const text = fileData.toString();
    return {
        type: "text",
        text: text
    } as ChatCompletionContentPartText;
}

async function createAudioPart(file: string): Promise<ChatCompletionContentPartText> {
    const transcript = await audioHelper.getTranscript(file);
    return {
        type: "text",
        text: transcript.transcription
    } as ChatCompletionContentPartText;
}


async function processFiles(): Promise<void> {
    const files = await readdir(folder);
    let results: {file: string, category: category}[] = [];

    const promises = files.map(async (file) => {
        const category = await categorizeFile(file);
        return {file, category};
    });
    results = await Promise.all(promises);
    
    // Create categorized JSON object
    const categorizedFiles = {
        people: results.filter(r => r.category === 'people').map(r => r.file),
        hardware: results.filter(r => r.category === 'hardware').map(r => r.file),
    };
    console.log(categorizedFiles);

    const response = await PoligonApi.sendTaskAnswer("kategorie", categorizedFiles, PoligonApi.CENTRALA_URI);
    console.log(response);
    
}

await processFiles();