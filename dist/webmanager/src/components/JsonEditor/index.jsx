import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import style from "./style.module.scss";
import { Typography, Breadcrumbs, Link, TextField, IconButton } from "@mui/material";
import { mdiPencil, mdiClose, mdiLink, mdiChevronRight } from "@mdi/js";
import SvgIcon from "../SvgIcon";
import { PathInfo } from "ivipbase";
import { getValueType, resolveArrayPath, valueToString } from "./utils.jsx";

import ViewTree from "./ViewTree.jsx";

export const JsonEditor = forwardRef(({ rootDir = "root", path = [] }, ref) => {
	const [currentPath, setCurrentPath] = useState([rootDir ?? "root", ...(path ?? [])]);

	const [callbackLoadData, setCallbackLoadData] = useState(null);
	const [callbackChangeData, setCallbackChangeData] = useState(null);
	const [callbackNewChildres, setCallbackNewChildres] = useState(null);
	const [callbacksubscribeMutated, setCallbacksubscribeMutated] = useState(null);

	const [editPath, setEditPath] = useState(false);

	const [removedPaths, setRemovedPaths] = useState([]);

	const cache = useRef(new Map());
	const subscribeMutated = useRef(new Map());

	const goToPath = (path) => {
		if (resolveArrayPath(path) === resolveArrayPath(currentPath)) {
			return;
		}
		cache.current.clear();
		subscribeMutated.current.clear();
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
			subscribeMutated: (callback) => {
				setCallbacksubscribeMutated(() => (typeof callback === "function" ? callback : null));
			},
		}),
		[],
	);

	useEffect(() => {
		if (typeof callbacksubscribeMutated === "function") {
			const event = callbacksubscribeMutated(resolveArrayPath(currentPath), (path, value) => {
				const currentPath = [rootDir].concat(
					path
						.replace(/\\/gi, "/")
						.replace(/(\[\d+\])/gi, "/$1")
						.split("/")
						.map((item) => (/(\[\d+\])/gi.test(item) ? parseInt(item.replace(/\[|\]/gi, "")) : item)),
				);

				const parentPath = PathInfo.get(path).parentPath;
				const key = PathInfo.get(path).key;

				if (cache.current.has(parentPath)) {
					const data = cache.current.get(parentPath);

					if (data && Array.isArray(data.children?.list)) {
						const index = data.children.list.findIndex((e) => e.key === key);
						if (index !== -1 && "value" in data.children.list[index]) {
							data.children.list[index].value = value;
							data.children.list[index].type = valueToString(value);
							cache.current.set(parentPath, data);
						}
					}
				}

				if (cache.current.has(path)) {
					const data = cache.current.get(parentPath);
					if (data) {
						data.value = value;
						data.type = valueToString(value);
						cache.current.set(path, data);
					}
				}

				subscribeMutated.current.forEach((callback) => {
					callback(currentPath, value, value);
				});
			});

			return () => {
				event?.stop();
			};
		}
	}, [callbacksubscribeMutated, currentPath]);

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
					subscribeMutated={(path, callback) => {
						subscribeMutated.current.set(path, callback);
						return {
							stop: () => {
								subscribeMutated.current.delete(path);
							},
						};
					}}
				/>
			</div>
		</div>
	);
});

export default JsonEditor;
