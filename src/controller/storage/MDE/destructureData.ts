import { ID, PathInfo } from "ivipbase-core";
import { NodesPending } from "./NodeInfo";
import { VALUE_TYPES, getTypedChildValue, getValueType, nodeValueTypes, valueFitsInline } from "./utils";
import type MDE from ".";
import { joinObjects } from "../../../utils";

export default function destructureData(
	this: MDE,
	type: Exclude<NodesPending["type"], "VERIFY" | undefined>,
	path: string,
	data: any,
	options: {
		assert_revision?: string;
		include_checks?: boolean;
		previous_result?: NodesPending[];
	} = {},
): NodesPending[] {
	let result: NodesPending[] = options?.previous_result ?? [];
	let pathInfo = PathInfo.get(path);
	const revision = options?.assert_revision ?? ID.generate();
	options.assert_revision = revision;
	options.include_checks = typeof options.include_checks === "boolean" ? options.include_checks : true;

	const resolveConflict = (node: NodesPending) => {
		const comparison = result.find((n) => PathInfo.get(n.path).equals(node.path));

		if (!comparison) {
			result.push(node);
			return;
		}

		result = result.filter((n) => !PathInfo.get(n.path).equals(node.path));

		if (comparison.content.type !== node.content.type) {
			result.push(node);
			return;
		}

		if (comparison.type === "VERIFY") {
			comparison.type = "UPDATE";
		}

		node.content.value = joinObjects(comparison.content.value, node.content.value);
		result.push(node);
	};

	if (options.include_checks) {
		while (typeof pathInfo.parentPath === "string" && pathInfo.parentPath.trim() !== "") {
			const node: NodesPending = {
				path: pathInfo.parentPath,
				type: "VERIFY",
				content: {
					type: (typeof pathInfo.key === "number" ? nodeValueTypes.ARRAY : nodeValueTypes.OBJECT) as any,
					value: {},
					revision,
					revision_nr: 1,
					created: Date.now(),
					modified: Date.now(),
				},
			};
			resolveConflict(node);
			pathInfo = PathInfo.get(pathInfo.parentPath);
		}
	}

	options.include_checks = false;

	let value = data;
	let valueType = getValueType(value);

	if (typeof value === "object" && value !== null) {
		value = {};
		valueType = Array.isArray(data) ? VALUE_TYPES.ARRAY : VALUE_TYPES.OBJECT;

		for (let key in data) {
			if (valueType === VALUE_TYPES.OBJECT && valueFitsInline(data[key], this.settings)) {
				value[key] = getTypedChildValue(data[key]);
				if (value[key] === null) {
					result = destructureData.apply(this, [type, PathInfo.get([path, valueType === VALUE_TYPES.OBJECT ? key : parseInt(key)]).path, null, { ...options, previous_result: result }]);
				}
				continue;
			}

			result = destructureData.apply(this, [type, PathInfo.get([path, valueType === VALUE_TYPES.OBJECT ? key : parseInt(key)]).path, data[key], { ...options, previous_result: result }]);
		}
	} else if (valueFitsInline(value, this.settings)) {
		const parentPath = PathInfo.get(pathInfo.parentPath as any);
		const parentNode: NodesPending = result.find((node) => PathInfo.get(node.path).equals(parentPath)) ?? {
			path: parentPath.path,
			type: "UPDATE",
			content: {
				type: (typeof parentPath.key === "number" ? nodeValueTypes.ARRAY : nodeValueTypes.OBJECT) as any,
				value: {},
				revision,
				revision_nr: 1,
				created: Date.now(),
				modified: Date.now(),
			},
		};

		result = result.filter((node) => !PathInfo.get(node.path).equals(parentPath));

		parentNode.type = "UPDATE";

		if (parentNode.content.value === null || typeof parentNode.content.value !== "object") {
			parentNode.content.value = {};
		}

		if (parentNode.content.type === nodeValueTypes.OBJECT) {
			parentNode.content.value[pathInfo.key as string] = getTypedChildValue(value);
		} else {
			(parentNode as any).content.value[parseInt(pathInfo.key as string)] = getTypedChildValue(value);
		}

		resolveConflict(parentNode);
	}

	if (!valueFitsInline(value, this.settings) || value === null) {
		const node: NodesPending = {
			path,
			type,
			content: {
				type: valueType as any,
				value,
				revision,
				revision_nr: 1,
				created: Date.now(),
				modified: Date.now(),
			},
		};

		resolveConflict(node);
	}

	let intex = 0;

	while (intex < result.length) {
		const node = result[intex];
		const pathInfo = PathInfo.get(node.path);
		const parentNode = result.find((n) => PathInfo.get(n.path).isParentOf(node.path));

		if (!parentNode && pathInfo.parentPath && pathInfo.parentPath.trim() !== "") {
			const verifyNode: NodesPending = {
				path: pathInfo.parentPath as any,
				type: "VERIFY",
				content: {
					type: (typeof pathInfo.key === "number" ? nodeValueTypes.ARRAY : nodeValueTypes.OBJECT) as any,
					value: {},
					revision,
					revision_nr: 1,
					created: Date.now(),
					modified: Date.now(),
				},
			};

			result.push(verifyNode);
		}

		intex++;
	}

	return result; //.filter((node, index, self) => self.findIndex((n) => n.path === node.path) === index);
}
