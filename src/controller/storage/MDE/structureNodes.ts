import { PathInfo } from "ivipbase-core";
import { StorageNodeInfo } from "./NodeInfo";
import { nodeValueTypes, processReadNodeValue } from "./utils";

export default function structureNodes(
	path: string,
	nodes: StorageNodeInfo[],
	options: {
		include?: Array<string | number>;
		exclude?: Array<string | number>;
		path_main?: string;
	} = {},
): any {
	options.path_main = !options.path_main ? path : options.path_main;
	const include = (options?.include ?? []).map((p) => PathInfo.get([options.path_main ?? path, p]));
	const exclude = (options?.exclude ?? []).map((p) => PathInfo.get([options.path_main ?? path, p]));
	const pathInfo = PathInfo.get(path);
	const mainNode = nodes.find(({ path: p }) => pathInfo.equals(p) || pathInfo.isChildOf(p));

	if (!mainNode) {
		return undefined;
	}

	const checkIncludedPath = (from: string) => {
		const p = PathInfo.get(from);
		const isInclude = include.length > 0 ? include.findIndex((path) => p.equals(path) || p.isDescendantOf(path)) >= 0 : true;
		return exclude.findIndex((path) => p.equals(path) || p.isDescendantOf(path)) < 0 && isInclude;
	};

	const resolveObjetByIncluded = (path: string, obj: Array<any> | Record<string | number, any>) => {
		return Object.fromEntries(
			Object.entries(obj).filter(([k, v]) => {
				const p = PathInfo.get([path, k]);
				return checkIncludedPath(p.path);
			}),
		);
	};

	let value: any = undefined;
	let { path: nodePath, content } = mainNode;
	content = processReadNodeValue(content);

	if (pathInfo.isChildOf(nodePath)) {
		if (
			(content.type === nodeValueTypes.OBJECT || content.type === nodeValueTypes.ARRAY) &&
			typeof content.value === "object" &&
			content.value !== null &&
			pathInfo.key &&
			pathInfo.key in content.value
		) {
			value = (content.value as any)[pathInfo.key as any] ?? undefined;
		}
		return value;
	}

	if (content.type === nodeValueTypes.OBJECT || content.type === nodeValueTypes.ARRAY) {
		return nodes
			.filter(({ path: p }) => pathInfo.isParentOf(p) || pathInfo.isAncestorOf(p))
			.sort((a, b) => {
				const aPath = PathInfo.get(a.path);
				const bPath = PathInfo.get(b.path);
				return aPath.isAncestorOf(bPath) || aPath.isParentOf(bPath) ? -1 : aPath.isDescendantOf(bPath) || aPath.isChildOf(bPath) ? 1 : 0;
			})
			.reduce((acc, { path, content }) => {
				const pathInfo = PathInfo.get(path);

				if (pathInfo.key !== null && checkIncludedPath(path)) {
					content = processReadNodeValue(content);
					const propertyTrail = PathInfo.getPathKeys(path.slice(nodePath.length + 1));

					let targetObject = acc;
					const targetProperty = propertyTrail.slice(-1)[0];

					for (let p of propertyTrail.slice(0, -1)) {
						if (!(p in targetObject)) {
							targetObject[p] = typeof p === "number" ? [] : {};
						}
						targetObject = targetObject[p];
					}

					if (content.type === nodeValueTypes.OBJECT || content.type === nodeValueTypes.ARRAY) {
						targetObject[targetProperty] = resolveObjetByIncluded(path, content.value);
					} else {
						targetObject[targetProperty] = content.value;
					}
				}
				return acc;
			}, resolveObjetByIncluded(nodePath, content.value));
	}

	return content.value;

	// if (nodes.length === 1) {
	// 	const { path: p, content } = nodes[0];
	// 	value = processReadNodeValue(content).value;
	// 	if (content.type === nodeValueTypes.OBJECT) {
	// 		value = Object.fromEntries(
	// 			Object.entries(value).filter(([k, v]) => {
	// 				const p = PathInfo.get([path, k]);
	// 				return checkIncludedPath(p.path);
	// 			}),
	// 		);
	// 	}

	// 	if (pathInfo.equals(p) !== true) {
	// 		value = pathInfo.key !== null && pathInfo.key in value ? value[pathInfo.key] : undefined;
	// 	}
	// } else if (nodes.length > 1) {
	// 	nodes = nodes
	// 		.filter(({ path }) => checkIncludedPath(path))
	// 		.sort(({ path: p1 }, { path: p2 }) => {
	// 			return PathInfo.get(p1).isAncestorOf(p2) ? -1 : PathInfo.get(p1).isDescendantOf(p2) ? 1 : 0;
	// 		});
	// 	const responsibleNode = nodes.find(({ path: p }) => pathInfo.equals(p));

	// 	if (!responsibleNode) {
	// 		value = undefined;
	// 	} else {
	// 		value = processReadNodeValue(responsibleNode.content).value;
	// 		const child_nodes = nodes.filter(({ path: p }) => pathInfo.isParentOf(p));

	// 		for (let node of child_nodes) {
	// 			const pathInfo = PathInfo.get(node.path);
	// 			if (pathInfo.key === null) {
	// 				continue;
	// 			}
	// 			const v = structureNodes(
	// 				node.path,
	// 				nodes.filter(({ path: p }) => pathInfo.equals(p) || pathInfo.isAncestorOf(p)),
	// 				options,
	// 			);
	// 			value[pathInfo.key] = v;
	// 		}
	// 	}
	// }

	// return value;
}
