import { IvipBaseApp } from "../app";
import { ID, PathInfo, Types } from "ivipbase-core";
import { processReadNodeValue } from "./storage/MDE/utils";
import { isDate } from "ivip-utils";

const noop = () => {};

/**
 *
 * @param storage Instância de armazenamento de destino
 * @param dbName Nome do banco de dados
 * @param path Caminho da coleção de objetos para executar a consulta
 * @param query Consulta a ser executada
 * @param options Opções adicionais
 * @returns Retorna uma promise que resolve com os dados ou caminhos correspondentes em `results`
 */
export async function executeQuery(
	api: IvipBaseApp,
	database: string,
	path: string,
	query: Types.Query,
	options: Types.QueryOptions = { snapshots: false, include: undefined, exclude: undefined, child_objects: undefined, eventHandler: noop },
): Promise<{
	results: Array<{ path: string; val: any }> | string[];
	context: any;
	stop(): Promise<void>;
}> {
	if (typeof options !== "object") {
		options = {};
	}
	if (typeof options.snapshots === "undefined") {
		options.snapshots = false;
	}

	const originalPath = path;
	path = PathInfo.get([api.storage.settings.prefix, originalPath]).path;

	const context: any = {};
	context.database_cursor = ID.generate();

	const queryFilters: Array<Types.QueryFilter & { index?: any; indexUsage?: "filter" | "sort" }> = query.filters.map((f) => ({ ...f }));
	const querySort: Array<Types.QueryOrder & { index?: any }> = query.order.map((s) => ({ ...s }));

	const nodes = await api.storage
		.getNodesBy(database, path, true, false)
		.then((nodes) => {
			return Promise.resolve(
				nodes.filter(({ path: p }) => {
					return PathInfo.get(p).isChildOf(path);
				}),
			);
		})
		.catch(() => Promise.resolve([]));

	let results: Array<{ path: string; val: any }> = [];

	const pathInfo = PathInfo.get(path);
	const isWildcardPath = pathInfo.keys.some((key) => key === "*" || key.toString().startsWith("$")); // path.includes('*');
	const vars: string[] = isWildcardPath ? (pathInfo.keys.filter((key) => typeof key === "string" && key.startsWith("$")) as any) : [];

	for (const node of nodes) {
		const value = processReadNodeValue(node.content).value;
		if (typeof value !== "object" || value === null) {
			continue;
		}

		const node_path = PathInfo.get(node.path);
		const params = Object.fromEntries(Object.entries(PathInfo.extractVariables(path, node_path.path)).filter(([key]) => vars.includes(key)));
		const node_val: any = { ...params, ...value };

		const filters = queryFilters.filter((f) =>
			["<", "<=", "==", "!=", ">=", ">", "like", "!like", "in", "!in", "exists", "!exists", "between", "!between", "matches", "!matches", "has", "!has", "contains", "!contains"].includes(f.op),
		);

		const isFiltersValid = filters.every((f) => {
			const val = isDate(node_val[f.key] as any) ? new Date(node_val[f.key] as any).getTime() : (node_val[f.key] as any);
			const op = f.op;
			const compare = isDate(f.compare) ? new Date(f.compare).getTime() : f.compare;

			switch (op) {
				case "<":
					return val < compare;
				case "<=":
					return val <= compare;
				case "==":
					return val === compare;
				case "!=":
					return val !== compare;
				case ">=":
					return val >= compare;
				case ">":
					return val > compare;
				case "in":
				case "!in": {
					if (!(f.compare instanceof Array)) {
						return op === "!in";
					}
					const isIn = f.compare instanceof Array && f.compare.includes(val);
					return op === "in" ? isIn : !isIn;
				}
				case "exists":
				case "!exists": {
					const isExists = val !== undefined && val !== null;
					return op === "exists" ? isExists : !isExists;
				}
				case "between":
				case "!between": {
					if (!(f.compare instanceof Array)) {
						return op === "!between";
					}
					const isBetween = f.compare instanceof Array && val >= f.compare[0] && val <= f.compare[1];
					return op === "between" ? isBetween : !isBetween;
				}
				case "like":
				case "!like": {
					if (typeof compare !== "string") {
						return op === "!like";
					}
					const pattern = "^" + compare.replace(/\*/g, ".*").replace(/\?/g, ".") + "$";
					const re = new RegExp(pattern, "i");
					const isLike = re.test(val as string);
					return op === "like" ? isLike : !isLike;
				}
				case "matches":
				case "!matches": {
					if (typeof compare !== "string") {
						return op === "!matches";
					}
					const re = new RegExp(compare, "i");
					const isMatch = re.test(val as string);
					return op === "matches" ? isMatch : !isMatch;
				}
				case "has":
				case "!has": {
					if (typeof val !== "object") {
						return op === "!has";
					}
					const hasKey = Object.keys(val).includes(compare);
					return op === "has" ? hasKey : !hasKey;
				}
				case "contains":
				case "!contains": {
					if (!(val instanceof Array)) {
						return op === "!contains";
					}
					const contains = val.includes(compare);
					return op === "contains" ? contains : !contains;
				}
			}

			return false;
		});

		if (isFiltersValid) {
			results.push({ path: node.path, val: value });
		}
	}

	results = results
		.sort((a, b) => {
			const compare = (i: number): number => {
				const o = querySort[i];
				const trailKeys = PathInfo.get(typeof o.key === "number" ? `[${o.key}]` : o.key).keys;

				let left = trailKeys.reduce((val, key) => (val !== null && typeof val === "object" && key in val ? val[key] : null), a.val);

				let right = trailKeys.reduce((val, key) => (val !== null && typeof val === "object" && key in val ? val[key] : null), b.val);

				left = isDate(left) ? new Date(left).getTime() : left;
				right = isDate(right) ? new Date(right).getTime() : right;

				if (left === null) {
					return right === null ? 0 : o.ascending ? -1 : 1;
				}
				if (right === null) {
					return o.ascending ? 1 : -1;
				}

				if (left == right) {
					if (i < querySort.length - 1) {
						return compare(i + 1);
					} else {
						return a.path < b.path ? -1 : 1;
					}
				} else if (left < right) {
					return o.ascending ? -1 : 1;
				}
				// else if (left > right) {
				return o.ascending ? 1 : -1;
				// }
			};
			return compare(0);
		})
		.slice(query.skip, query.skip + Math.abs(query.take > 0 ? query.take : results.length));

	const isRealtime = typeof options.monitor === "object" && [options.monitor?.add, options.monitor?.change, options.monitor?.remove].some((val) => val === true);

	if (options.snapshots) {
		for (let i = 0; i < results.length; i++) {
			const path = results[i].path.replace(`${api.storage.settings.prefix}`, "").replace(/^(\/)+/gi, "");
			const val = await api.storage.get(database, path, {
				include: options.include,
				exclude: options.exclude,
			});
			results[i] = { path: path, val };
		}
	}

	return {
		results: options.snapshots ? results : results.map(({ path }) => path),
		context: null,
		stop: async () => {},
	};
}

export default executeQuery;
