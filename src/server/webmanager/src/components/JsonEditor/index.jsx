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
} from "@mdi/js";
import SvgIcon from "../SvgIcon";

const palette = ["102,187,106", "38,166,154", "229,115,115", "66,165,245", "0, 161, 180", "255, 194, 0", "236,64,122", "126,87,194", "255, 122, 0"];

const types = {
	string: mdiAlphabetical,
	boolean: mdiToggleSwitch,
	number: mdiNumeric,
	binary: mdiNumeric,
	unknown: mdiAsterisk,
	object: mdiCodeJson,
	array: mdiCodeJson,
	date: mdiCalendar,
	reference: mdiAlphabetical,
	bigint: mdiNumeric,
	dedicated_record: mdiCodeJson,
};

const AutoWidthTextField = ({ value, defaultValue, maxWidth, type, style, ...props }) => {
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
	}, [value, defaultValue, maxWidth]);

	return (
		<Box position="relative">
			<TextField
				{...props}
				defaultValue={defaultValue}
				value={value}
				type={type}
				style={{
					...(style ?? {}),
					width: Math.min(inputWidth, maxWidth),
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

const EditValueChild = ({ name, value, type, onChange, goToPath, isAdded = false }) => {
	const [loading, setLoading] = useState(false);
	const [edit, setEdit] = useState(false);
	const [currentValue, setCurrentValue] = useState(value);

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

		mainRef.current.classList.add(classes[event]);

		setTimeout(() => {
			mainRef.current.classList.remove(classes[event]);
		}, 3000);
	};

	const confirmEdit = () => {
		setEdit(false);
		if (currentValue === value) {
			return;
		}
		setLoading(true);
		if (typeof onChange === "function") {
			Promise.race([onChange(currentValue)]).then((value) => {
				// setCurrentValue(value);
				setLoading(false);
				emitNotify("change");
			});
		}
	};

	const cancelEdit = () => {
		setCurrentValue(value);
		setEdit(false);
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

		if (value !== currentValue) {
			emitNotify(value === null ? "remove" : "change");
		}
	}, [value, currentValue, edit, loading]);

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
									goToPath(currentPath);
								}
							}}
						>
							<Typography variant="subtitle1">{typeof name === "number" ? name : `"${name}"`}:</Typography>
						</Link>
					</div>
					<div
						className={style["value"]}
						onClick={() => {
							if (edit || loading) {
								return;
							}
							setEdit(true);
						}}
					>
						{type === "boolean" ? (
							<TextField
								select
								value={currentValue}
								variant="outlined"
								size="small"
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
							>
								<MenuItem value={"true"}>True</MenuItem>
								<MenuItem value={"false"}>False</MenuItem>
							</TextField>
						) : (
							<AutoWidthTextField
								maxWidth={800}
								value={type === "string" && !edit ? `"${currentValue}"` : currentValue}
								variant="outlined"
								size="small"
								type={["number", "binary", "bigint"].includes(type) ? "number" : "text"}
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
						<SvgIcon path={types[type]} />
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
							<IconButton>
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

const ViewTree = ({ currentPath, onChange, loadData, isExpanded = false, index = 0, goToPath }) => {
	const [actualPath, setActualPath] = useState(currentPath);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [data, setData] = useState(null);
	const [expandChildren, setExpandChildren] = useState([]);
	const [hiddenActionExpandChildren, setHiddenActionExpandChildren] = useState([]);

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

	return !data || (Array.isArray(children?.list) && ["object", "array"].includes(type)) ? (
		<div
			className={style["key-tree"]}
			style={{ "--color-mark": colorMark }}
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
				<div className={style["actions"]}>
					<IconButton>
						<SvgIcon path={mdiPlus} />
					</IconButton>
					<IconButton>
						<SvgIcon path={mdiDelete} />
					</IconButton>
				</div>
			</div>
			{isExpanded && (
				<div className={style["tree"]}>
					{(children?.list ?? [])
						.filter(({ value }) => value !== null)
						.map(({ key, value, type }, i) => {
							return (
								<div key={i}>
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
												currentPath={currentPath.concat([key])}
												onChange={onChange}
												loadData={loadData}
												isExpanded={expandChildren.includes(key)}
												index={index + 1}
												goToPath={goToPath}
											/>
										) : (
											<EditValueChild
												name={key}
												value={value}
												type={type}
												onChange={(newValue) => onChange(key, newValue)}
												goToPath={goToPath}
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

					{((!children?.list && loading) || loadingMore) && (
						<div className={style["loading"]}>
							<Typography variant="body2">Loading...</Typography>
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

			{isExpanded && (
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
			value={value}
			type={type}
			onChange={(newValue) => onChange(key, newValue)}
			goToPath={goToPath}
		/>
	);
};

export const JsonEditor = forwardRef(({ rootDir }, ref) => {
	const [currentPath, setCurrentPath] = useState([rootDir ?? "root"]);

	const [callbackLoadData, setCallbackLoadData] = useState(null);
	const [mutated, setMutated] = useState({});

	const [editPath, setEditPath] = useState(false);

	const cache = useRef(new Map());

	useImperativeHandle(
		ref,
		() => ({
			loadData: (callback) => {
				setCallbackLoadData(() => (typeof callback === "function" ? callback : null));
			},
			mutated: (data) => {
				setMutated(data);
			},
		}),
		[],
	);

	const loadData = (path, isNextMore = false) => {
		if (!isNextMore && cache.current.has(path)) {
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
									setCurrentPath(self.slice(0, i + 1));
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
									setCurrentPath(path);
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
					onChange={(path, value) => {}}
					isExpanded={true}
					goToPath={(path) => {
						if (resolveArrayPath(path) !== resolveArrayPath(currentPath)) {
							setCurrentPath(path);
						}
					}}
				/>
			</div>
		</div>
	);
});

export default JsonEditor;
