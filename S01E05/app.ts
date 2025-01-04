import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAIService } from "./OpenAIService";
import PoligonApi from "../src/common/api/poligon.api";
import { TextHelper } from "./TextHelper";

async function censorString(text: string): Promise<string> {
  const messages: ChatCompletionMessageParam[] = [
    { 
      role: "system", 
      content: "You are a helpful assistant that answers in as few words as possible. You are designed to censor the information provided by the user. Replace the name, address and age of the person with the word CENZURA. Do not change anything else and make sure to keep the punctuation intact. \n\n" +
        "<examples>\n" +
        "question: Informacje o podejrzanym: Adam Nowak. Mieszka w Katowicach przy ulicy Tuwima 10. Wiek: 32 lata.\n" +
        "answer: Informacje o podejrzanym: CENZURA. Mieszka w CENZURA przy ulicy CENZURA. Wiek: CENZURA lata.\n" +
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

async function completeTask() {

  //Get test data
  const userData = await new TextHelper().getData();
  console.log(userData);

  // save the new test data
  const result = await censorString(userData);
  console.log(result);

  const response = await PoligonApi.sendTaskAnswer("CENZURA", result, PoligonApi.CENTRALA_URI);
  console.log(response);

}

completeTask();

