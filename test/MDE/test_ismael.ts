import MDE from "../../src/server/services/database/MDE";
import JSONData from "../myjsonfile.json";

const main = new MDE({
	prefix: "",
	getMultiple(expression) {
		const list = JSONData.filter(({ path }) => expression.test(path)) as any[];
		console.log(list.length);
		return list;
	},
	init() {
		this.pushNode([
			{
				path: "ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788",
				type: "SET",
				content: {
					type: 1,
					value: {
						currency_id: "test 02",
					},
					revision: "lnt02q7w000doohxasia0o3e",
					revision_nr: 1,
					created: 1697467086140,
					modified: Date.now(),
				},
			},
		]);

		this.getNodesBy("ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788").then((nodes) => {
			console.log(JSON.stringify(nodes, null, 4));
		});

		// this.getInfoBy("ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788/status", { include_child_count: true }).then((info) => {
		// 	console.log(info);
		// });
	},
});
