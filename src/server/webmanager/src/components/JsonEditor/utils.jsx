import React, { useEffect, useState, useRef } from "react";
import { Box, TextField } from "@mui/material";
import PropTypes from "prop-types";
import IMask from "imask";
import { IMaskInput } from "react-imask";
import moment from "moment";
import { mdiAlphabetical, mdiNumeric, mdiAsterisk, mdiToggleSwitch, mdiCalendar, mdiCodeBraces, mdiCodeBrackets, mdiNumeric9PlusBoxMultiple, mdiHook, mdiMatrix } from "@mdi/js";
import { PathReference, Utils, ascii85 } from "ivipbase";

export const palette = ["102,187,106", "38,166,154", "229,115,115", "66,165,245", "0, 161, 180", "255, 194, 0", "236,64,122", "126,87,194", "255, 122, 0"];

// const palette = ["209, 150, 22", "198, 120, 221", "97, 175, 239", "209, 154, 102", "224, 108, 117", "152, 195, 121", "86, 182, 194", "229, 192, 123", "158, 158, 158"];

export const types = {
	unknown: mdiAsterisk,
	string: mdiAlphabetical,
	number: mdiNumeric,
	date: mdiCalendar,
	boolean: mdiToggleSwitch,
	object: mdiCodeBraces,
	array: mdiCodeBrackets,
	reference: mdiHook,
	bigint: mdiNumeric9PlusBoxMultiple,
	binary: mdiMatrix,
};

export const isJson = (str) => {
	try {
		const d = JSON.parse(str);
		return ["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(d));
	} catch (e) {
		return false;
	}
};

export const AutoWidthTextField = ({ value, defaultValue, minWidth = 30, maxWidth = 400, type, style, ...props }) => {
	const [inputWidth, setInputWidth] = useState(0);
	const inputRef = useRef(null);
	const spanRef = useRef(null);

	function measureInputValueWidth() {
		if (!inputRef.current || !spanRef.current) {
			return 0;
		}
		const span = spanRef.current;
		const style = window.getComputedStyle(inputRef.current, null);
		span.style.whiteSpace = "pre";
		span.style.fontFamily = style.fontFamily;
		span.style.fontSize = style.fontSize;
		span.style.fontWeight = style.fontWeight;
		span.style.fontStyle = style.fontStyle;
		span.style.letterSpacing = style.letterSpacing;
		span.style.textTransform = style.textTransform;
		span.style.padding = style.padding;
		span.style.margin = style.margin;
		span.style.border = style.border;
		span.style.boxSizing = style.boxSizing;
		return span.getBoundingClientRect().width;
	}

	useEffect(() => {
		if (spanRef.current) {
			const newWidth = measureInputValueWidth() + (type === "number" ? 24 : 2); // Adicione um pequeno buffer
			setInputWidth(newWidth);
		}
	}, [value, defaultValue, maxWidth, minWidth]);

	return (
		<Box position="relative">
			<TextField
				{...props}
				defaultValue={defaultValue}
				value={value}
				type={type}
				style={{
					...(style ?? {}),
					width: Math.max(String(value) === "" ? minWidth : 30, Math.min(inputWidth, maxWidth)),
				}}
				inputRef={inputRef}
			/>
			<div
				ref={spanRef}
				style={{
					position: "absolute",
					top: "0px",
					left: "0px",
					visibility: "hidden",
					overflow: "hidden",
					maxWidth: `${maxWidth}px`,
					minWidth: `${String(value) === "" ? minWidth : 30}px`,
				}}
			>
				{value ?? defaultValue}
			</div>
		</Box>
	);
};

export const momentFormat = "DD/MM/YYYY HH:mm:ss";

export const TextMaskDate = React.forwardRef(function TextMaskCustom({ onChange, ...props }, ref) {
	return (
		<IMaskInput
			{...props}
			mask={Date}
			pattern={momentFormat}
			lazy={false}
			format={(date) => moment(date).format(momentFormat)}
			parse={(str) => moment(str, momentFormat)}
			blocks={{
				YYYY: {
					mask: IMask.MaskedRange,
					from: 1800,
					to: 3100,
				},
				MM: {
					mask: IMask.MaskedRange,
					from: 1,
					to: 12,
				},
				DD: {
					mask: IMask.MaskedRange,
					from: 1,
					to: 31,
				},
				HH: {
					mask: IMask.MaskedRange,
					from: 0,
					to: 23,
				},
				mm: {
					mask: IMask.MaskedRange,
					from: 0,
					to: 59,
				},
				ss: {
					mask: IMask.MaskedRange,
					from: 0,
					to: 59,
				},
			}}
			inputRef={ref}
			onAccept={(value) => onChange({ target: { name: props.name, value } })}
			overwrite
		/>
	);
});

TextMaskDate.propTypes = {
	name: PropTypes.string.isRequired,
	onChange: PropTypes.func.isRequired,
};

export const resolveArrayPath = (path) => {
	return path
		.slice(1)
		.reduce((acc, iten) => {
			return `${acc}${typeof iten === "number" ? `[${iten}]` : `/${iten}`}`;
		}, "")
		.replace(/^\/+/gi, "");
};

export const valueToString = (value) => {
	if (value === null) {
		return "";
	}

	if (value === undefined) {
		return "";
	}

	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}

	if (Utils.isDate(value)) {
		return moment(value).format(momentFormat);
	}

	if (["string", "number"].includes(typeof value)) {
		return value;
	}

	if (value instanceof PathReference) {
		return value.path;
	}

	if (value instanceof ArrayBuffer) {
		return ascii85.encode(val);
	}

	if (typeof value === "object") {
		return JSON.stringify(value);
	}

	return value.toString();
};

