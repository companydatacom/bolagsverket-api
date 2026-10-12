/** Run: COMPANYDATA_API_KEY=... npx tsx examples/quickstart.ts */
import { BolagsverketClient } from "../src/index";

const client = new BolagsverketClient({ auth: { type: "apiKey", apiKey: process.env.COMPANYDATA_API_KEY! } });

const company = await client.getByOrgNumber("556036-0793");
console.log("By organisationsnummer:", company);

const page = await client.search({ cityName: "Stockholm", hasEmail: true, pageSize: 25 });
console.log("Search:", page.data);
