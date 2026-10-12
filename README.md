# Swedish Bolagsverket register API by CompanyData

[![npm](https://img.shields.io/npm/v/@companydata/bolagsverket-api.svg)](https://www.npmjs.com/package/@companydata/bolagsverket-api)

A small, typed TypeScript wrapper for looking up **Swedish company data from the Bolagsverket register**: company names, full street addresses, phone, email, website, size and revenue, through one REST call.

This package is a thin convenience layer over the master [`@companydata/companydata-sdk`](https://github.com/companydatacom/companydata-sdk). It is the same API and the same key, with the country pinned to Sweden and a register-specific helper on top, so you can write `client.getByOrgNumber("556074-3089")` instead of assembling query parameters by hand.

> One schema, one key. Every CompanyData register wrapper returns records in the same shape, so moving from Bolagsverket to another country's register is a one-line change.

## At a glance

| | |
| --- | --- |
| Country | 🇸🇪 Sweden (`countryCode: "SE"`) |
| Register | Swedish Bolagsverket register |
| Businesses in CompanyData | 1.85M |
| With phone number | 478K |
| With email address | 264K |
| Lookup key | organisation number (10 digits) |
| Verified example | Volvo Personvagnar AB, `556074-3089` |
| Live demo and comparison | [companydata.com/bolagsverket-api](https://companydata.com/bolagsverket-api/) |
| Official register | [bolagsverket.se](https://bolagsverket.se) |

Counts are from the live API on 2026-10-12 and grow over time.

## What is Bolagsverket?

**Bolagsverket** (the Swedish Companies Registration Office) keeps the register of Swedish limited companies, partnerships and sole traders. It is the authoritative source for legal form, board members and annual reports.

What the official register does **not** give you: its data products are built around single-company retrieval under an agreement, with no phone number, no email address, no website, and no filtering by city, industry or size.

**CompanyData adds the missing fields.** 1.85M Swedish businesses with full addresses, phone, email, website, directors and firmographics, filterable and exportable in bulk through one live REST API. Comparison and a live lookup: [companydata.com/bolagsverket-api](https://companydata.com/bolagsverket-api/).

## Installation

```bash
npm install @companydata/bolagsverket-api
```

Get an API key at [app.companydata.com/signup-api](https://app.companydata.com/signup-api). Your first calls are free.

## Quickstart

```ts
import { BolagsverketClient } from "@companydata/bolagsverket-api";

const client = new BolagsverketClient({
  auth: { type: "apiKey", apiKey: process.env.COMPANYDATA_API_KEY! }
});

// Look up one business by its organisation number.
const company = await client.getByOrgNumber("556074-3089"); // Volvo Personvagnar AB

// Search with filters (country is always SE here).
const page = await client.search({
  cityName: "STOCKHOLM",
  hasEmail: true,
  hasWebsite: true,
  page: 1,
  pageSize: 25
});
console.log(page.totalCount, page.records[0]?.["Company Name"]);
```

> **City and province names are UPPER CASE.** Filter on `cityName: "STOCKHOLM"`, not `"Stockholm"` (which returns 0). The same goes for `provinceName: "NORRBOTTENS LÄN"`. List exact names per country with `GET /api/cities`. Full field and filter reference: [companydata.com/api-docs/request-company](https://companydata.com/api-docs/request-company/).

Run the full example against the live API with your key:

```bash
git clone https://github.com/companydatacom/bolagsverket-api && cd bolagsverket-api && npm install
COMPANYDATA_API_KEY=... npm run test:live
```

## What a record looks like

Every record is a flat object with human-readable keys. This is Volvo Personvagnar AB as returned by `getByOrgNumber`:

```json
{
  "Company Name": "Volvo Personvagnar AKTIEBOLAG",
  "Trade Name": "Provbana",
  "Company Registration Number": "5560743089",
  "Address 1": "Flygplats Jokkmokk 111",
  "Postal Code": "96203",
  "City": "Mattisudden",
  "State/Province": "Norrbottens Län",
  "Country": "Sweden",
  "Phone Number": "+4*****17",
  "Email": null,
  "Website": "volvocars.*****",
  "Founding Year": 1960,
  "Employees Total": 0,
  "Yearly Revenue in U.S. Dollars": 0,
  "Business Category Code 1 - Description": "Testing Laboratories",
  "Business Legal Type - Description": ""
}
```

**Search is a preview, export is the full record.** `search` (and the lookup helper, which uses it) returns about 20 fields with phone, email and website masked as `*****`, and does not spend credits. `export`, `exportWithScroll` and `iterate` return the full record (about 35 fields, unmasked contact details, SIC and national industry codes, legal status, group structure) and spend one credit per company you have not exported before. Which fields are on a record depends on your key's configuration. See the [field reference](https://companydata.com/api-docs/request-company/) and [plans and credits](https://companydata.com/api-docs/authentication/).

## Methods

| Method | Returns | Does |
| --- | --- | --- |
| `client.search(params)` | `BolagsverketPage` | Search Swedish businesses with filters. |
| `client.getByOrgNumber(id, scope?)` | `CompanyRecord \| null` | Fetch one business by organisation number. `scope` adds extra filters when a number is not unique. |
| `client.export(params)` | `BolagsverketPage` | Export one page of results (standard pagination). |
| `client.exportWithScroll(params)` | `BolagsverketScrollBatch` | One scroll batch (max 50 records). Pass `scrollId` back in for the next. |
| `client.iterate(params, { maxRecords })` | `AsyncGenerator<CompanyRecord>` | Streams every matching record across scroll batches. |
| `client.raw` | `ApiClient` | The underlying master SDK client, for anything not wrapped here. |
| `normalizeBolagsverketId(id)` | `string` | The organisation number normalisation the lookup helper applies. |

```ts
interface BolagsverketPage {
  records: CompanyRecord[];   // flat objects, keys like "Company Name", "City", "Email"
  totalCount: number;         // matches across all pages
  page: number;
  totalPages: number;
  pageSize: number;
}

interface BolagsverketScrollBatch {
  records: CompanyRecord[];
  scrollId: string | null;    // pass back in to get the next batch
  hasMoreRecords: boolean;
  pageSize: number;
}
```

`params` is the master SDK's filter set with `countryCode` removed, because it is always `"SE"` here. For cross-border queries, use the master SDK directly.

### Lookup by organisation number

`getByOrgNumber` takes the 10-digit Swedish organisationsnummer. The usual dash is stripped, so `"556074-3089"` and `"5560743089"` match the same company. Branches share the parent's number, so you get the first registered unit.

## Recipes

**Find a company by name, pinned to a city**

```ts
const { records, totalCount } = await client.search({
  search: "Volvo",
  cityName: "GÖTEBORG",
  pageSize: 5
});
```

**Build a segment: companies in a province with 50 or more employees**

```ts
const page = await client.search({
  provinceName: "NORRBOTTENS LÄN",
  employeesTotal: { min: 50 },
  hasPhone: true,
  pageSize: 100
});
```

**Stream a whole segment with scroll export**

```ts
for await (const company of client.iterate(
  { cityName: "STOCKHOLM", hasEmail: true },
  { maxRecords: 5000 }
)) {
  console.log(company["Company Name"], company["Email"]);
}
```

**Drive the scroll loop yourself**

```ts
let batch = await client.exportWithScroll({ cityName: "STOCKHOLM", hasEmail: true, pageSize: 50 });
while (batch.records.length > 0) {
  process(batch.records);
  if (!batch.hasMoreRecords || !batch.scrollId) break;
  batch = await client.exportWithScroll({ cityName: "STOCKHOLM", hasEmail: true, scrollId: batch.scrollId, pageSize: 50 });
}
```

**Anything else: drop to the master client**

```ts
const res = await client.raw.company.search({ countryCode: "DE", cityName: "BERLIN", pageSize: 10 });
```

### Common filters

| Filter | Example | Notes |
| --- | --- | --- |
| `search` | `"Volvo"` | Free text over company and trade names. |
| `nationalId` | `"5560743089"` | Registration number. The lookup helper sets this for you. |
| `cityName` | `"STOCKHOLM"` | UPPER CASE. |
| `provinceName` | `"NORRBOTTENS LÄN"` | Admin-2 name, UPPER CASE (the record's `State/Province`). |
| `postalCode` | `"96203"` | Exact match. |
| `hasEmail`, `hasPhone`, `hasWebsite` | `true` | Contact availability. |
| `employeesTotal`, `annualSales`, `foundingYears` | `{ min: 50, max: 500 }` | Range filters. |
| `sic4Digits` | `"7372"` | 4-digit SIC industry code. |

Full list: [companydata.com/api-docs/request-company](https://companydata.com/api-docs/request-company/).

## Four ways to integrate

Pick whichever fits how you build. All four hit the same data behind the same key.

1. **This register SDK** (`@companydata/bolagsverket-api`): Swedish lookups with a Bolagsverket-specific helper. You are here.
2. **Master SDK** ([`@companydata/companydata-sdk`](https://github.com/companydatacom/companydata-sdk)): all 200+ countries in one typed client, keyed by `countryCode`.
3. **MCP server**: connect an AI agent (Claude, Cursor and others) to `https://companydata.com/mcp/` with your key in the `x-api-key` header. See [companydata-mcp-server](https://github.com/companydatacom/companydata-mcp-server).
4. **Raw REST**: call `GET https://app.companydata.com/api/company/search?countryCode=SE&cityName=STOCKHOLM` with an `x-api-key` header. Contract: [companydata.com/openapi.json](https://companydata.com/openapi.json).

```bash
curl -H "x-api-key: $COMPANYDATA_API_KEY" \
  "https://app.companydata.com/api/company/search?countryCode=SE&nationalId=5560743089&pageSize=1"
```

## Error handling

Failed requests throw `ApiError` with the HTTP status. The client retries transient failures (429 and 5xx) with backoff before giving up.

```ts
import { ApiError } from "@companydata/bolagsverket-api";

try {
  await client.search({ cityName: "STOCKHOLM" });
} catch (err) {
  if (err instanceof ApiError) {
    // 401: bad or missing key, 429: rate limited,
    // "Export credit limit exceeded" (code credits_limit_exceeded): export credits used up
    console.error(err.status, err.message);
  }
}
```

A scroll batch that is larger than your remaining credits is rejected as a whole, so keep `pageSize` small when a key is close to its limit.

## All register wrappers

Same pattern, one per official register. Every wrapper returns the same record shape.

| Country | Register | Package | Lookup helper |
| --- | --- | --- | --- |
| 🇳🇱 Netherlands | KVK | [`@companydata/kvk-api`](https://github.com/companydatacom/kvk-api) | `getByKvkNumber` |
| 🇩🇪 Germany | Handelsregister | [`@companydata/handelsregister-api`](https://github.com/companydatacom/handelsregister-api) | `getByRegistrationNumber` |
| 🇬🇧 United Kingdom | Companies House | [`@companydata/companies-house-api`](https://github.com/companydatacom/companies-house-api) | `getByCompanyNumber` |
| 🇫🇷 France | Sirene | [`@companydata/sirene-api`](https://github.com/companydatacom/sirene-api) | `getBySiret` |
| 🇧🇪 Belgium | KBO/BCE | [`@companydata/kbo-api`](https://github.com/companydatacom/kbo-api) | `getByEnterpriseNumber` |
| 🇵🇱 Poland | KRS | [`@companydata/krs-api`](https://github.com/companydatacom/krs-api) | `getByNip` |
| 🇸🇪 Sweden | Bolagsverket | [`@companydata/bolagsverket-api`](https://github.com/companydatacom/bolagsverket-api) | `getByOrgNumber` |
| 🇨🇭 Switzerland | Zefix | [`@companydata/zefix-api`](https://github.com/companydatacom/zefix-api) | `getByUid` |
| 🇨🇿 Czech Republic | ARES | [`@companydata/ares-api`](https://github.com/companydatacom/ares-api) | `getByIco` |
| 🇩🇰 Denmark | CVR | [`@companydata/cvr-api`](https://github.com/companydatacom/cvr-api) | `getByCvr` |
| 🇧🇷 Brazil | CNPJ | [`@companydata/cnpj-api`](https://github.com/companydatacom/cnpj-api) | `getByCnpj` |
| 🇦🇺 Australia | ABR | [`@companydata/abn-lookup-api`](https://github.com/companydatacom/abn-lookup-api) | `getByAbn` |
| 🇺🇸 United States | SEC EDGAR | [`@companydata/sec-edgar-api`](https://github.com/companydatacom/sec-edgar-api) | `getByRegistrationNumber` |

Plus the master SDK for every other country: [`@companydata/companydata-sdk`](https://github.com/companydatacom/companydata-sdk).

## License

MIT. Built and maintained by [CompanyData.com](https://companydata.com).
