import * as fs from 'fs';
import PoligonApi from '../src/common/api/poligon.api';
// DataHelper.ts

// Define interfaces for the data structure
export interface TestItem {
    question: string;
    answer: number;
    test?: {
        q: string;
        a: string;
    };
}

export interface TestData {
    apikey: string;
    description: string;
    copyright: string;
    "test-data": TestItem[];
}


export class DataHelper {
    private testData: TestItem[];

    /**
     * Constructor initializes the test data from JSON file
     */
    constructor() {
        // Import the JSON file
        const jsonData: TestData = require('./test-data.json');
        this.testData = jsonData["test-data"];
    }

    /**
     * Gets the test data array
     * @returns Array of TestItem objects
     */
    public getTestData(): TestItem[] {
        return this.testData;
    }

    /**
     * Saves test data to a new JSON file with timestamp
     * @param data Array of TestItem objects to save
     * @returns The filename where data was saved
     */
    public saveTestData(data: TestItem[]): TestData {
        // Create timestamp in format YYYYMMDD-HHMMSS
        const timestamp = new Date().toISOString()
            .replace(/[:-]/g, '')     // Remove colons and hyphens
            .replace(/[T.]/g, '-')    // Replace T and . with hyphen
            .slice(0, 15);            // Take only YYYYMMDD-HHMMSS part

        // Create filename
        const filename = `test-data-${timestamp}.json`;

        // Create the full JSON object
        const jsonData: TestData = {
            apikey: PoligonApi.apikey,
            description: "This is simple calibration data used for testing purposes. Do not use it in production environment!",
            copyright: "Copyright (C) 2238 by BanAN Technologies Inc.",
            "test-data": data
        };

        // Write to file
        fs.writeFileSync(
            filename,
            JSON.stringify(jsonData, null, 4), // Pretty print with 4 spaces
            'utf8'
        );

        return jsonData;
    }
}
