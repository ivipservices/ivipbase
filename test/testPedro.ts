import { MongoClient } from "mongodb";

interface Balance {
	available: string;
	symbol: string;
	value: number;
}

interface HistoryEntry {
	type: string;
	wallet_type: string;
}

interface WalletData {
	dataModificacao: number;
	dateValidity: number;
	totalValue: number;
	currencyType: string;
	balancesModificacao: string;
	balances: Record<string, Balance>;
	history: Record<string, HistoryEntry>;
}

async function main() {
	const uri = "mongodb://manager:9Hq91q5oExU9biOZ7yq98I8P1DU1ge@ivipcoin-api.com:4048/?authMechanism=DEFAULT";
	const client = new MongoClient(uri);

	try {
		await client.connect();
		const collection = client.db("root").collection("teste");

		const result = await collection.find().toArray();

		const transformedData = result.reduce((acc, entry) => {
			const { path, content } = entry;
			const pathComponents = path.split("/");
			const walletId = pathComponents[2];
			const { symbol, available, value, history } = content.value;

			if (!acc[walletId]) {
				acc[walletId] = {
					dataModificacao: content.modified,
					dateValidity: content.created,
					totalValue: 0,
					currencyType: "USD",
					balancesModificacao: new Date(content.modified).toISOString(),
					balances: {},
					history: {},
				};
			}

			acc[walletId].balances[symbol] = { available, symbol, value };

			if (history) {
				Object.assign(acc[walletId].history, history);
			}

			return acc;
		}, {});

		console.log(transformedData);

		if (result.length === 0) {
			console.log("Documento não encontrado");
		}
	} finally {
		await client.close();
	}
}

main().catch(console.error);
