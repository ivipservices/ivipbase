import React, { useEffect, useState, useRef, Fragment } from "react";
import MountPage, { PageView } from "../../components/MountPage";
import { getApp, getAuth, getDatabase } from "ivipbase";
import { Button, ClickAwayListener, Grow, Paper, Popper, MenuItem, MenuList, ListItemIcon, ListItemText } from "@mui/material";
import { mdiMenuDown, mdiDatabaseOutline, mdiAccountMultiple, mdiFolderImage, mdiCodeBracesBox } from "@mdi/js";
import SvgIcon from "../../components/SvgIcon.jsx";
import style from "./style.module.scss";
import JsonEditor from "../../components/JsonEditor/index.jsx";
import Performance from "./Performance.jsx";

const options = [
	{ id: 0, label: "Realtime Database", icon: mdiDatabaseOutline },
	{ id: 1, label: "Authentication", disabled: true, icon: mdiAccountMultiple },
	{ id: 2, label: "Storage", disabled: true, icon: mdiFolderImage },
	{ id: 3, label: "Functions", disabled: true, icon: mdiCodeBracesBox },
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

const DataBaseEditor = ({ dbName, authToken }) => {
	const refDatabaseEditor = useRef();

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

		refDatabaseEditor.current.subscribeMutated((path, callback) => {
			// Create 3 subscriptions, combine them into 1
			path = path ?? "";
			const ref = db.ref(path);

			// Subscribe to events
			const mutated = ref.on("mutated").subscribe((snap) => {
				const mutatedPath = snap.ref.path;
				const newValue = snap.val();
				callback(mutatedPath, newValue);
			});

			return {
				stop() {
					mutated.stop();
				},
			};
		});

		refDatabaseEditor.current.download((path) => {
			if (typeof authToken !== "string" || authToken.trim() === "") {
				return;
			}

			const link = document.createElement("a");

			const url = `/export/${dbName}/${path}?format=json&auth_token=${authToken}`;
			link.download = url;
			link.href = url;
			link.click();
		});

		refDatabaseEditor.current.upload((path) => {
			let upload = document.getElementById("upload");

			if (upload) {
				document.body.removeChild(upload);
			}

			upload = document.createElement("input");
			upload.style.display = "none";
			upload.id = "upload";
			document.body.appendChild(upload);
			upload.type = "file";
			upload.accept = ".json";

			upload.onchange = async (event) => {
				const file = event.target.files[0];
				const reader = new FileReader();
				reader.onload = async (event) => {
					document.body.removeChild(upload);
					const data = event.target.result;
					let end = 0;
					await db.ref(path).import(
						(length) => {
							return new Promise((resolve, reject) => {
								end += length;
								resolve(data.slice(end - length, end));
							});
						},
						{ suppress_events: false },
					);
				};
				reader.readAsText(file);
			};
			upload.click();
		});
	}, [refDatabaseEditor.current]);

	return (
		<JsonEditor
			ref={refDatabaseEditor}
			rootDir={dbName}
		/>
	);
};

export const DataBase = () => {
	const { dbName } = window.pageState();
	const [authToken, setAuthToken] = useState(null);

	useEffect(() => {
		let event;

		getApp().ready(() => {
			const auth = getAuth();
			event = auth.onAuthStateChanged((user) => {
				if (!user) {
					window.goToPage("login", { dbName });
					event.stop();
				}
			});

			auth.ready(() => {
				if (!auth.currentUser) {
					window.goToPage("login", { dbName });
					event.stop();
				} else {
					setAuthToken(auth.currentUser.accessToken);
				}
			});
		});

		return () => {
			event?.stop();
		};
	}, []);

	return (
		<MountPage
			title={<MenuItems />}
			toBack={() => {
				getAuth().signOut();
			}}
			isCard
			style={{
				minHeight: "400px",
			}}
		>
			<PageView label="Dados">
				<DataBaseEditor
					dbName={dbName}
					authToken={authToken}
				/>
			</PageView>
			<PageView
				label="Regras"
				disabled
			></PageView>
			<PageView
				label="Backups"
				disabled
			></PageView>
			<PageView label="Uso">
				<Performance />
			</PageView>
		</MountPage>
	);
};

export default DataBase;
