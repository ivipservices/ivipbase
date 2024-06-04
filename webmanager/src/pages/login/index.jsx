import React, { useState, useEffect } from "react";
import { Box, Avatar, Typography, TextField, FormControlLabel, Checkbox, Button, Grid, Link, CircularProgress } from "@mui/material";
import { mdiLockOutline } from "@mdi/js";
import MountPage from "../../components/MountPage.jsx";
import SvgIcon from "../../components/SvgIcon.jsx";
import style from "./style.module.scss";
import { getApp, getAuth } from "ivipbase";

export const Login = () => {
	const [loading, setLoading] = useState(true);
	const { dbName } = window.pageState();

	const handleSubmit = (event) => {
		event.preventDefault();
		setLoading(true);

		const data = new FormData(event.currentTarget);
		const info = {
			dbname: dbName,
			username: data.get("username"),
			password: data.get("password"),
		};

		getApp().ready(() => {
			const auth = getAuth();

			if (auth.currentUser) {
				return;
			}

			auth.signInWithUsernameAndPassword(info.username, info.password)
				.then((user) => {
					window.goToPage("database", { dbName });
				})
				.catch((err) => {
					console.error(err);
					setLoading(false);
				});
		});
	};

	useEffect(() => {
		const time = setTimeout(() => {
			const app = getApp();

			app.reset({
				dbname: dbName,
				bootable: true,
			});

			app.ready(() => {
				const auth = getAuth();

				auth.ready((currentUser) => {
					if (!currentUser) {
						return setLoading(false);
					}

					window.goToPage("database", { dbName });
				});
			});
		}, 1000);

		return () => clearTimeout(time);
	}, []);

	return (
		<MountPage
			title={`Login - ${dbName}`}
			toBack={() => {
				window.goToPage("home");
			}}
		>
			<div className={style["card"]}>
				<Box
					className={style["box"]}
					sx={{ mt: 1 }}
				>
					<Avatar sx={{ m: 1, bgcolor: "warning.dark", width: 65, height: 65 }}>
						{loading ? (
							<CircularProgress />
						) : (
							<SvgIcon
								path={mdiLockOutline}
								style={{ width: 36, height: 36 }}
							/>
						)}
					</Avatar>
					<Typography
						component="h1"
						variant="h5"
						sx={{ marginBottom: "20px" }}
					>
						Sign in
					</Typography>
					<Box
						component="form"
						onSubmit={handleSubmit}
						noValidate
						sx={{ mt: 1 }}
					>
						<TextField
							margin="normal"
							required
							fullWidth
							id="dbname"
							label="Database Name"
							name="dbname"
							autoComplete="dbname"
							autoFocus
							disabled
							value={dbName}
							sx={{ display: "none" }}
						/>
						<TextField
							margin="normal"
							required
							fullWidth
							id="username"
							label="Username"
							name="username"
							autoComplete="username"
							autoFocus
							disabled={loading}
						/>
						<TextField
							margin="normal"
							required
							fullWidth
							name="password"
							label="Password"
							type="password"
							id="password"
							autoComplete="current-password"
							disabled={loading}
						/>
						<FormControlLabel
							control={
								<Checkbox
									value="remember"
									color="primary"
									checked
								/>
							}
							label="Remember me"
							disabled={loading}
						/>
						<Button
							type="submit"
							fullWidth
							variant="contained"
							sx={{ mt: 3, mb: 2 }}
							disabled={loading}
						>
							Sign In
						</Button>
						<Grid container>
							<Grid
								item
								xs
							>
								<Link
									variant="body2"
									onClick={() => true}
									disabled={loading}
								>
									Forgot password?
								</Link>
							</Grid>
							<Grid item>
								<Link
									variant="body2"
									onClick={() => true}
									disabled={loading}
								>
									{"Don't have an account? Sign Up"}
								</Link>
							</Grid>
						</Grid>
					</Box>
				</Box>
			</div>
		</MountPage>
	);
};

export default Login;
