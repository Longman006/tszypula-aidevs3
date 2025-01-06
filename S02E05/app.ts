import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { ChatCompletion, ChatCompletionContentPart, ChatCompletionContentPartImage, ChatCompletionContentPartText, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import PoligonApi from '../src/common/api/poligon.api';
import { HTMLHelper } from './HTMLHelper';
import { OpenAIService } from './OpenAIService';
import { AudioHelper } from './AudioHelper';
import { MarkdownHelper } from './MarkdownHelper';
import fs from 'fs/promises';

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
async function answerQuestion(question: string, markdownContent: string, questionNumber: number) {
    const systemPrompt = `Jesteś detektywem. Twoim zadaniem jest znaleźć odpowiedź na zadane pytanie na podstawie następującego tekstu: ${markdownContent}
    Zanim odpowiesz na pytanie, przeanalizuj tekst i zastanów się nad odpowiedzią. Proces myślenia zapisz w bloku xml <thinking>. Następnie odpowiedź zapisz w bloku xml <answer>.`;
    const response = await openAIService.completion({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: question }],
        temperature: 0.5,
        maxTokens: 1000,
    }) as ChatCompletion;
    const thinking = extractXmlBlockContent(response.choices[0].message.content || '', 'thinking');
    const answer = extractXmlBlockContent(response.choices[0].message.content || '', 'answer');
    console.log(`\n\nQuestion ${questionNumber}: ${question}`);
    console.log(`Thinking: ${thinking}`);
    console.log(`Answer: ${answer}`);
    return answer;
}


async function answerQuestions(markdownContent: string): Promise<object> {
    // Check if answers.json already exists
    const outputPath = join(__dirname, 'pliki_output', 'answer.json');
    try {
        const existingAnswers = await fs.readFile(outputPath, 'utf-8');
        return JSON.parse(existingAnswers);
    } catch (error) {
        // File doesn't exist or can't be read, proceed with generating new answers
    }

    // Read the questions file
    const questionsContent = await readFile('S02E05/pliki_questions/arxiv.txt', 'utf-8');
    const questions = questionsContent.split('\n').filter(line => line.trim());
    
    const answers: { [key: string]: string } = {};
    
    // Process each question
    for (const questionLine of questions) {
        // Extract question ID and content (format: "01=question text")
        const match = questionLine.match(/^(\d+)=(.+)$/);
        if (match) {
            const [, id, questionText] = match;
            const questionId = `${id.padStart(2, '0')}`;
            
            // Get answer for this question
            const answer = await answerQuestion(questionText, markdownContent, parseInt(id));
            answers[questionId] = answer;
        }
    }
    
    // Save answers to JSON file
    await fs.mkdir(join(__dirname, 'pliki_output'), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(answers, null, 2));
    
    return answers;
}

async function main() {
    const htmlHelper = new HTMLHelper("https://centrala.ag3nts.org/dane/arxiv-draft.html");
    await htmlHelper.downloadHtml();
    await htmlHelper.convertHtmlToMarkdown();

    const markdownHelper = new MarkdownHelper("S02E05/pliki_source/arxiv-draft.md");
    await markdownHelper.parse();

    const answers = await answerQuestions(await markdownHelper.getParsedMarkdownContent());
    console.log(answers);

    const response = await PoligonApi.sendTaskAnswer('arxiv', answers, PoligonApi.CENTRALA_URI);
    console.log(response);
}

main();