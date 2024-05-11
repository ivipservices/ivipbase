import { IvipBaseApp } from "../app";
import { ID, PathInfo, Types } from "ivipbase-core";

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

	const context: any = {};
	context.database_cursor = ID.generate();

	const queryFilters: Array<Types.QueryFilter & { index?: any; indexUsage?: "filter" | "sort" }> = query.filters.map((f) => ({ ...f }));
	const querySort: Array<Types.QueryOrder & { index?: any }> = query.order.map((s) => ({ ...s }));

	const stepsExecuted = {
		filtered: queryFilters.length === 0,
		skipped: query.skip === 0,
		taken: query.take === 0,
		sorted: querySort.length === 0,
		preDataLoaded: false,
		dataLoaded: false,
	};

	const sortMatches = (matches: Array<any>) => {
		matches.sort((a, b) => {
			const compare = (i: number): number => {
				const o = querySort[i];
				const trailKeys = PathInfo.getPathKeys(typeof o.key === "number" ? `[${o.key}]` : o.key);
				const left = trailKeys.reduce((val, key) => (val !== null && typeof val === "object" && key in val ? val[key] : null), a.val);
				const right = trailKeys.reduce((val, key) => (val !== null && typeof val === "object" && key in val ? val[key] : null), b.val);

				if (left === null) {
					return right === null ? 0 : o.ascending ? -1 : 1;
				}
				if (right === null) {
					return o.ascending ? 1 : -1;
				}

				// TODO: add collation options using Intl.Collator. Note this also has to be implemented in the matching engines (inclusing indexes)
				// See discussion https://github.com/appy-one/acebase/discussions/27
				if (left == right) {
					if (i < querySort.length - 1) {
						return compare(i + 1);
					} else {
						return a.path < b.path ? -1 : 1;
					} // Sort by path if property values are equal
				} else if (left < right) {
					return o.ascending ? -1 : 1;
				}
				// else if (left > right) {
				return o.ascending ? 1 : -1;
				// }
			};
			return compare(0);
		});
	};

	const loadResultsData = async (preResults: Array<{ path: string }>, options: { include?: Array<string | number>; exclude?: Array<string | number>; child_objects?: boolean }) => {
		// Limit the amount of concurrent getValue calls by batching them
		if (preResults.length === 0) {
			return [];
		}
		const maxBatchSize = 50;
		const batch = new AsyncTaskBatch(maxBatchSize);
		const results: Array<{ path: string; val: any }> = [];
		preResults.forEach(({ path }, index) =>
			batch.add(async () => {
				const node = await api.storage.get(database, path, {
					include: options.include,
					exclude: options.exclude,
					//child_objects: options.child_objects
				});
				const val = node.value;
				if (val === null) {
					// Record was deleted, but index isn't updated yet?
					api.storage.debug.warn(`Indexed result "/${path}" does not have a record!`);
					// TODO: let index rebuild
					return;
				}

				const result = { path, val };
				if (stepsExecuted.sorted) {
					// Put the result in the same index as the preResult was
					results[index] = result;
				} else {
					results.push(result);
					if (!stepsExecuted.skipped && results.length > query.skip + Math.abs(query.take)) {
						// we can toss a value! sort, toss last one
						sortMatches(results);
						results.pop(); // Always toss last value, results have been sorted already
					}
				}
			}),
		);
		await batch.finish();
		return results;
	};

	const pathInfo = PathInfo.get(path);
	const isWildcardPath = pathInfo.keys.some((key) => key === "*" || key.toString().startsWith("$")); // path.includes('*');

	const usingIndexes = [] as Array<{ index: any; description: string }>;
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	let stop = async () => {};

	if (isWildcardPath) {
		// Verifica se o caminho contém $vars com valores de filtro explícitos. Se sim, execute várias consultas e una os resultados
		const vars = pathInfo.keys.filter((key) => typeof key === "string" && key.startsWith("$"));
		const hasExplicitFilterValues = vars.length > 0 && vars.every((v) => query.filters.some((f) => f.key === v && ["==", "in"].includes(f.op)));
		const isRealtime = typeof options.monitor === "object" && [options.monitor?.add, options.monitor?.change, options.monitor?.remove].some((val) => val === true);

		if (hasExplicitFilterValues && !isRealtime) {
			// create path combinations
			const combinations = [] as Record<string, string>[];
			for (const v of vars) {
				const filters = query.filters.filter((f) => f.key === v);
				const filterValues = filters.reduce((values, f) => {
					if (f.op === "==") {
						values.push(f.compare);
					}
					if (f.op === "in") {
						if (!(f.compare instanceof Array)) {
							throw new Error(`compare argument for 'in' operator must be an Array`);
						}
						values.push(...f.compare);
					}
					return values;
				}, [] as string[]);
				// Expand all current combinations with these filter values
				const prevCombinations = combinations.splice(0);
				filterValues.forEach((fv) => {
					if (prevCombinations.length === 0) {
						combinations.push({ [v]: fv });
					} else {
						combinations.push(...prevCombinations.map((c) => ({ ...c, [v]: fv })));
					}
				});
			}
			// create queries
			const filters = query.filters.filter((f) => !vars.includes(f.key as string));
			const paths = combinations.map((vars) => PathInfo.get(PathInfo.getPathKeys(path).map((key) => vars[key] ?? key)).path);
			const loadData = query.order.length > 0;
			const promises = paths.map((path) =>
				executeQuery(
					api,
					database,
					path,
					{ filters, take: 0, skip: 0, order: [] },
					{
						snapshots: loadData,
						cache_mode: options.cache_mode,
						include: [...(options.include ?? []), ...query.order.map((o) => o.key)],
						exclude: options.exclude,
					},
				),
			);
			const resultSets = await Promise.all(promises);
			let results = resultSets.reduce((results, set) => (results.push(...set.results), results), [] as any[]);
			if (loadData) {
				sortMatches(results);
			}
			if (query.skip > 0) {
				results.splice(0, query.skip);
			}
			if (query.take > 0) {
				results.splice(query.take);
			}
			if (options.snapshots && (!loadData || (options.include?.length ?? 0) > 0 || (options.exclude?.length ?? 0) > 0 || !options.child_objects)) {
				const { include, exclude, child_objects } = options;
				results = await loadResultsData(results, { include, exclude, child_objects });
			}
			return { results, context: null, stop };
			// const results = options.snapshots ? results
		}
	}
}

export default executeQuery;
