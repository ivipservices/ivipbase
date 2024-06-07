import { IvipBaseApp } from "../app";
import { ID, PathInfo, Types } from "ivipbase-core";
import { nodeValueTypes, processReadNodeValue } from "./storage/MDE/utils";
import { isDate, removeNulls } from "../utils";
import structureNodes from "./storage/MDE/structureNodes";

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

	const queryFilters: Array<Types.QueryFilter> = query.filters ?? [];
	const querySort: Array<Types.QueryOrder> = query.order ?? [];

	const nodes = await api.storage.getNodesBy(database, path, false, true, false).catch(() => Promise.resolve([]));

	let results: Array<{ path: string; val: any; nodes?: any[] }> = [];

	const pathInfo = PathInfo.get(path);
	const isWildcardPath = pathInfo.keys.some((key) => key === "*" || key.toString().startsWith("$")); // path.includes('*');
	const vars: string[] = isWildcardPath ? (pathInfo.keys.filter((key) => typeof key === "string" && key.startsWith("$")) as any) : [];

	const filters = queryFilters.filter((f) =>
		["<", "<=", "==", "!=", ">=", ">", "like", "!like", "in", "!in", "exists", "!exists", "between", "!between", "matches", "!matches", "has", "!has", "contains", "!contains"].includes(f.op),
	);

	results = nodes
		.sort((a, b) => {
			const aPath = PathInfo.get(a.path);
			const bPath = PathInfo.get(b.path);
			return aPath.isAncestorOf(bPath) || aPath.isParentOf(bPath) ? -1 : aPath.isDescendantOf(bPath) || aPath.isChildOf(bPath) ? 1 : 0;
		})
		.reduce((acc, node) => {
			const node_path = PathInfo.get(node.path);

			if (node_path.isChildOf(path)) {
				const index = acc.findIndex(({ path }) => node_path.equals(path));
				if (index >= 0) {
					acc[index].mainNode = node;
				} else {
					acc.push({ path: node.path, mainNode: node, heirsNodes: [] });
				}
			} else if (node_path.isDescendantOf(path)) {
				let mainPath = node_path;
				while (!mainPath?.isChildOf(path) && mainPath.parent !== null) {
					mainPath = mainPath.parent;
				}

				const index = acc.findIndex(({ path }) => mainPath.equals(path));

				if (index >= 0) {
					acc[index].heirsNodes.push(node);
				} else {
					acc.push({ path: mainPath.path, heirsNodes: [node] });
				}
			}

			return acc;
		}, [] as Array<{ path: string; mainNode?: (typeof nodes)[number]; heirsNodes: Array<(typeof nodes)[number]> }>)
		.map(({ path, mainNode, heirsNodes }) => {
			if (mainNode) {
				let value = mainNode.content.value;

				if (mainNode.content && (mainNode.content.type === nodeValueTypes.OBJECT || mainNode.content.type === nodeValueTypes.ARRAY)) {
					value = removeNulls(structureNodes(path, [mainNode, ...heirsNodes])) ?? null;
				}
				return { path, val: value, nodes: [mainNode, ...heirsNodes] };
			}
			return undefined;
		})
		.filter((node) => {
			if (!node || !["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(node.val)) || node.val === null) {
				return false;
			}

			const params = Object.fromEntries(Object.entries(PathInfo.extractVariables(path, node.path)).filter(([key]) => vars.includes(key)));
			const node_val: any = { ...params, ...(node.val as any) };

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

			return isFiltersValid;
		}) as any;

	const take = query.take > 0 ? query.take : results.length;

	results = results
		.sort((a, b) => {
			const compare = (i: number): number => {
				const o = querySort[i];
				if (!o) {
					return 0;
				}
				const trailKeys = PathInfo.get(typeof o.key === "number" ? `[${o.key}]` : o.key).keys;

				let left = trailKeys.reduce((val, key) => (val !== null && typeof val === "object" && key && key in val ? val[key] : null), a.val);

				let right = trailKeys.reduce((val, key) => (val !== null && typeof val === "object" && key && key in val ? val[key] : null), b.val);

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
		.filter((_, i) => i >= query.skip * take && i < query.skip * take + take);

	const isRealtime = typeof options.monitor === "object" && [options.monitor?.add, options.monitor?.change, options.monitor?.remove].some((val) => val === true);

	if (options.snapshots) {
		results = results.map(({ path, nodes }) => {
			const node_path = path.replace(new RegExp(`^${api.storage.settings.prefix.replace(/\//gi, "\\/")}`), "").replace(/^(\/)+/gi, "");
			const val =
				removeNulls(
					structureNodes(path, nodes ?? [], {
						include: options.include,
						exclude: options.exclude,
					}),
				) ?? null;
			return { path: node_path, val };
		});

		// for (let i = 0; i < results.length; i++) {
		// 	const path = results[i].path.replace(`${api.storage.settings.prefix}`, "").replace(/^(\/)+/gi, "");
		// 	const byNodes = results[i].nodes ?? [];

		// 	const val =
		// 		removeNulls(
		// 			structureNodes(results[i].path, byNodes, {
		// 				include: options.include,
		// 				exclude: options.exclude,
		// 			}),
		// 		) ?? null;

		// 	results[i] = { path: path, val };
		// }
	}

	return {
		results: options.snapshots ? results : results.map(({ path }) => path.replace(new RegExp(`^${api.storage.settings.prefix.replace(/\//gi, "\\/")}`), "").replace(/^(\/)+/gi, "")),
		context: null,
		stop: async () => {},
	};
}

export default executeQuery;
