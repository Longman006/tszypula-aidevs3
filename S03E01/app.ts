import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { ChatCompletion, ChatCompletionContentPart, ChatCompletionContentPartImage, ChatCompletionContentPartText, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import PoligonApi from '../src/common/api/poligon.api';
import { OpenAIService } from './OpenAIService';
import { AudioHelper } from './AudioHelper';
import fs from 'fs/promises';
import TextHelper from './TextHelper';

const openAIService = new OpenAIService();
const folder = join(__dirname, 'pliki_z_fabryki');
const folderReports = join(folder, 'reports');
const folderDocuments = join(folder, 'facts');

async function summarizeReport(document: string, chunk: string, people: string[]) {
    const prompt = `
        <document> 
            ${document} 
        </document> 
        Here is the chunk we want to situate within the whole document.  
        <chunk> 
            ${chunk} 
        </chunk> 
        Please give a short succinct context to situate this chunk within the overall document. 
        Also generate keywords for this chunk based on the chunk name, content and the relevant related parts of the document. 
        Keep in mind that the chunk might be related to people or places, try to identify what person or place this chunk is about and save the person name in the <person> xml block.
        The person name has to be one from this list of people: ${people.join(', ')}.
        Explain your reasoning in the <thinking> xml block.
        Lastly provide the succinct context for the chunk in the <context> xml block and the keywords in the <keywords> xml block in the form of comma separated words. The keywords should be in Polish and be nouns in their basic form.`;
    const response = await openAIService.completion({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        maxTokens: 10000,
    }) as ChatCompletion;
    const thinking = TextHelper.extractXmlBlockContent(response.choices[0].message.content || '', 'thinking');
    const context = TextHelper.extractXmlBlockContent(response.choices[0].message.content || '', 'context');
    const keywords = TextHelper.extractXmlBlockContent(response.choices[0].message.content || '', 'keywords');
    const person = TextHelper.extractXmlBlockContent(response.choices[0].message.content || '', 'person');
    console.log(`\n\nRaport: ${chunk}`);
    console.log(`\nThinking: ${thinking}`);
    console.log(`\nContext: ${context}`);
    console.log(`\nKeywords: ${keywords}`);
    console.log(`\nPerson: ${person}`);
    return { context, keywords, person };
}

async function getPeopleAndPlaces(document:string): Promise<string[]>{
    const peopleFilePath = join(__dirname, 'S03E01/pliki_output', 'people.json');


    try {
        // Try to read existing results from file
        const existingPeople = await fs.readFile(peopleFilePath, 'utf-8');
        return JSON.parse(existingPeople);
    } catch (error) {
        // If file doesn't exist or can't be read, proceed with API call
        const prompt = `
            <document> 
                ${document} 
            </document> 
            Based on the document, identify people and places that are mentioned in the document.
            Provide your answer in the <answer> xml block in the form of a list of people and places separated by commas.
            Explain your reasoning in the <thinking> xml block.`;
        const response = await openAIService.completion({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            maxTokens: 10000,
        }) as ChatCompletion;
        const thinking = TextHelper.extractXmlBlockContent(response.choices[0].message.content || '', 'thinking');
        const answer = TextHelper.extractXmlBlockContent(response.choices[0].message.content || '', 'answer');
        console.log(`\nThinking: ${thinking}`);
        console.log(`\nAnswer: ${answer}`);
        // Split answer string by commas and trim whitespace from each item
        const people = answer.split(',').map(item => item.trim());
        
        // Save results to file
        await fs.writeFile(peopleFilePath, JSON.stringify(people));
        
        return people;
    }
}
async function summarizePerson(document: string, person: string) {
    const prompt = `
    <document> 
        ${document} 
    </document> 
    Here is the person or place we want to situate within the whole document and summarize keywords related to this person and facts about him.  
    <person> 
        ${person} 
    </person> 
    Please give a short succinct context to situate this person within the overall document. 
    Also generate keywords for this person based on the person name, content and the relevant related facts from the document.  
    Explain your reasoning in the <thinking> xml block.
    Lastly provide the succinct context for the chunk in the <context> xml block and the keywords in the <keywords> xml block in the form of comma separated words. 
    The keywords should be in Polish and be nouns in their basic form.
    Make sure to include in the keywords the person name as well as information from the file name such as sector. 
    If the sector from the report name is for example C4 then include in the keywords C4, Sektor C4, Sektor C, C. 
    Do the same with other sectors.`;
    const response = await openAIService.completion({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        maxTokens: 10000,
    }) as ChatCompletion;
    const thinking = TextHelper.extractXmlBlockContent(response.choices[0].message.content || '', 'thinking');
    const context = TextHelper.extractXmlBlockContent(response.choices[0].message.content || '', 'context');
    const keywords = TextHelper.extractXmlBlockContent(response.choices[0].message.content || '', 'keywords');
    console.log(`\n\nPerson: ${person}`);
    console.log(`\nThinking: ${thinking}`);
    console.log(`\nContext: ${context}`);
    console.log(`\nKeywords: ${keywords}`);
    return { context, keywords };
}


async function summarizeReports(document: string, people: string[]) {
    const outputPathPeopleMapping = join(__dirname, 'S03E01/pliki_output', 'peopleMapping.json');
    const outputPathSummaries = join(__dirname, 'S03E01/pliki_output', 'summaries.json');

    try {
        // Try to read existing files
        const existingPeopleMapping = await fs.readFile(outputPathPeopleMapping, 'utf-8');
        const existingSummaries = await fs.readFile(outputPathSummaries, 'utf-8');
        return {
            summaries: JSON.parse(existingSummaries),
            peopleMapping: JSON.parse(existingPeopleMapping)
        };
    } catch (error) {}
        // Files don't exist or can't be read, proceed with generating new data
        const files = await fs.readdir(folderReports);
        const summaries: { [key: string]: string} = {};
        const peopleMapping: { [key: string]: string} = {};

        // Process reports synchronously
        for (const file of files) {
            const fileNameFriendly = file.replace('_', ' ').replace('.txt', '');
            const fileContent = await fs.readFile(join(folderReports, file), 'utf-8');
            const report = `Report name: ${fileNameFriendly}\n${fileContent}`;
            const summary = await summarizeReport(document, report, people);
            
            // Add results directly to summaries and peopleMapping
            summaries[file] = summary.keywords;
            peopleMapping[file] = summary.person;

            // Add delay between processing each file
            if (files.indexOf(file) < files.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
            }
        }

        // Save summaries to JSON file
        await fs.mkdir(join(__dirname, 'S03E01/pliki_output'), { recursive: true });
        await fs.writeFile(outputPathPeopleMapping, JSON.stringify(peopleMapping, null, 2));
        await fs.writeFile(outputPathSummaries, JSON.stringify(summaries, null, 2));
        
        return {summaries, peopleMapping};
}

async function summarizePeopleAndPlaces(document:string){

    // Check if answers.json already exists
    const outputPath = join(__dirname, 'S03E01/pliki_output', 'peoplesummaries.json');
    try {
        const existingAnswers = await fs.readFile(outputPath, 'utf-8');
        return JSON.parse(existingAnswers);
    } catch (error) {
        // File doesn't exist or can't be read, proceed with generating new answers
    }
    const people = await getPeopleAndPlaces(document);
    const peopleSummaries: { [key: string]: string } = {};
    for (const person of people) {
        const personSummary = await summarizePerson(document, person);
        peopleSummaries[person] = personSummary.keywords;
    }

     // Save summaries to JSON file
     await fs.mkdir(join(__dirname, 'S03E01/pliki_output'), { recursive: true });
     await fs.writeFile(outputPath, JSON.stringify(peopleSummaries, null, 2));
     
    return peopleSummaries;
}

async function main() {
    await fs.mkdir(join(__dirname, 'S03E01/pliki_output'), { recursive: true });

    const outputPathSummaries = join(__dirname, 'S03E01/pliki_output', 'summaries.json');

    const document =  TextHelper.extractTextFromFilesInFolder("S03E01/pliki_z_fabryki/facts");
    const people = await getPeopleAndPlaces(document);
    const result = await summarizeReports(document, people);
    const summaries = result.summaries;
    const peopleMapping = result.peopleMapping;
    const peopleSummaries = await summarizePeopleAndPlaces(document);
    //Add person-related keywords to each report's summary
    for (const reportFile in summaries) {
        const personName = peopleMapping[reportFile];
        if (personName && peopleSummaries[personName]) {
            // Combine existing keywords with person's keywords
            summaries[reportFile] = summaries[reportFile] + ', ' + peopleSummaries[personName];
        }
    }
    await fs.writeFile(outputPathSummaries, JSON.stringify(summaries, null, 2));
    const response = await PoligonApi.sendTaskAnswer('dokumenty', summaries, PoligonApi.CENTRALA_URI);
    console.log(response);
}

main();


