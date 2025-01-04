import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAIService } from "./OpenAIService";
import PoligonApi from "../src/common/api/poligon.api";
import { AudioHelper } from "./AudioHelper";

async function identifyStreet(interviews: string): Promise<string> {
  const messages: ChatCompletionMessageParam[] = [
    { 
      role: "system", 
      content: "You are a detective. As input you will receive a series of interview transcripts. Your task is to identify the street name of the institute where professor Maj is currently located. Describe your thinking process and provide the final answer. Resolve conflicting information. Assess source credibility. Identify university from transcript. Use internal knowledge for street name. \n\n"
    },
    { role: "user", content: interviews }
  ];

  try {
    const chatCompletion = await new OpenAIService().completion({messages}) as OpenAI.Chat.Completions.ChatCompletion;
    return chatCompletion.choices[0].message?.content || '';
  } catch (error) {
    console.error("Error in OpenAI completion:", error);
    throw error;
  }
}

async function completeTask() {

  //Get test data
  const transcripts = await new AudioHelper().getTranscripts();
  console.log(transcripts);

  // save the new test data
  const result = await identifyStreet(transcripts);
  console.log(result);

  const response = await PoligonApi.sendTaskAnswer("mp3", result, PoligonApi.CENTRALA_URI);
  console.log(response);

}

completeTask();

