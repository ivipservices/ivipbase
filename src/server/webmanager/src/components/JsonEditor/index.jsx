import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import style from "./style.module.scss";
import { Box, Typography, Breadcrumbs, Link, TextField, IconButton, MenuItem, CircularProgress } from "@mui/material";
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
import { PathReference, PathInfo, Utils, ascii85 } from "ivipbase";

const palette = ["102,187,106", "38,166,154", "229,115,115", "66,165,245", "0, 161, 180", "255, 194, 0", "236,64,122", "126,87,194", "255, 122, 0"];

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
	dedicated_record: mdiCodeJson,
	binary: mdiMatrix,
};

const isJson = (str) => {
	try {
		JSON.parse(str);
	} catch (e) {
		return false;
	}
	return true;
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
					width: Math.max(minWidth, Math.min(inputWidth, maxWidth)),
				}}
				inputRef={inputRef}
			/>
			<span
				ref={spanRef}
				style={{
					position: "absolute",
					top: "0px",
					left: "0px",
					visibility: "hidden",
					overflow: "hidden",
					maxWidth: `${maxWidth}px`,
					minWidth: `${minWidth}px`,
				}}
			>
				{value ?? defaultValue}
			</span>
		</Box>
	);
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

	if (["string", "number", "boolean"].includes(typeof value)) {
		return value;
	}

	if (value instanceof Date) {
		return value.toISOString();
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
			value = value.replace(/^"(.*)"$/gi, "$1");
			break;
		case "number":
			value = parseFloat(value);
			break;
		case "bigint":
			value = BigInt(value);
			break;
		case "boolean":
			value = value === "false" ? false : true;
			break;
		case "binary":
			value = ascii85.decode(value);
			break;
		case "date":
			value = new Date(value);
			break;
		case "reference":
			value = new PathReference();
			break;
		case "object":
		case "array":
			value = JSON.parse(value);
			break;
		default: {
			if (["true", "false"].includes(value)) {
				type = "boolean";
			} else if (!isNaN(value)) {
				type = "number";
			} else if (!isNaN(BigInt(value))) {
				type = "bigint";
			} else if (Utils.isDate(value)) {
				type = "date";
			} else if (isJson(value)) {
				type = Array.isArray(JSON.parse(value)) ? "array" : "object";
			} else {
				type = "string";
			}

			if (selfVerify) {
				return normalizeValue(value, type, false);
			}
		}
	}

	return { value, type };
};

