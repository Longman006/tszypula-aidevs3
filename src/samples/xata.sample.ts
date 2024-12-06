// Generated with CLI
import { getXataClient } from "./xata";
const xata = getXataClient();

const record = await xata.db.tableName.read("rec_xyz");
console.log(record);