export class TextHelper {
    private url: string;

    constructor(url: string = 'https://centrala.ag3nts.org/data/6e739d5d-219c-4212-b5ff-5b7c8b145f29/cenzura.txt') {
        this.url = url;
    }

    async getData(): Promise<string> {
        try {
            const response = await fetch(this.url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.text();
            return data;
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    }
}
