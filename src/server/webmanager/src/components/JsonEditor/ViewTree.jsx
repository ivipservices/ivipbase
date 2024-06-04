import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import style from "./style.module.scss";
import { Box, Typography, Link, Button, IconButton, CircularProgress } from "@mui/material";
import { mdiArrowDownDropCircle, mdiArrowRightDropCircle, mdiDelete, mdiPlus, mdiChevronDown } from "@mdi/js";
import SvgIcon from "../SvgIcon";
import { ID } from "ivipbase";
import { getValueType, normalizeValue, palette, resolveArrayPath, valueToString } from "./utils";
import EditValueChild from "./EditValueChild.jsx";

export const ViewTree = ({ currentPath, onChange, onNewChildres, onRemoved, checkRemoved, loadData, isExpanded = false, index = 0, goToPath, prevData, subscribeMutated }) => {
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

	const subscribeMutatedRef = useRef(new Map());

	const emitNotify = (event, isKey = false) => {
		if (!mainRef.current) {
			return;
		}

		const classes = {
			remove: style["removed"],
			add: style["added"],
			change: isKey ? style["changed_key"] : style["changed"],
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

	useEffect(() => {
		if (typeof subscribeMutated === "function") {
			const event = subscribeMutated(resolveArrayPath(actualPath), (path, value) => {
				const isPathValid = resolveArrayPath(path).startsWith(resolveArrayPath(actualPath));
				const isPathExact = resolveArrayPath(path) === resolveArrayPath(actualPath);
				const isChild = isPathValid && path.length === actualPath.length + 1;

				if (isPathValid) {
					if (!isPathExact) {
						emitNotify("change", true);
					} else if (isChild) {
						setData((data) => {
							if (!Array.isArray(data?.children?.list)) {
								return data;
							}

							const key = path[path.length - 1];
							const type = getValueType(value);

							const index = data.children.list.findIndex((it) => it.key === key);

							beforeValues.current[key] = data.children.list[index]?.value ?? "";

							data.children.list.unshift({ key, value, type });
							data.children.list = data.children.list.filter(({ key }, i, l) => {
								return l.findIndex((it) => it.key === key) === i;
							});

							return { ...data };
						});
					} else if (value === null) {
						emitNotify("remove");
					} else {
						emitNotify("change", true);
					}
				}

				subscribeMutatedRef.current.forEach((callback) => {
					callback(path, value);
				});
			});

			return () => {
				event?.stop();
			};
		}
	}, [actualPath]);

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

	const subscribeMutatedHandler = (path, callback) => {
		subscribeMutatedRef.current.set(path, callback);
		return {
			stop: () => {
				subscribeMutatedRef.current.delete(path);
			},
		};
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
												subscribeMutated={subscribeMutatedHandler}
											/>
										) : (
											<EditValueChild
												parentPath={actualPath}
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
												subscribeMutated={subscribeMutatedHandler}
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
			parentPath={actualPath.slice(0, -1)}
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
			subscribeMutated={subscribeMutatedHandler}
		/>
	);
};

export default ViewTree;
