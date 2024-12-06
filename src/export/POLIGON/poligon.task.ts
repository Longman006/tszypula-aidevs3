import PoligonApi from "common/api/poligon.api";
import { task1Name } from "common/const/task.const";

export default class PoligonApiTask {
  public async execute() {
    const response = await fetch("https://poligon.aidevs.pl/dane.txt", {
      method: "GET"
    });
    const text = await response.text();
    const arrayResult = text.split("\n").filter((c: string) => c !== "");

    const answerResponse = await PoligonApi.sendTaskAnswer(task1Name, arrayResult);

    console.log(arrayResult);
    console.log("code: {1}, message: {2}", answerResponse.code, answerResponse.message);
    return answerResponse;
  }
}
