import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { WebSearchService } from "./WebSearch";
import { OpenAIService } from "./OpenAIService";
import PoligonApi from "../src/common/api/poligon.api";
import XyzApi from "./xyz.api";

async function getYear(question: string): Promise<string> {
  const openai = new OpenAI();

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: "You are a helpful assistant that answers history questions. Respond with only the year of the event. For example: 1969" },
    { role: "user", content: question }
  ];

  try {
    // const chatCompletion = await openai.chat.completions.create({
    //   messages,
    //   model: "gpt-4o-mini",
    //   max_tokens: 2,
    //   temperature: 0,
    // });
    const chatCompletion = await new OpenAIService().completion(messages, "gpt-4o-mini", false, false) as OpenAI.Chat.Completions.ChatCompletion;

    if (chatCompletion.choices[0].message?.content) {
      const response = chatCompletion.choices[0].message.content.trim();
      const year = parseInt(response);
      const currentYear = new Date().getFullYear();
      const isValidYear = !isNaN(year) && 
                         year >= 1000 && 
                         year <= currentYear && 
                         response.length === 4;
      
      return isValidYear ? response : '0000';
    } else {
      console.log("Unexpected response format");
      return 'other';
    }
  } catch (error) {
    console.error("Error in OpenAI completion:", error);
    return 'other';
  }
}

async function getQuestionFromText(text: string): Promise<string> {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: "You are a helpful assistant that extracts questions from text. Respond with only the question. For example: Rok lądowania na Księżycu?" },
    { role: "user", content: text }
  ];

  try {
    const chatCompletion = await new OpenAIService().completion(messages, "gpt-4o-mini", false, false) as OpenAI.Chat.Completions.ChatCompletion;
    return chatCompletion.choices[0].message?.content || '';
  } catch (error) {
    console.error("Error in OpenAI completion:", error);
    throw error;
  }
}

// Example usage
async function main() {
  const questions = [
    "Rok lądowania na Księżycu?",
    "Rok ataku na World Trade Center?",
    "Rok zrzucenia bomby na Hiroszimę?",
  ];

  const yearPromises = questions.map(question => getYear(question));
  const years = await Promise.all(yearPromises);
  questions.forEach((question, index) => {
    console.log(`Question: "${question}" - Year: ${years[index]}`);
  });
}

const allowedDomains = [
  { name: 'Wikipedia', url: 'en.wikipedia.org', scrappable: true },
  { name: 'AI Devs', url: 'xyz.ag3nts.org', scrappable: true },
];

async function completeTask() {
  const scrapedData = await new WebSearchService(allowedDomains).scrapeUrls([`https://xyz.ag3nts.org`]);
  console.log(scrapedData);
  const question = await getQuestionFromText(scrapedData[0].content);
  console.log(question);
  const year = await getYear(question);
  console.log(year);
  const loginResponse = await XyzApi.login(year);
  console.log(loginResponse); 
}
//main();
completeTask();