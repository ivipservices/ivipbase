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

		const transformedData: Record<string, WalletData> = {};

		result.forEach((entry) => {
			const pathComponents = entry.path.split("/");
			const walletId = pathComponents[2];
			const symbol = entry.content.value.symbol;
			const available = entry.content.value.available;
			const value = entry.content.value.value;

			if (!transformedData[walletId]) {
				transformedData[walletId] = {
					dataModificacao: entry.content.modified,
					dateValidity: entry.content.created,
					totalValue: 0,
					currencyType: "USD",
					balancesModificacao: new Date(entry.content.modified).toISOString(),
					balances: {},
					history: {},
				};
			}

			transformedData[walletId].balances[symbol] = {
				available,
				symbol,
				value,
			};

			if (entry.content.history) {
				Object.keys(entry.content.history).forEach((historyId) => {
					transformedData[walletId].history[historyId] = entry.content.history[historyId];
				});
			}
		});

		console.log(transformedData);

		if (result) {
		} else {
			console.log("Documento não encontrado");
		}
	} finally {
		await client.close();
	}
}

main().catch(console.error);
