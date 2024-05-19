import React, { useEffect, useState, useRef, Fragment } from "react";
import MountPage from "../../components/MountPage";
import { getApp, getAuth } from "ivipbase";
import { Button, ClickAwayListener, Grow, Paper, Popper, MenuItem, MenuList, ListItemIcon, ListItemText } from "@mui/material";
import { mdiMenuDown, mdiDatabaseOutline, mdiAccountMultiple, mdiFolderImage, mdiGoogleAnalytics } from "@mdi/js";
import SvgIcon from "../../components/SvgIcon.jsx";
import style from "./style.module.scss";

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
	const { dbName } = window.pageState();

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

			console.log(auth.currentUser);
		});

		return () => {
			event.stop();
		};
	}, []);

	return (
		<MountPage
			title={<MenuItems />}
			toBack={() => {
				getAuth().signOut();
			}}
			isCard
		></MountPage>
	);
};

export default DataBase;