export const normalizeValue = (value, type, selfVerify = true) => {
	switch (type) {
		case "string":
			if (typeof value !== "string") throw new Error("Invalid value for string type");
			value = value.replace(/^"(.*)"$/gi, "$1");
			break;
		case "number":
			if (/[\d\,\.]+/gi.test(value) !== true) throw new Error("Invalid value for number type");
			value = parseFloat(value);
			break;
		case "bigint":
			if (/^(?:[-+]?[0-9]+|0[xX][0-9a-fA-F]+|0[bB][01]+)$/gi.test(value) !== true) throw new Error("Invalid value for bigint type");
			value = BigInt(value);
			break;
		case "boolean":
			// if (!["true", "false"].includes(value)) throw new Error("Invalid value for boolean type");
			value = value === "false" || value === false ? false : true;
			break;
		case "binary":
			if (typeof value !== "string") throw new Error("Invalid value for binary type");
			value = ascii85.decode(value);
			break;
		case "date":
			if (Utils.isDate(value)) {
				value = new Date(value).toISOString();
			} else if (/^([\d\/\s\:]+)$/gi.test(value) && moment(value, momentFormat).isValid()) {
				value = moment(value, momentFormat).toDate().toISOString();
			} else {
				throw new Error(`Invalid value for Date type`);
			}
			break;
		case "reference":
			if (typeof value !== "string") throw new Error(`Invalid value for Reference type`);
			value = new PathReference(value);
			break;
		case "object":
		case "array":
			if (typeof value !== "string" || !isJson(value)) throw new Error(`Invalid value for ${type} type`);

			const obj = JSON.parse(value);

			if (type === "array" && Object.prototype.toString.call(obj) !== "[object Array]") throw new Error("Invalid value for array type");

			if (type === "object" && Object.prototype.toString.call(obj) !== "[object Object]") throw new Error("Invalid value for object type");

			value = obj;
			break;
		default: {
			if (["true", "false", true, false].includes(value)) {
				type = "boolean";
			} else if (/[\d\.\,]+/gi.test(String(value)) && !isNaN(value)) {
				type = "number";
			} else if (/^(?:[-+]?[0-9]+|0[xX][0-9a-fA-F]+|0[bB][01]+)$/gi.test(String(value)) && !isNaN(BigInt(value))) {
				type = "bigint";
			} else if (Utils.isDate(value) || (/^([\d\/\s\:]+)$/gi.test(value) && moment(value, momentFormat).isValid())) {
				type = "date";
			} else if (isJson(value)) {
				type = Array.isArray(JSON.parse(value)) ? "array" : "object";
			} else {
				type = "string";
				value = `"${value}"`;
			}

			if (selfVerify) {
				return normalizeValue(value, type, false);
			}
		}
	}

	return { value, type };
};

export const getValueType = (value) => {
	if (value instanceof Array) {
		return "array";
	} else if (value instanceof PathReference) {
		return "reference";
	} else if (value instanceof ArrayBuffer) {
		return "binary";
	} else if (Utils.isDate(value)) {
		return "date";
	} else if (typeof value === "string") {
		return "string";
	} else if (typeof value === "object" && value !== null) {
		return "object";
	} else if (typeof value === "number") {
		return "number";
	} else if (typeof value === "boolean") {
		return "boolean";
	} else if (typeof value === "bigint") {
		return "bigint";
	}
	return "unknown";
};
