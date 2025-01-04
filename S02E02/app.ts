import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { ChatCompletion, ChatCompletionContentPartImage, ChatCompletionContentPartText, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAIService } from "./OpenAIService";

const openAIService = new OpenAIService();

async function findCity(imageParts: ChatCompletionContentPartImage[]): Promise<string> {

    const messages: ChatCompletionMessageParam[] = [
        {
            role: "system",
            content: `You are a detective. 
            Your task is to identify a city in Poland based on map fragments. 
            One of the map fragments is from a different city. This is a false lead. Try to eliminate the odd one out before providing the final answer.
            Explain your thought process before providing the final answer. 
            Double check if the city you're going to give me as the answer has the locations presented in three map fragments.`
        },
        {
            role: "user",
            content: imageParts
        }
    ];

    const chatCompletion = await openAIService.completion(messages, "gpt-4o", false, false, 1024) as ChatCompletion;
    
    return chatCompletion.choices[0].message.content || '';
}

async function processMaps(): Promise<void> {
    const mapFolder = join(__dirname, 'maps');
    const files = await readdir(mapFolder);
    const pngFiles = files.filter(file => file.endsWith('.png'));

    const results = await Promise.all(pngFiles.map(async file => {
        const filePath = join(mapFolder, file);
        const fileData = await readFile(filePath);
        const base64Image = fileData.toString('base64');
        return {
            type: "image_url",
            image_url: {
                url: `data:image/png;base64,${base64Image}`,
                detail: "high"
            }
        } as ChatCompletionContentPartImage;
    }));

    //console.table(results);

    const city = await findCity(results);
    console.log(city);
}

await processMaps();