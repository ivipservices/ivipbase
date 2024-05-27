import React, { useEffect, Children, useState, useRef } from "react";
import { Box, Tabs, Tab, CircularProgress } from "@mui/material";
import { mdiChevronLeftCircle } from "@mdi/js";
import SvgIcon from "./SvgIcon.jsx";

export const PageView = ({ label, hidden, disabled, children }) => {
	return children;
};

export const MountPage = ({ title, header, toBack, children, isCard, className, ...props }) => {
	const [views, setViews] = useState([]);
	const [tabValue, setTabValue] = useState(-1);
	const [loading, setLoading] = useState(false);
	const timeRef = useRef(null);

	const setValueView = (value) => {
		clearTimeout(timeRef.current);
		setLoading(() => true);
		timeRef.current = setTimeout(() => {
			setTabValue(() => value);

			timeRef.current = setTimeout(() => {
				setLoading(() => false);
			}, 1000);
		}, 200);
	};

	const handleTabChange = (event, newValue) => {
		setValueView(views[newValue].value);
	};

	useEffect(() => {
		const views = Children.toArray(children)
			.map((view, index) => {
				return view.type === PageView
					? {
							value: index,
							label: view?.props.label ?? "",
							hidden: view?.props.hidden ?? false,
							disabled: view?.props.disabled ?? false,
					  }
					: null;
			})
			.filter((view) => {
				return view !== null;
			});

		setViews(() => {
			return [...views];
		});

		if (tabValue < 0 && views.length > 0) {
			setValueView(views.findIndex(({ hidden }) => hidden !== true));
		}
	}, [children]);

	useEffect(() => {
		document.title = `Painel - ${title}` ?? "Painel de Banco de Dados";
	}, [title]);

	return (
		<div className="page">
			<div className="header">
				<div className="feature"></div>
				<div className="content">
					{title && (
						<div className="title">
							{typeof toBack === "function" && (
								<SvgIcon
									onClick={toBack}
									path={mdiChevronLeftCircle}
								/>
							)}
							{typeof title === "string" ? <h1>{title}</h1> : title}
						</div>
					)}
					{header}
					{views.length > 0 && (
						<Box sx={{ maxWidth: { xs: 320, sm: 480 }, marginTop: "35px" }}>
							<Tabs
								value={views.findIndex(({ value }) => value === tabValue) ?? -1}
								onChange={handleTabChange}
								variant="scrollable"
								scrollButtons="auto"
							>
								{views
									.filter(({ hidden }) => {
										return hidden !== true;
									})
									.map(({ label, disabled }) => {
										return (
											<Tab
												label={label}
												disabled={disabled}
											/>
										);
									})}
							</Tabs>
						</Box>
					)}
				</div>
			</div>
			<div
				{...props}
				className={[className, "body", isCard ? "card" : null].filter((c) => c !== null || c !== undefined).join(" ")}
			>
				{loading ? (
					<div
						style={{
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							padding: "100px 20px",
						}}
					>
						<CircularProgress color="inherit" />
					</div>
				) : (
					Children.toArray(children).filter((view, index) => {
						return view.type !== PageView || index === tabValue;
					})
				)}
			</div>
		</div>
	);
};

export default MountPage;
