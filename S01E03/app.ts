import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAIService } from "./OpenAIService";
import PoligonApi from "../src/common/api/poligon.api";
import { WebSearchService } from "../S01E01/WebSearch";
import { DataHelper, type TestItem } from "./DataHelper";

async function answerQuestion(text: string): Promise<string> {
  const messages: ChatCompletionMessageParam[] = [
    { 
      role: "system", 
      content: "You are a helpful assistant that answers in as few words as possible. You are designed to provide the answer to a mathematical formula or a simple question. \n\n" +
        "<examples>\n" +
        "question: 14 + 53\n" +
        "answer: 67\n" +
        "question: name of the 2020 USA president\n" +
        "answer: Joe Biden\n" +
        "</examples>"
    },
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

function solveTheEquation(equation: string): number | null {
  let result: number | null = null;
  try {
    result = Number(eval(equation));
  } catch (error) {
    console.error("Error evaluating equation:", error);
  }
  return result;
}

async function processTestItem(testItem: TestItem): Promise<TestItem> {
  // create new test item with the same structure and data
  let newTestItem: TestItem = {
    ...testItem,
  };

  // get the question and answer it
  const question = testItem.question;
  newTestItem.answer = solveTheEquation(question) || newTestItem.answer;

  // get the test question if exists and answer it
  if (newTestItem.test) {
    const question = newTestItem.test.q;
    console.log(question);
    const test = await answerQuestion(question);
    console.log(test);
    newTestItem.test.a = test;
  }
  const isCorrect = compareItems(newTestItem, testItem);
  
  if(!isCorrect) {
    console.log("Incorrect answer: ", JSON.stringify(testItem));
    console.log("Correct answer: ", JSON.stringify(newTestItem));
  }
  
  return newTestItem;
}

function compareItems(newTestItem: TestItem, testItem: TestItem): boolean {
    // Compare basic properties
    if (newTestItem.question !== testItem.question) {
        return false;
    }
    
    if (newTestItem.answer !== testItem.answer) {
        return false;
    }

    // Compare test objects if they exist
    if (testItem.test) {
        // If original has test but new one doesn't
        if (!newTestItem.test) {
            return false;
        }
        // Compare test properties
        if (newTestItem.test.q !== testItem.test.q || 
            newTestItem.test.a !== testItem.test.a) {
            return false;
        }
    } else if (newTestItem.test) {
        // If new has test but original doesn't
        return false;
    }

    return true;
}

async function completeTask() {

  //Get test data
  const testData = await new DataHelper().getTestData();

  //Create new test data to populate with correctanswers
  const answers: TestItem[] = [];
  const processedItems = await Promise.all(testData.map(testItem => processTestItem(testItem)));
  answers.push(...processedItems);

  // save the new test data
  const result = await new DataHelper().saveTestData(answers);

  const response = await PoligonApi.sendTaskAnswer("JSON", result, PoligonApi.CENTRALA_URI);
  console.log(response);

}

completeTask();

