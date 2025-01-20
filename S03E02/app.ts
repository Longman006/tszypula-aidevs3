import { v4 as uuidv4 } from 'uuid';
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAIService } from './OpenAIService';
import { VectorService } from './VectorService';
import fs from 'fs';
import path from 'path';
import PoligonApi from '../src/common/api/poligon.api';



const openaiService = new OpenAIService();
const vectorService = new VectorService(openaiService);

const COLLECTION_NAME = "aidevs-S03E02";

async function main() {
    // Ensure collection exists
    await vectorService.ensureCollection(COLLECTION_NAME);

    // Get text from files and prepare points for vector DB
    const folderPath = 'S03E02/weapons_tests/do-not-share';
    const files = fs.readdirSync(folderPath);
    
    const points = files.map(file => ({
        id: uuidv4(),
        doc: {
            text: fs.readFileSync(path.join(folderPath, file), 'utf-8'),
            date: file // Using filename as date
        }
    }));

    // Add points to vector database
    //await vectorService.addPoints(COLLECTION_NAME, points);

    // Perform search for weapon prototype theft
    const query = "W raporcie, z którego dnia znajduje się wzmianka o kradzieży prototypu broni?";
    const searchResults = await vectorService.performSearch(COLLECTION_NAME, query, 1);
    
    // Extract the date and text from the search result
    const rawDate = searchResults[0]?.payload?.date as string;
    const text = searchResults[0]?.payload?.text;
    
    // Format date from YYYY_MM_DD.txt to YYYY-MM-DD
    const date = rawDate.replace('.txt', '').replace(/_/g, '-');
    
    console.log('Date from document:', date);
    console.log('Text from document:', text);
    const response = await PoligonApi.sendTaskAnswer('wektory', date, PoligonApi.CENTRALA_URI);
    console.log(response);
}

main();
