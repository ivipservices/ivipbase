import React, { useEffect, useState, useRef, Fragment } from "react";
import MountPage from "../../components/MountPage";
import { getApp, getAuth, getDatabase } from "ivipbase";
import { Box, Button, ClickAwayListener, Grow, Paper, Popper, MenuItem, MenuList, ListItemIcon, ListItemText, Tabs, Tab } from "@mui/material";
import { mdiMenuDown, mdiDatabaseOutline, mdiAccountMultiple, mdiFolderImage, mdiGoogleAnalytics } from "@mdi/js";
import SvgIcon from "../../components/SvgIcon.jsx";
import style from "./style.module.scss";
import JsonEditor from "../../components/JsonEditor/index.jsx";

const options = [
	{ id: 0, label: "Realtime Database", icon: mdiDatabaseOutline },
	{ id: 1, label: "Authentication", disabled: true, icon: mdiAccountMultiple },
	{ id: 2, label: "Storage", disabled: true, icon: mdiFolderImage },
	{ id: 3, label: "Performance", disabled: true, icon: mdiGoogleAnalytics },
];

const MenuItems = ({}) => {
	const [open, setOpen] = useState(false);
	const anchorRef = useRef(null);
	const [selectedIndex, setSelectedIndex] = useState(0);

	const handleMenuItemClick = (event, index) => {
		setSelectedIndex(index);
		setOpen(false);
	};

	const handleToggle = () => {
		setOpen((prevOpen) => !prevOpen);
	};

	const handleClose = (event) => {
		if (anchorRef.current && anchorRef.current.contains(event.target)) {
			return;
		}

		setOpen(false);
	};

	return (
		<Fragment>
			<Button
				size="large"
				onClick={handleToggle}
				startIcon={<SvgIcon path={options[selectedIndex]?.icon ?? mdiDatabaseOutline} />}
				endIcon={<SvgIcon path={mdiMenuDown} />}
				variant="text"
				color="inherit"
				ref={anchorRef}
			>
				{options[selectedIndex]?.label ?? ""}
			</Button>
			<Popper
				sx={{
					zIndex: 1,
				}}
				open={open}
				anchorEl={anchorRef.current}
				role={undefined}
				transition
				disablePortal
			>
				{({ TransitionProps, placement }) => (
					<Grow
						{...TransitionProps}
						style={{
							transformOrigin: placement === "bottom" ? "center top" : "center bottom",
						}}
					>
						<Paper>
							<ClickAwayListener onClickAway={handleClose}>
								<MenuList
									id="split-button-menu"
									autoFocusItem
								>
									{options.map(({ id, label, disabled = false, icon = mdiDatabaseOutline }, index) => (
										<MenuItem
											key={id}
											disabled={disabled}
											selected={index === selectedIndex}
											onClick={(event) => handleMenuItemClick(event, index)}
										>
											<ListItemIcon>
												<SvgIcon path={icon} />
											</ListItemIcon>
											<ListItemText>{label}</ListItemText>
										</MenuItem>
									))}
								</MenuList>
							</ClickAwayListener>
						</Paper>
					</Grow>
				)}
			</Popper>
		</Fragment>
	);
};

export const DataBase = () => {
	const [tabValue, setTabValue] = useState(0);
	const { dbName } = window.pageState();
	const refDatabaseEditor = useRef();

	const handleTabChange = (event, newValue) => {
		setTabValue(newValue);
	};

	useEffect(() => {
		const auth = getAuth();
		let event = auth.onAuthStateChanged((user) => {
			if (!user) {
				window.goToPage("login", { dbName });
				event.stop();
			}
		});

		auth.ready(() => {
			if (!auth.currentUser) {
				window.goToPage("login", { dbName });
				event.stop();
			}
		});

		return () => {
			event.stop();
		};
	}, []);

	useEffect(() => {
		if (!refDatabaseEditor.current) return;
		const db = getDatabase();

		refDatabaseEditor.current.loadData((path, { isNext = false, child_limit = 50, child_skip = 0, length = 0 }) => {
			return new Promise((resolve, reject) => {
				db.ready(() => {
					db.ref(path)
						.reflect("info", { child_limit, child_skip: isNext ? child_skip + child_limit : child_skip })
						.then((info) => {
							info.key = info.key === "" ? dbName : info.key;
							info.context = {
								child_limit,
								child_skip: isNext ? child_skip + child_limit : child_skip,
								length: length + (info.children?.list ?? []).length,
							};
							resolve(info);
						});
				}).catch(reject);
			});
		});

		refDatabaseEditor.current.onChange(async (path, value, type) => {
			if (value !== undefined) {
				if (value !== null) {
					await db.ref(path).update(value);
				} else {
					await db.ref(path).remove();
				}
			}
			return Promise.resolve(value);
		});

		refDatabaseEditor.current.onNewChildres(async (path, value) => {
			if (value !== undefined) {
				await db.ref(path).update(value);
			}
			return Promise.resolve(value);
		});
	}, [refDatabaseEditor.current]);

	return (
		<MountPage
			title={<MenuItems />}
			toBack={() => {
				getAuth().signOut();
			}}
			isCard
			header={
				<Box sx={{ maxWidth: { xs: 320, sm: 480 }, marginTop: "35px" }}>
					<Tabs
						value={tabValue}
						onChange={handleTabChange}
						variant="scrollable"
						scrollButtons="auto"
						aria-label="scrollable auto tabs example"
					>
						<Tab label="Dados" />
						<Tab
							label="Regras"
							disabled
						/>
						<Tab
							label="Backups"
							disabled
						/>
						<Tab
							label="Uso"
							disabled
						/>
					</Tabs>
				</Box>
			}
		>
			<JsonEditor
				ref={refDatabaseEditor}
				rootDir={dbName}
			/>
		</MountPage>
	);
};

export default DataBase;
