import { v4 as uuidv4 } from 'uuid';
import type { ChatCompletion, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import fs from 'fs';
import path from 'path';
import PoligonApi from '../src/common/api/poligon.api';
import { query } from 'express';
import { OpenAIService } from './OpenAIService';
import TextHelper from './TextHelper';
import type { BananApiResponse } from '../src/common/model/poligon.model';

const openaiService = new OpenAIService();

interface Reply {
    query: string;
    reply: string;
}

async function generateNextQuery(results: Reply[]) {
    const systemPrompt = `Uzyskaliśmy dostęp do bazy danych firmy BanAN.
    Centrala wystawiła dla Ciebie specjalne API, które umożliwi Ci wykonanie niemal dowolnych zapytań SQL wyciągających dane ze wspomnianej bazy.
    Wiemy, że znajdują się tam tabele o nazwach users, datacenters oraz connections. Niekoniecznie potrzebujesz teraz wszystkich z nich. Twoim zadaniem jest zwrócenie nam numerów ID czynnych datacenter, które zarządzane są przez menadżerów, którzy aktualnie przebywają na urlopie (są nieaktywni).

    Twoje zadanie:
    1. Zdobądź strukturę tabel, które Cię interesują
    2. Zdobądź dane z tabel, które Cię interesują
    3. Zdobądź odpowiedź na pytanie: “które aktywne datacenter (DC_ID) są zarządzane przez pracowników, którzy są na urlopie (is_active=0)”
    4. Odpowiedź prześlij w formacie listy wartości przedzielonej przecinkami. Format odpowiedzi: 1234, 5431, 2344, 2323 
    
    Zasady:
    1.Komunikujesz się z bazą za pomocą zapytań SQL na przykład 'show tables' = zwraca listę tabel, 'show create table NAZWA_TABELI' = pokazuje, jak zbudowana jest konkretna tabela
    Następne zapytanie SQL jakie chcesz wykonać musi być w bloku xml <query> na przykład:
        SELECT * FROM users WHERE is_active = 0;
    2. Dotychczasowe wyniki zapytań SQL otrzymasz w bloku xml <results> w formie tablicy obiektów JSON-a:
        [
            {
                "query": show tables,
                "reply": "[
                    {
                        "Tables_in_banan": "connections"
                    },
                    {
                        "Tables_in_banan": "correct_order"
                    },
                    {
                        "Tables_in_banan": "datacenters"
                    },
                    {
                        "Tables_in_banan": "users"
                    }
                ]
        ]
    3. Ostateczną odpowiedź zapisz w bloku xml <answer>
    4. Pamiętaj aby wszystkie odpowiedzi były zwracane ZAWSZE w odpowiednim bloku xml!
    `;

    const prompt = `Here are the results of the previous queries:
    <results>
        ${JSON.stringify(results)}
    </results>
    What is the next query to execute?
    `;
    const response = await openaiService.completion({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
        temperature: 0.5,
        maxTokens: 10000,
    }) as ChatCompletion;
    const query = TextHelper.extractXmlBlockContent(response.choices[0].message.content || '', 'query');
    const answer = TextHelper.extractXmlBlockContent(response.choices[0].message.content || '', 'answer');
    console.log(`\n\nPrompt: ${prompt}`);
    console.log(`\n\nCompletion: ${response.choices[0].message.content || ""}`);
    //console.log(`\n\nquery: ${query}`);
    //console.log(`Answer: ${answer}`);
    return { query, answer };
}

async function queryDatabase(query: string): Promise<BananApiResponse> {
    const response = await PoligonApi.sendDatabaseQuery(query);
    return response;
}

async function main() {

    let answer: string | undefined;
    let results: Reply[] = [];
    while (!answer || answer.length === 0) {

        const { query, answer: nextAnswer } = await generateNextQuery(results);
        answer = nextAnswer;
        console.log(`Query: ${query}`);
        let response: BananApiResponse;
        try {
            response = await queryDatabase(query);
        } catch (error) {
            continue;
        }
        console.log(`Response: ${response.reply}`);
        if (response.error != "OK") {
            console.log(`Error: ${response.error}`);
            continue;
        }
        results.push({ query, reply: JSON.stringify(response.reply) });
        console.log(`Results: ${JSON.stringify(results)}`);
    }
    console.log(`Answer: ${answer}`);
    const answerTable: Array<number> = answer?.split(',').map(num => parseInt(num.trim())) || [];
    const result = await PoligonApi.sendTaskAnswer("database", answerTable, PoligonApi.CENTRALA_URI);
    console.log(`Result: ${JSON.stringify(result)}`);
}

main();

