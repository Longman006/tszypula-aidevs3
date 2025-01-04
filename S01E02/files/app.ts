import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { OpenAIService } from './OpenAIService';
import { ContextService, type Memory } from './ContextService';
import { AssistantService } from './AssistantService';
import type { ChatCompletionMessageParam, ChatCompletionUserMessageParam } from 'ai/prompts';
import XyzApi from '../xyzverify.api';

// Initialize services
const openaiService = new OpenAIService();
const contextService = await ContextService.create('./files/context', openaiService);
const assistantService = new AssistantService(openaiService);

async function addContext(xyzApi: XyzApi){
  const memories: Memory[] = [{
    keywords: ["capital", "Poland"],
    title: "The capital of Poland is Krakow",
    content: "The capital of Poland is Krakow"
  },{
    keywords: ["number", "Autostopem przez Galaktykę"],
    title: "The number from the book Autostopem przez Galaktykę is 69",
    content: "The number from the book Autostopem przez Galaktykę is 69"
  },{
    keywords: ["year", "current"],
    title: "The current year is 1999",
    content: "The current year is 1999"
  }
];
  await Promise.all(memories.map(memory => 
    contextService.saveMemoryForConversation(memory, xyzApi.msgId)
  ));
}

async function main(){
  const xyzApi = await XyzApi.create();
  await contextService.saveConversation({
    messages: [{ role: "user", content: xyzApi.question }],
    keywords: [],
    conversation_uuid: xyzApi.msgId,
  });
  await addContext(xyzApi);

  try {
    let thread: any = [];
    const latestUserMessage: ChatCompletionUserMessageParam = {
      role: "user",
      content: xyzApi.question
    };
    thread.push(latestUserMessage);

    console.log(latestUserMessage);
    // Create embedding for the latest user message
    const latestMessageEmbedding = await openaiService.createEmbedding(latestUserMessage.content as string);
    
    // Search for similar messages and memories
    const [similarMessages, similarMemories] = await Promise.all([
      contextService.searchSimilarMessages(latestMessageEmbedding, 3),
      contextService.searchSimilarMemories(latestMessageEmbedding, 3)
    ]);

    // Find relevant contexts across messages and stored memories
    const relevantContexts = await contextService.getRelevantContexts(similarMessages, similarMemories);
    thread = assistantService.addSystemMessage(thread, relevantContexts);

    // Generate a response from the assistant
    const assistantContent = await assistantService.answer({ messages: thread });

    console.log({ choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: assistantContent
        },
        finish_reason: 'stop'
      }
    ]});
  } catch (error) {
    console.error('Error in chat processing:', error);
  }
}

main();

