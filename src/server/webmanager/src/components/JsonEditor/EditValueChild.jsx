import React, { useEffect, useLayoutEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import style from "./style.module.scss";
import { Typography, Link, TextField, IconButton, MenuItem, CircularProgress } from "@mui/material";
import moment from "moment";
import { mdiDelete, mdiPlus, mdiClose, mdiCheck } from "@mdi/js";
import SvgIcon from "../SvgIcon";
import { ID } from "ivipbase";
import { AutoWidthTextField, TextMaskDate, momentFormat, normalizeValue, palette, types, valueToString } from "./utils";

export const EditValueChild = forwardRef(
	({ isNewChild = false, disabled: _disabled = false, name, value, type, beforeValue, onChange, onRemoved, goToPath, isAdded = false, exists = false, index = 0, inTree = false }, ref) => {
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

		useImperativeHandle(ref, () => ({}), []);

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
	},
);

export default EditValueChild;
