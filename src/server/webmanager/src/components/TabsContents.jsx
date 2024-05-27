import React, { useEffect, useState, Children } from "react";

import { Container, CircularProgress, Tabs, Tab } from "@mui/material";

import style from "./style.module.scss";

const TabsContents = ({ className, children, ...props }) => {
	const [value, setValue] = useState(-1);
	const [views, setViews] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setViews(() => {
			return Children.toArray(children).map((view) => {
				return {
					label: view?.props.label ?? "",
					hidden: view?.props.hidden ?? false,
					disabled: view?.props.disabled ?? false,
				};
			});
		});

		if (value < 0) {
			setValue(0);
		}
	}, [children, value]);

	useEffect(() => {
		setLoading(() => true);

		const time = setTimeout(() => {
			setLoading(() => false);
		}, 1000);

		return () => {
			clearTimeout(time);
		};
	}, [value]);

	const handleChange = (event, newValue) => {
		setLoading(() => true);
		setValue(newValue);
	};

	return (
		<div
			className={[style["TabsContents"], className].filter((s) => typeof s === "string").join(" ")}
			{...props}
		>
			<Tabs
				value={value}
				onChange={handleChange}
				scrollButtons="auto"
				variant="scrollable"
			>
				{views
					.filter(({ hidden }) => hidden !== true)
					.map(({ label, disabled }, i) => {
						return (
							<Tab
								key={`TabsContents-${i}`}
								label={label}
								disabled={disabled}
							/>
						);
					})}
			</Tabs>
			<Container className={[style["TabContent"], loading ? style["loading"] : ""].join(" ")}>
				{loading ? (
					<CircularProgress color="inherit" />
				) : (
					Children.toArray(children).filter((view, index) => {
						return index === value;
					})
				)}
			</Container>
		</div>
	);
};

export default TabsContents;
