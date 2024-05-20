import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import style from "./style.module.scss";
import { Typography, Breadcrumbs, Link, TextField, CircularProgress } from "@mui/material";
import { mdiAlphabetical, mdiNumeric, mdiAsterisk, mdiCodeJson, mdiToggleSwitch } from "@mdi/js";
import SvgIcon from "../SvgIcon";

//"binary" | "string" | "unknown" | "object" | "boolean" | "number" | "array" | "date" | "reference" | "bigint" | "dedicated_record"
const types = {
	string: mdiAlphabetical,
	boolean: mdiToggleSwitch,
	number: mdiNumeric,
	binary: mdiNumeric,
	unknown: mdiAsterisk,
	object: mdiCodeJson,
	array: mdiCodeJson,
	date: mdiAlphabetical,
	reference: mdiAlphabetical,
	bigint: mdiNumeric,
	dedicated_record: mdiCodeJson,
};

const EditValueChild = ({ name, value, type, onChange }) => {
	return (
		<div className={style["key-value"]}>
			<div className={style["key"]}>
				<Typography variant="subtitle1">{name}:</Typography>
			</div>
			<div className={style["value"]}>
				<TextField
					value={value}
					variant="outlined"
					size="small"
					InputProps={{
						readOnly: true,
					}}
				/>
			</div>
			<div className={style["type"]}>
				<SvgIcon path={types[type]} />
			</div>
		</div>
	);
};

const ViewTree = ({ currentPath, onChange, loadData, forceLoadData = false }) => {
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState(null);

	const getData = () => {
		if (typeof loadData !== "function") {
			setLoading(false);
			return;
		}

		setLoading(true);
		Promise.race([loadData(currentPath.join("/"))]).then((dataJson) => {
			setData(dataJson);
			setLoading(false);
		});
	};

	useEffect(() => {
		if (!forceLoadData) {
			return;
		}

		const time = setTimeout(() => {
			getData();
		}, 1000);

		return () => {
			clearTimeout(time);
		};
	}, [loadData, currentPath, forceLoadData]);

	const { key, type, value, children } = data ?? {};

	console.log(data);

	return !data ? null : children && Array.isArray(children.list) ? (
		<div>
			<Typography variant="subtitle1">{key}</Typography>
			<div className={style["tree-structure"]}>
				{children.list.map(({ key, value, type }, i) => {
					return (
						<div key={i}>
							<div className={style["mark"]}></div>
							<div className={style["content"]}>
								<EditValueChild
									name={key}
									value={value}
									type={type}
									onChange={(newValue) => onChange(key, newValue)}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	) : (
		<EditValueChild
			name={key}
			value={value}
			onChange={(newValue) => onChange(key, newValue)}
		/>
	);
};

export const JsonEditor = forwardRef(({ rootDir }, ref) => {
	const [currentPath, setCurrentPath] = useState([rootDir ?? "root"]);

	const [loadData, setLoadData] = useState(null);
	const [mutated, setMutated] = useState({});

	useImperativeHandle(
		ref,
		() => ({
			loadData: (callback) => {
				setLoadData(() => (typeof callback === "function" ? callback : null));
			},
			mutated: (data) => {
				setMutated(data);
			},
		}),
		[],
	);

	return (
		<div className={style["main"]}>
			<div
				className={style["header"]}
				onClick={(event) => {
					event.preventDefault();
				}}
			>
				<Breadcrumbs aria-label="breadcrumb">
					{currentPath.map((iten, i, self) => {
						const isLink = i < self.length - 1;
						return isLink ? (
							<Link
								underline="hover"
								color="inherit"
								onClick={() => {
									setCurrentPath(self.slice(0, i + 1));
								}}
							>
								{iten}
							</Link>
						) : (
							<Typography color="text.primary">{iten}</Typography>
						);
					})}
				</Breadcrumbs>
			</div>
			<div className={style["content"]}>
				<ViewTree
					currentPath={currentPath}
					loadData={loadData}
					onChange={(path, value) => {}}
					forceLoadData={true}
				/>
			</div>
		</div>
	);
});

export default JsonEditor;
