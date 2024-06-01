import React, { useEffect, useLayoutEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import style from "./style.module.scss";
import { Box, Typography, Breadcrumbs, Link, TextField, Button, IconButton, MenuItem, CircularProgress } from "@mui/material";
import PropTypes from "prop-types";
import IMask from "imask";
import { IMaskInput } from "react-imask";
import moment from "moment";
import {
	mdiAlphabetical,
	mdiNumeric,
	mdiAsterisk,
	mdiCodeJson,
	mdiToggleSwitch,
	mdiArrowDownDropCircle,
	mdiArrowRightDropCircle,
	mdiDelete,
	mdiPlus,
	mdiChevronDown,
	mdiPencil,
	mdiClose,
	mdiLink,
	mdiChevronRight,
	mdiCalendar,
	mdiCheck,
	mdiCodeBraces,
	mdiCodeBrackets,
	mdiNumeric9PlusBoxMultiple,
	mdiHook,
	mdiMatrix,
} from "@mdi/js";
import SvgIcon from "../SvgIcon";
import { PathReference, PathInfo, Utils, ascii85, ID } from "ivipbase";

const palette = ["102,187,106", "38,166,154", "229,115,115", "66,165,245", "0, 161, 180", "255, 194, 0", "236,64,122", "126,87,194", "255, 122, 0"];

// const palette = ["209, 150, 22", "198, 120, 221", "97, 175, 239", "209, 154, 102", "224, 108, 117", "152, 195, 121", "86, 182, 194", "229, 192, 123", "158, 158, 158"];

const types = {
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

const isJson = (str) => {
	try {
		const d = JSON.parse(str);
		return ["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(d));
	} catch (e) {
		return false;
	}
};

const AutoWidthTextField = ({ value, defaultValue, minWidth = 30, maxWidth = 400, type, style, ...props }) => {
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

const momentFormat = "DD/MM/YYYY HH:mm:ss";

const TextMaskDate = React.forwardRef(function TextMaskCustom({ onChange, ...props }, ref) {
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

const resolveArrayPath = (path) => {
	return path
		.slice(1)
		.reduce((acc, iten) => {
			return `${acc}${typeof iten === "number" ? `[${iten}]` : `/${iten}`}`;
		}, "")
		.replace(/^\/+/gi, "");
};

const valueToString = (value) => {
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

const normalizeValue = (value, type, selfVerify = true) => {
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

const getValueType = (value) => {
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

const EditValueChild = ({
	isNewChild = false,
	disabled: _disabled = false,
	name,
	value,
	type,
	beforeValue,
	onChange,
	onRemoved,
	goToPath,
	isAdded = false,
	exists = false,
	index = 0,
	inTree = false,
}) => {
	const [_loading, setLoading] = useState(false);
	const [disabled, setDisabled] = useState(_disabled);
	const [edit, setEdit] = useState(isNewChild);
	const [currentKey, setCurrentKey] = useState(name);
	const [currentValue, setCurrentValue] = useState(valueToString(value));
	const [currentType, setCurrentType] = useState(type);
	const [textWarning, setTextWarning] = useState(null);

	const [newChildres, setNewChildres] = useState([]);

	const mainRef = useRef(null);
	const objectChildresRef = useRef({});

	useEffect(() => {
		setDisabled(_disabled);
	}, [_disabled]);

	const changeNewValue = () => {
		if (!isNewChild) {
			return;
		}
		try {
			if (typeof onChange === "function") {
				if (newChildres.length <= 0) {
					const { value, type } = normalizeValue(currentValue, currentType);
					onChange(currentKey, value, type);
				} else {
					const obj = {};
					for (let id in objectChildresRef.current) {
						const { key, value, type } = objectChildresRef.current[id];
						obj[String(key) === "" ? id : key] = normalizeValue(value, type).value;
					}
					onChange(currentKey, JSON.stringify(obj), "object");
				}
			}
		} catch (e) {
			setTextWarning(e.message);
		}
	};

	useEffect(changeNewValue, [isNewChild, currentKey, currentValue, currentType, newChildres, onChange]);

	const emitNotify = (event) => {
		if (!mainRef.current) {
			return;
		}

		setDisabled(true);

		const classes = {
			remove: style["removed"],
			add: style["added"],
			change: style["changed"],
		};

		mainRef.current?.classList?.add(classes[event]);

		setTimeout(
			() => {
				mainRef.current?.classList?.remove(classes[event]);
				setDisabled(false);
				if (typeof onRemoved === "function" && event === "remove") {
					onRemoved();
				}
			},
			event === "remove" ? 2000 : 3000,
		);
	};

	useLayoutEffect(() => {
		if (valueToString(beforeValue ?? value) !== valueToString(value)) {
			emitNotify("change");
		}
	}, [mainRef.current, beforeValue, value]);

	const confirmEdit = async () => {
		if (isNewChild) {
			return;
		}

		setEdit(false);
		setTextWarning(null);
		setLoading(true);

		await new Promise((resolve) => setTimeout(resolve, 1000));

		if (typeof onChange === "function") {
			try {
				const { value: newValue, type } = normalizeValue(currentValue, currentType);

				console.log(newValue, type);

				await Promise.race([onChange(currentKey, newValue, type)]).then(() => {
					setLoading(false);
					emitNotify("change");
					return Promise.resolve(newValue);
				});
			} catch (e) {
				setTextWarning(e.message);
				setEdit(true);
				setLoading(false);
			}
		} else {
			setEdit(true);
			setLoading(false);
		}
	};

	const cancelEdit = () => {
		if (isNewChild) {
			if (typeof onRemoved === "function") {
				onRemoved();
			}
			return;
		}
		setCurrentValue(value);
		setCurrentType(type);
		setEdit(false);
		setTextWarning(null);
	};

	const deleteValue = async () => {
		setLoading(true);
		setTextWarning(null);
		await new Promise((resolve) => setTimeout(resolve, 1000));

		try {
			await Promise.race([onChange(currentKey, null, "unknown")]).then((value) => {
				// setCurrentValue(value);
				setLoading(false);
				emitNotify("remove");
				return Promise.resolve();
			});
		} catch (e) {
			setTextWarning(e.message);
			setLoading(false);
		}
	};

	useEffect(() => {
		if (mainRef.current && isAdded) {
			emitNotify("add");
		}
	}, [mainRef.current, isAdded]);

	useEffect(() => {
		if (edit || _loading) {
			return;
		}

		if (valueToString(value) !== currentValue) {
			if (value === null) {
				emitNotify("remove");
			} else {
				setCurrentValue(valueToString(value));
				setCurrentType(type);
				emitNotify("change");
			}
		}
	}, [currentValue, value]);

	useEffect(() => {
		if (!mainRef.current) {
			return;
		}

		if (edit || _loading) {
			if (mainRef.current.classList.contains(style["active"]) === false) {
				mainRef.current.classList.add(style["active"]);
			}
		} else {
			if (mainRef.current.classList.contains(style["active"])) {
				mainRef.current.classList.remove(style["active"]);
			}
		}
	}, [edit, _loading]);

	const verifyType = (type) => {
		try {
			const { value } = normalizeValue(currentValue, type ?? currentType, false);
			setCurrentValue(value);
		} catch {
			switch (type ?? currentType) {
				case "date":
					setCurrentValue(moment().format(momentFormat));
					break;
				case "boolean":
					setCurrentValue("true");
					break;
				case "number":
				case "bigint":
					setCurrentValue("0");
					break;
				case "object":
					setCurrentValue("{}");
					break;
				case "array":
					setCurrentValue("[]");
					break;
				default:
					setCurrentValue("");
			}
		}
	};

	const editabled = !["binary", "bigint", "reference"].includes(currentType);

	const colorMark = palette[index % palette.length];

	const loading = _loading || disabled;

	return (
		<div
			className={style["key-value"]}
			style={{ "--color-mark": colorMark }}
			ref={mainRef}
		>
			<div className={style["header"]}>
				<div className={style["content"]}>
					<div className={[style["key"], isNewChild ? style["new"] : ""].join(" ")}>
						{!isNewChild && (
							<Link
								underline="hover"
								color="inherit"
								onClick={() => {
									if (typeof goToPath === "function") {
										goToPath();
									}
								}}
							>
								<Typography variant="subtitle1">{typeof currentKey === "number" ? currentKey : `"${currentKey}"`}:</Typography>
							</Link>
						)}
						{isNewChild && (
							<>
								<AutoWidthTextField
									minWidth={50}
									maxWidth={800}
									value={currentKey === "string" && !edit ? (typeof currentKey === "number" ? currentKey : `"${currentKey}"`) : currentKey}
									variant="outlined"
									size="small"
									placeholder="Chave"
									type={"text"}
									autoComplete="off"
									InputProps={{
										readOnly: !edit,
										autoComplete: "off",
									}}
									onChange={(e) => {
										setCurrentKey(e.target.value);
									}}
									onKeyPress={(e) => {
										if (!edit || e.key !== "Enter") {
											return;
										}

										confirmEdit();
									}}
									onClick={() => {
										if (!editabled || edit || loading) {
											return;
										}
										setEdit(true);
									}}
								/>
								<Typography
									variant="subtitle1"
									sx={{
										marginLeft: "10px",
									}}
								>
									:
								</Typography>
							</>
						)}
					</div>
					{newChildres.length <= 0 && (
						<>
							<div
								className={style["value"]}
								onMouseDown={() => {
									if (!editabled || edit || loading) {
										return;
									}
									setEdit(true);
								}}
							>
								{currentType === "boolean" ? (
									<TextField
										select
										value={["true", "false"].includes(currentValue) ? currentValue : "true"}
										variant="outlined"
										size="small"
										placeholder="Valor"
										onChange={(e) => {
											setCurrentValue(e.target.value);
										}}
									>
										<MenuItem value={"true"}>True</MenuItem>
										<MenuItem value={"false"}>False</MenuItem>
									</TextField>
								) : currentType === "date" ? (
									<AutoWidthTextField
										minWidth={50}
										maxWidth={800}
										value={currentValue}
										onChange={(e) => {
											if (e.target.value !== currentValue) setCurrentValue(e.target.value);
										}}
										variant="outlined"
										size="small"
										placeholder="Valor"
										autoComplete="off"
										InputProps={{
											readOnly: !edit,
											inputComponent: TextMaskDate,
											autoComplete: "off",
										}}
										onKeyPress={(e) => {
											if (!edit || e.key !== "Enter") {
												return;
											}

											confirmEdit();
										}}
									/>
								) : (
									<AutoWidthTextField
										minWidth={50}
										maxWidth={800}
										value={currentType === "string" && !edit ? `"${currentValue}"` : currentValue}
										variant="outlined"
										size="small"
										placeholder="Valor"
										type={["number", "binary", "bigint"].includes(currentType) ? "number" : "text"}
										autoComplete="off"
										InputProps={{
											readOnly: !edit,
											autoComplete: "off",
										}}
										onChange={(e) => {
											setCurrentValue(e.target.value);
										}}
										onKeyPress={(e) => {
											if (!edit || e.key !== "Enter") {
												return;
											}

											confirmEdit();
										}}
									/>
								)}
							</div>
							<div
								className={style["type"]}
								onClick={() => {
									if (!editabled || edit || loading) {
										return;
									}
									setEdit(true);
								}}
								style={{
									paddingRight: edit ? "0px" : "10px",
								}}
							>
								<TextField
									select
									value={currentType}
									variant="outlined"
									size="small"
									InputProps={{
										readOnly: !edit,
									}}
									onChange={(e) => {
										verifyType(e.target.value);
										setCurrentType(e.target.value);
									}}
								>
									{Object.keys(types).map((type, i) => {
										const label = type === "unknown" ? "auto" : type;

										return (
											<MenuItem
												key={i}
												value={type}
												disabled={["binary", "reference"].includes(type)}
											>
												<SvgIcon path={types[type]} />
												<Typography
													variant="body2"
													sx={{
														marginLeft: "14px",
														opacity: 0.6,
														fontStyle: "italic",
														textTransform: "capitalize",
													}}
												>
													{label}
												</Typography>
											</MenuItem>
										);
									})}
								</TextField>
							</div>
						</>
					)}
				</div>
				{!loading && (
					<div className={style["actions"]}>
						{!exists && (
							<IconButton
								onClick={() => {
									setNewChildres((prev) => {
										return [
											...prev,
											{
												id: ID.generate(),
												key: "",
												value: "",
												type: "unknown",
											},
										];
									});
								}}
							>
								<SvgIcon path={mdiPlus} />
							</IconButton>
						)}
						{edit && exists && (
							<IconButton onClick={confirmEdit}>
								<SvgIcon path={mdiCheck} />
							</IconButton>
						)}
						{edit && (
							<IconButton onClick={cancelEdit}>
								<SvgIcon path={mdiClose} />
							</IconButton>
						)}
						{!edit && exists && (
							<IconButton onClick={deleteValue}>
								<SvgIcon path={mdiDelete} />
							</IconButton>
						)}
					</div>
				)}
				{loading && !disabled && (
					<CircularProgress
						color="inherit"
						size="24px"
						sx={{
							marginLeft: "10px",
						}}
					/>
				)}
			</div>
			{edit && textWarning && (
				<div className={style["warning"]}>
					<Typography
						variant="caption"
						component="span"
					>
						Warning: {textWarning}
					</Typography>
				</div>
			)}
			{newChildres.length > 0 && (
				<>
					<div className={style["tree"]}>
						{newChildres.map(({ id, key, velue, type }) => {
							return (
								<div key={id}>
									<div className={style["mark"]}></div>
									<div className={style["content"]}>
										<EditValueChild
											isNewChild={true}
											name={key}
											value={velue}
											type={type}
											exists={false}
											onChange={(key, value, type) => {
												key = String(key).trim() !== "" ? key : id;
												objectChildresRef.current[id] = { key, value, type };
												changeNewValue();
											}}
											onRemoved={() => {
												setNewChildres((prev) => {
													return prev.filter((iten) => iten.id !== id);
												});
											}}
											index={index + 1}
											disabled={disabled}
										/>
									</div>
								</div>
							);
						})}
					</div>
					{!inTree && (
						<div
							style={{
								height: "25px",
							}}
						></div>
					)}
				</>
			)}
		</div>
	);
};

const ViewTree = ({ currentPath, onChange, onNewChildres, onRemoved, checkRemoved, loadData, isExpanded = false, index = 0, goToPath, prevData }) => {
	const [actualPath, setActualPath] = useState(currentPath);
	const [loading, setLoading] = useState(true);
	const [forceLoading, setForceLoading] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [data, setData] = useState(prevData ?? null);
	const [expandChildren, setExpandChildren] = useState([]);
	const [hiddenActionExpandChildren, setHiddenActionExpandChildren] = useState([]);
	const [removeChildren, setRemoveChildren] = useState([]);
	const [removed, setRemoved] = useState(typeof checkRemoved === "function" ? checkRemoved(resolveArrayPath(currentPath.concat([key]))) : false);
	const [orderFirstChildren, setOrderFirstChildren] = useState([]);

	const [newChildres, setNewChildres] = useState([]);

	const mainRef = useRef(null);
	const objectChildresRef = useRef({});
	const beforeValues = useRef({});

	const emitNotify = (event) => {
		if (!mainRef.current) {
			return;
		}

		const classes = {
			remove: style["removed"],
			add: style["added"],
			change: style["changed"],
		};

		mainRef.current?.classList?.add(classes[event]);

		setTimeout(
			() => {
				mainRef.current?.classList?.remove(classes[event]);
				if (typeof onRemoved === "function" && event === "remove") {
					onRemoved(resolveArrayPath(actualPath));
				}
			},
			event === "remove" ? 2000 : 3000,
		);
	};

	const deleteValue = async () => {
		setForceLoading(true);
		await new Promise((resolve) => setTimeout(resolve, 1000));
		emitNotify("remove");
		setForceLoading(false);
		try {
			await Promise.race([onChange(resolveArrayPath(actualPath), null, "unknown")]).then((value) => {
				setForceLoading(false);
				emitNotify("remove");
				return Promise.resolve();
			});
		} catch (e) {
			console.error(e);
			setForceLoading(false);
		}
	};

	const getData = (isNextMore = false) => {
		if (typeof loadData !== "function") {
			setLoadingMore(false);
			setLoading(false);
			return;
		}

		if (isNextMore) {
			setLoadingMore(true);
		} else {
			setLoading(true);
		}

		loadData(resolveArrayPath(actualPath), isNextMore)
			.then((dataJson) => {
				if (!isNextMore) {
					setData(dataJson);
				} else {
					setData((prev) => {
						return !prev
							? dataJson
							: {
									...(prev ?? dataJson ?? {}),
									children: {
										...(dataJson.children ?? prev.children ?? {}),
										list: [...(prev.children?.list ?? []), ...(dataJson.children?.list ?? [])].filter((data, i, self) => {
											return self.findIndex(({ key }) => key === data.key) === i;
										}),
									},
							  };
					});
				}
			})
			.finally(() => {
				if (isNextMore) {
					setLoadingMore(false);
				} else {
					setLoading(false);
				}
			});
	};

	useEffect(() => {
		if (resolveArrayPath(currentPath) === resolveArrayPath(actualPath)) {
			return;
		}
		setActualPath(currentPath);
		setLoading(true);
		setLoadingMore(false);
		setData(null);
		setExpandChildren([]);
		setHiddenActionExpandChildren([]);
	}, [currentPath]);

	useEffect(() => {
		if (!isExpanded) {
			setExpandChildren([]);
			setHiddenActionExpandChildren([]);
			//setLoading(false);
		}
	}, [isExpanded]);

	useEffect(() => {
		if (!isExpanded) {
			return;
		}

		const time = setTimeout(() => {
			getData();
		}, 500);

		return () => {
			clearTimeout(time);
		};
	}, [loadData, actualPath, isExpanded]);

	const applyNewChildres = () => {
		if (newChildres.length <= 0) {
			return;
		}

		setForceLoading(true);

		const obj = {};

		for (let id in objectChildresRef.current) {
			const { key, value, type } = objectChildresRef.current[id];
			obj[String(key) === "" ? id : key] = normalizeValue(value, type).value;
		}

		onNewChildres(resolveArrayPath(actualPath), obj, "object")
			.then(() => {
				setNewChildres([]);
				objectChildresRef.current = {};

				setOrderFirstChildren((prev) => {
					return Object.keys(obj)
						.concat(prev)
						.filter((key, i, l) => l.findIndex((it) => it === key) === i);
				});

				for (let key in obj) {
					beforeValues.current[key] = "";
				}

				setData((data) => {
					if (!Array.isArray(data?.children?.list)) {
						return data;
					}

					for (let key in obj) {
						const type = getValueType(obj[key]);
						data.children.list.push({ key, value: obj[key], type });
					}

					data.children.list = data.children.list.filter(({ key }, i, l) => {
						return l.findIndex((it) => it.key === key) === i;
					});

					return { ...data };
				});

				// setTimeout(() => {
				// 	getData();
				// }, 2000);
			})
			.finally(() => {
				setForceLoading(false);
			});
	};

	const onChildreChange = async (key, value, type) => {
		console.log("onChildreChange", key, value, type);
		await onChange(resolveArrayPath(actualPath.concat([key])), value, type);
		setData((data) => {
			if (!Array.isArray(data?.children?.list)) {
				return data;
			}

			const _type = getValueType(value);

			data.children.list.push({ key: key, value: ["object", "array", "dedicated_record", "binary"].includes(_type) ? undefined : value, type: _type });

			data.children.list = data.children.list.filter(({ key }, i, l) => {
				return l.findIndex((it) => it.key === key) === i;
			});

			return { ...data };
		});
	};

	const { type, value, children, exists = false } = data ?? {};
	const key = data?.key ?? actualPath[actualPath.length - 1];

	const colorMark = palette[index % palette.length];

	const isRoot = resolveArrayPath(actualPath) === "";

	return removed ? null : !value || (Array.isArray(children?.list) && ["object", "array"].includes(type)) ? (
		<div
			className={style["key-tree"]}
			style={{ "--color-mark": colorMark }}
			ref={mainRef}
		>
			<div className={style["header"]}>
				<div className={style["content"]}>
					<div className={style["key"]}>
						<Link
							underline="hover"
							color="inherit"
							onClick={() => {
								if (typeof goToPath === "function") {
									goToPath(actualPath);
								}
							}}
						>
							<Typography variant="subtitle1">{typeof key === "number" ? key : `"${key}"`}</Typography>
						</Link>
					</div>
				</div>
				{!((isExpanded && loading) || forceLoading) && (
					<div className={style["actions"]}>
						<IconButton
							onClick={() => {
								setNewChildres((prev) => {
									return [
										...prev,
										{
											id: ID.generate(),
											key: "",
											value: "",
											type: "unknown",
										},
									];
								});
							}}
						>
							<SvgIcon path={mdiPlus} />
						</IconButton>
						{exists && !isRoot && (
							<IconButton onClick={deleteValue}>
								<SvgIcon path={mdiDelete} />
							</IconButton>
						)}
					</div>
				)}
				{((isExpanded && loading) || forceLoading) && (
					<CircularProgress
						color="inherit"
						size="24px"
						sx={{
							marginLeft: "10px",
						}}
					/>
				)}
			</div>
			{newChildres.length > 0 && (
				<div className={style["tree"]}>
					{newChildres.map(({ id, key, velue, type }, i, list) => {
						return (
							<div key={id}>
								<div className={style["mark"]}></div>
								<div className={style["content"]}>
									<EditValueChild
										isNewChild={true}
										name={key}
										value={velue}
										type={type}
										exists={false}
										onChange={(key, value, type) => {
											key = String(key).trim() !== "" ? key : id;
											objectChildresRef.current[id] = { key, value, type };
										}}
										onRemoved={() => {
											setNewChildres((prev) => {
												return prev.filter((iten) => iten.id !== id);
											});
										}}
										index={index + 1}
										disabled={forceLoading}
										inTree={i >= list.length - 1}
									/>
								</div>
							</div>
						);
					})}
					<div>
						<div
							className={style["mark"]}
							style={{ opacity: 0 }}
						></div>
						<div className={style["content"]}>
							<div
								style={{
									display: "flex",
									flexDirection: "row",
									alignItems: "center",
									gap: "10px",
									margin: "5px 0px 10px 0px",
								}}
							>
								<Button
									size="small"
									onClick={() => {
										setNewChildres([]);
										objectChildresRef.current = {};
									}}
								>
									Cancelar
								</Button>
								<Button
									size="small"
									variant="outlined"
									onClick={applyNewChildres}
								>
									Adicionar
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
			{isExpanded && (
				<div className={style["tree"]}>
					{(children?.list ?? [])
						.filter(
							({ value, key }) =>
								value !== null && !removeChildren.includes(value) && (typeof checkRemoved === "function" ? !checkRemoved(resolveArrayPath(actualPath.concat([key]))) : true),
						)
						.sort((a, b) => {
							const indexA = orderFirstChildren.indexOf(a.key);
							const indexB = orderFirstChildren.indexOf(b.key);
							return indexA >= 0 && indexB < 0 ? -1 : indexA < 0 && indexB >= 0 ? 1 : indexA - indexB;
						})
						.map(({ key, value, type }, i) => {
							const path = actualPath.concat([key]);
							return (
								<div key={key}>
									<div className={style["mark"]}>
										{(["object", "array"].includes(type) || value === undefined) && !hiddenActionExpandChildren.includes(key) && (
											<div
												className={style["action"]}
												onClick={() => {
													setExpandChildren((prev) => {
														if (prev.includes(key)) {
															return prev.filter((iten) => iten !== key);
														} else {
															return [...prev, key];
														}
													});
													if (["object", "array"].includes(type) !== true) {
														setHiddenActionExpandChildren((prev) => {
															return [...prev, key];
														});
													}
												}}
											>
												<SvgIcon path={expandChildren.includes(key) ? mdiArrowDownDropCircle : mdiArrowRightDropCircle} />
											</div>
										)}
									</div>
									<div className={style["content"]}>
										{["object", "array"].includes(type) || value === undefined ? (
											<ViewTree
												currentPath={path}
												onChange={onChange}
												onRemoved={onRemoved}
												checkRemoved={checkRemoved}
												loadData={loadData}
												isExpanded={expandChildren.includes(key)}
												index={index + 1}
												goToPath={goToPath}
												onNewChildres={onNewChildres}
												prevData={{
													type,
													value,
													children: {},
													exists: true,
												}}
											/>
										) : (
											<EditValueChild
												name={key}
												value={valueToString(value)}
												beforeValue={valueToString(beforeValues.current[key] ?? value)}
												type={type}
												onChange={onChildreChange}
												onRemoved={() => {
													setRemoveChildren((prev) => {
														return [...prev, key];
													});
													onRemoved?.(resolveArrayPath(path));
												}}
												goToPath={() => goToPath(path)}
												exists={type !== "unknown"}
												index={index + 1}
											/>
										)}
									</div>
								</div>
							);
						})}

					{(children?.list ?? []).length <= 0 && !loading && (
						<div>
							<div className={style["mark"]}></div>
							<div className={style["content"]}>
								<div className={style["label"]}>
									<Typography variant="body2">Empty</Typography>
								</div>
							</div>
						</div>
					)}

					{children?.more && !loadingMore && (
						<div>
							<div className={style["mark"]}>
								{["object", "array"].includes(type) && (
									<div
										className={style["action"]}
										onClick={() => {
											getData(true);
										}}
									>
										<SvgIcon path={mdiChevronDown} />
									</div>
								)}
							</div>
							<div className={style["content"]}>
								<div className={style["label"]}>
									<Link
										underline="hover"
										color="inherit"
										onClick={() => {
											getData(true);
										}}
										style={{
											cursor: "pointer",
										}}
									>
										<Typography variant="body2">more...</Typography>
									</Link>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
			{isExpanded && !loading && (
				<div
					style={{
						height: "25px",
					}}
				></div>
			)}
		</div>
	) : (
		<EditValueChild
			name={key}
			value={valueToString(value)}
			type={type}
			onChange={(key, newValue, typeValue) => onChange(resolveArrayPath(actualPath), newValue, typeValue)}
			onRemoved={() => {
				setRemoved(true);
				onRemoved?.(resolveArrayPath(actualPath));
			}}
			goToPath={() => goToPath(actualPath)}
			exists={exists}
			index={index + 1}
		/>
	);
};

export const JsonEditor = forwardRef(({ rootDir = "root", path = [] }, ref) => {
	const [currentPath, setCurrentPath] = useState([rootDir ?? "root", ...(path ?? [])]);

	const [callbackLoadData, setCallbackLoadData] = useState(null);
	const [callbackChangeData, setCallbackChangeData] = useState(null);
	const [callbackNewChildres, setCallbackNewChildres] = useState(null);
	const [mutated, setMutated] = useState({});

	const [editPath, setEditPath] = useState(false);

	const [removedPaths, setRemovedPaths] = useState([]);

	const cache = useRef(new Map());

	const goToPath = (path) => {
		if (resolveArrayPath(path) === resolveArrayPath(currentPath)) {
			return;
		}
		cache.current.clear();
		setRemovedPaths([]);
		setCurrentPath(path);
	};

	useImperativeHandle(
		ref,
		() => ({
			loadData: (callback) => {
				setCallbackLoadData(() => (typeof callback === "function" ? callback : null));
			},
			onChange: (callback) => {
				setCallbackChangeData(() => (typeof callback === "function" ? callback : null));
			},
			onNewChildres: (callback) => {
				setCallbackNewChildres(() => (typeof callback === "function" ? callback : null));
			},
			mutated: (data) => {
				setMutated(data);
			},
		}),
		[],
	);

	const loadData = (path, isNextMore = false, forceUpdate = false) => {
		if (typeof path !== "string") {
			return Promise.resolve(null);
		}

		if (!isNextMore && cache.current.has(path) && !forceUpdate) {
			return Promise.resolve(cache.current.get(path));
		}

		return new Promise((resolve) => {
			if (typeof callbackLoadData === "function") {
				const prev = cache.current.get(path);
				const context = prev?.context ?? {};
				context.isNext = isNextMore;

				Promise.race([callbackLoadData(path, context)]).then((data) => {
					const prev = cache.current.get(path);

					if (!isNextMore || !prev) {
						cache.current.set(path, data);
					} else {
						const list = [...(prev.children?.list ?? []), ...(data.children?.list ?? [])].filter((data, i, self) => {
							return self.findIndex(({ key }) => key === data.key) === i;
						});

						cache.current.set(path, {
							...(data ?? prev ?? {}),
							context: data.context,
							children: {
								...(data.children ?? {}),
								list: list,
							},
						});
					}

					resolve(data);
				});
			} else {
				resolve(null);
			}
		});
	};

	const onChange = (path, value, type) => {
		return new Promise((resolve, reject) => {
			try {
				if (typeof callbackChangeData !== "function") {
					return reject(new Error("Not implemented"));
				}

				Promise.race([callbackChangeData(path, value, type)])
					.then(async (data) => {
						const parent = PathInfo.get(path).parentPath;
						if (cache.current.has(parent)) await loadData(parent, false, true);
						if (cache.current.has(path)) {
							if (value !== null || value !== undefined) {
								await loadData(path, false, true);
							} else {
								cache.current.delete(path);
							}
						}
						resolve(data);
					})
					.catch(reject);
			} catch (e) {
				reject(e);
			}
		});
	};

	const onNewChildres = (path, value, type) => {
		return new Promise((resolve, reject) => {
			try {
				if (typeof callbackNewChildres !== "function") {
					return reject(new Error("Not implemented"));
				}

				Promise.race([callbackNewChildres(path, value, type)])
					.then(async (data) => {
						if (cache.current.has(path)) {
							const tree = cache.current.get(path);
							if (tree.children?.list) {
								for (let key in data) {
									const value = data[key];
									const type = getValueType(value);
									tree.children.list.push({ key: key, value: ["object", "array", "dedicated_record", "binary"].includes(type) ? undefined : value, type });
								}
							}
							cache.current.set(path, tree);
						}
						resolve(data);
					})
					.catch(reject);
			} catch (e) {
				reject(e);
			}
		});
	};

	return (
		<div className={style["main"]}>
			<div
				className={style["header"]}
				onClick={(event) => {
					event.preventDefault();
				}}
			>
				<SvgIcon path={mdiLink} />
				<Breadcrumbs
					className={editPath ? style["edit"] : undefined}
					separator={
						<SvgIcon
							path={mdiChevronRight}
							style={{
								opacity: 0.7,
							}}
						/>
					}
				>
					{(editPath ? currentPath.slice(0, 1) : currentPath).map((iten, i, self) => {
						const isLink = i < self.length - 1;
						return isLink ? (
							<Link
								underline="hover"
								color="inherit"
								onClick={() => {
									goToPath(self.slice(0, i + 1));
								}}
								sx={{
									cursor: "pointer",
									opacity: 0.7,
								}}
							>
								{typeof iten === "number" ? `[${iten}]` : iten}
							</Link>
						) : (
							<Typography color="text.primary">{typeof iten === "number" ? `[${iten}]` : iten}</Typography>
						);
					})}
					{editPath && (
						<TextField
							defaultValue={resolveArrayPath(currentPath)}
							type={"text"}
							size="small"
							autoComplete="off"
							fullWidth
							onKeyPress={(e) => {
								if (e.key !== "Enter") {
									return;
								}

								const path = currentPath.slice(0, 1).concat(
									e.target.value
										.replace(/\\/gi, "/")
										.replace(/(\[\d+\])/gi, "/$1")
										.split("/")
										.map((item) => (/(\[\d+\])/gi.test(item) ? parseInt(item.replace(/\[|\]/gi, "")) : item)),
								);

								if (resolveArrayPath(currentPath) !== resolveArrayPath(path)) {
									goToPath(path);
								}
								setEditPath(!editPath);
							}}
						/>
					)}
				</Breadcrumbs>
				<div
					className={style["actions"]}
					style={{
						visibility: editPath ? "visible" : undefined,
					}}
				>
					{!editPath && (
						<IconButton
							size="small"
							onClick={() => {
								setEditPath(!editPath);
							}}
						>
							<SvgIcon path={mdiPencil} />
						</IconButton>
					)}
					{editPath && (
						<IconButton
							size="small"
							onClick={() => {
								setEditPath(!editPath);
							}}
						>
							<SvgIcon path={mdiClose} />
						</IconButton>
					)}
				</div>
			</div>
			<div className={style["content"]}>
				<ViewTree
					currentPath={currentPath}
					loadData={loadData}
					onChange={onChange}
					onNewChildres={onNewChildres}
					onRemoved={(path) => {
						setRemovedPaths((prev) => {
							return [...prev, path];
						});
					}}
					checkRemoved={(path) => {
						return removedPaths.includes(path);
					}}
					isExpanded={true}
					goToPath={(path) => {
						goToPath(path);
					}}
				/>
			</div>
		</div>
	);
});

export default JsonEditor;
