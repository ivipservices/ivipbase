import { ID, PathInfo } from "ivipbase-core";
import { NodesPending } from "./NodeInfo";
import { VALUE_TYPES, getTypedChildValue, getValueType, nodeValueTypes, valueFitsInline } from "./utils";
import type MDE from ".";

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
			result.push(node);
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
	}

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

	result.push(node);

	return result;
}