const EditValueChild = ({ name, value = "", type, onChange, onRemoved, goToPath, isAdded = false }) => {
	const [loading, setLoading] = useState(false);
	const [edit, setEdit] = useState(false);
	const [currentValue, setCurrentValue] = useState(value ?? "");
	const [currentType, setCurrentType] = useState(type);

	const mainRef = useRef(null);

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
					onRemoved();
				}
			},
			event === "remove" ? 2000 : 3000,
		);
	};

	const confirmEdit = async () => {
		setEdit(false);
		if (currentValue === (value ?? "")) {
			return;
		}
		setLoading(true);

		await new Promise((resolve) => setTimeout(resolve, 1000));

		if (typeof onChange === "function") {
			try {
				const { value, type } = normalizeValue(currentValue, currentType);

				await Promise.race([onChange(value, type)]).then(() => {
					setCurrentValue(value);
					setCurrentType(type);
					setLoading(false);
					emitNotify("change");
					return Promise.resolve(value);
				});
			} catch (e) {
				console.error(e);
				setEdit(true);
				setLoading(false);
			}
		} else {
			setEdit(true);
			setLoading(false);
		}
	};

	const cancelEdit = () => {
		setCurrentValue(value ?? "");
		setCurrentType(type);
		setEdit(false);
	};

	const deleteValue = async () => {
		setLoading(true);
		await new Promise((resolve) => setTimeout(resolve, 1000));

		try {
			await Promise.race([onChange(null, "unknown")]).then((value) => {
				// setCurrentValue(value);
				setLoading(false);
				emitNotify("remove");
				return Promise.resolve();
			});
		} catch (e) {
			console.error(e);
			setLoading(false);
		}
	};

	useEffect(() => {
		if (mainRef.current && isAdded) {
			emitNotify("add");
		}
	}, [mainRef.current, isAdded]);

	useEffect(() => {
		if (edit || loading) {
			return;
		}

		if ((value ?? "") !== currentValue) {
			setCurrentValue(value ?? "");
			setCurrentType(type);
			emitNotify(value === null ? "remove" : "change");
		}
	}, [value]);

	useEffect(() => {
		if (!mainRef.current) {
			return;
		}

		if (edit || loading) {
			if (mainRef.current.classList.contains(style["active"]) === false) {
				mainRef.current.classList.add(style["active"]);
			}
		} else {
			if (mainRef.current.classList.contains(style["active"])) {
				mainRef.current.classList.remove(style["active"]);
			}
		}
	}, [edit, loading]);

	const editabled = !["dedicated_record", "binary", "bigint", "reference"].includes(currentType);

	return (
		<div
			className={style["key-value"]}
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
									goToPath();
								}
							}}
						>
							<Typography variant="subtitle1">{typeof name === "number" ? name : `"${name}"`}:</Typography>
						</Link>
					</div>
					<div
						className={style["value"]}
						onClick={() => {
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
								InputProps={{
									readOnly: !edit,
								}}
								onChange={(e) => {
									setCurrentValue(e.target.value);
								}}
							>
								<MenuItem value={"true"}>True</MenuItem>
								<MenuItem value={"false"}>False</MenuItem>
							</TextField>
						) : (
							<AutoWidthTextField
								maxWidth={800}
								value={currentType === "string" && !edit ? `"${currentValue}"` : currentValue}
								variant="outlined"
								size="small"
								type={["number", "binary", "bigint"].includes(currentType) ? "number" : "text"}
								InputProps={{
									readOnly: !edit,
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
					<div className={style["type"]}>
						<TextField
							select
							value={currentType}
							variant="outlined"
							size="small"
							InputProps={{
								readOnly: !edit,
							}}
							onChange={(e) => {
								setCurrentType(e.target.value);
							}}
						>
							{Object.keys(types).map((type, i) => {
								return (
									<MenuItem
										key={i}
										value={type}
										disabled={["unknown", "dedicated_record", "binary", "bigint", "reference"].includes(type)}
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
											{type}
										</Typography>
									</MenuItem>
								);
							})}
						</TextField>
					</div>
				</div>
				{!loading && (
					<div className={style["actions"]}>
						{edit && (
							<IconButton onClick={confirmEdit}>
								<SvgIcon path={mdiCheck} />
							</IconButton>
						)}
						{edit && (
							<IconButton onClick={cancelEdit}>
								<SvgIcon path={mdiClose} />
							</IconButton>
						)}
						{!edit && (
							<IconButton onClick={deleteValue}>
								<SvgIcon path={mdiDelete} />
							</IconButton>
						)}
					</div>
				)}
				{loading && (
					<CircularProgress
						color="inherit"
						size="24px"
						sx={{
							marginLeft: "10px",
						}}
					/>
				)}
			</div>
		</div>
	);
};

const ViewTree = ({ currentPath, onChange, onRemoved, checkRemoved, loadData, isExpanded = false, index = 0, goToPath }) => {
	const [actualPath, setActualPath] = useState(currentPath);
	const [loading, setLoading] = useState(true);
	const [forceLoading, setForceLoading] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [data, setData] = useState(null);
	const [expandChildren, setExpandChildren] = useState([]);
	const [hiddenActionExpandChildren, setHiddenActionExpandChildren] = useState([]);
	const [removeChildren, setRemoveChildren] = useState([]);
	const [removed, setRemoved] = useState(typeof checkRemoved === "function" ? checkRemoved(resolveArrayPath(currentPath.concat([key]))) : false);

	const mainRef = useRef(null);

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
					onRemoved(resolveArrayPath(currentPath));
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
			await Promise.race([onChange(resolveArrayPath(currentPath), null, "unknown")]).then((value) => {
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

		loadData(resolveArrayPath(currentPath), isNextMore)
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
	}, [loadData, currentPath, isExpanded]);

	const { type, value, children } = data ?? {};
	const key = data?.key ?? currentPath[currentPath.length - 1];

	const colorMark = palette[index % palette.length];

	return removed ? null : !data || (Array.isArray(children?.list) && ["object", "array"].includes(type)) ? (
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
									goToPath(currentPath);
								}
							}}
						>
							<Typography variant="subtitle1">{typeof key === "number" ? key : `"${key}"`}</Typography>
						</Link>
					</div>
				</div>
				{!((isExpanded && loading) || forceLoading) && (
					<div className={style["actions"]}>
						<IconButton>
							<SvgIcon path={mdiPlus} />
						</IconButton>
						<IconButton onClick={deleteValue}>
							<SvgIcon path={mdiDelete} />
						</IconButton>
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
			{isExpanded && (
				<div className={style["tree"]}>
					{(children?.list ?? [])
						.filter(
							({ value, key }) =>
								value !== null && !removeChildren.includes(value) && (typeof checkRemoved === "function" ? !checkRemoved(resolveArrayPath(currentPath.concat([key]))) : true),
						)
						.map(({ key, value, type }, i) => {
							const path = currentPath.concat([key]);
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
											/>
										) : (
											<EditValueChild
												name={key}
												value={valueToString(value)}
												type={type}
												onChange={(newValue, typeValue) => onChange(resolveArrayPath(path), newValue, typeValue)}
												onRemoved={() => {
													setRemoveChildren((prev) => {
														return [...prev, key];
													});
													onRemoved?.(resolveArrayPath(path));
												}}
												goToPath={() => goToPath(path)}
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
			onChange={(newValue, typeValue) => onChange(resolveArrayPath(currentPath), newValue, typeValue)}
			onRemoved={() => {
				setRemoved(true);
				onRemoved?.(resolveArrayPath(currentPath));
			}}
			goToPath={() => goToPath(currentPath)}
		/>
	);
};

export const JsonEditor = forwardRef(({ rootDir = "root", path = [] }, ref) => {
	const [currentPath, setCurrentPath] = useState([rootDir ?? "root", ...(path ?? [])]);

	const [callbackLoadData, setCallbackLoadData] = useState(null);
	const [callbackChangeData, setCallbackChangeData] = useState(null);
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
