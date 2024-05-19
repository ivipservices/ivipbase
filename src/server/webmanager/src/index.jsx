import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { CircularProgress } from "@mui/material";
import MountPage from "./components/MountPage.jsx";
import { initializeApp } from "ivipbase";
import MultiStorager from "./utils/multi-storager.js";

import { Home, Login, DataBase } from "./pages";

import { createTheme, ThemeProvider } from "@mui/material/styles";

const defaultTheme = createTheme({
	palette: {
		mode: "dark",
	},
});

window.goToPage = (page, state) => {
	MultiStorager.DataStorager.set("page", { page: page ?? "home", state: state ?? {} });
};

window.pageState = () => {
	const { state } = MultiStorager.DataStorager.get("page") ?? {};
	return state ?? {};
};

const App = () => {
	const [page, setPage] = useState("home");

	useEffect(() => {
		let time;
		const event = MultiStorager.DataStorager.addListener("page", ({ page }) => {
			if (time) {
				clearTimeout(time);
			}

			setPage("loading");

			time = setTimeout(() => {
				setPage(page);
			}, 400);
		});

		return () => {
			event.stop();
		};
	}, []);

	switch (page) {
		case "home":
			return <Home />;
		case "login":
			return <Login />;
		case "database":
			return <DataBase />;
		case "loading":
			return (
				<MountPage>
					<div className="loading">
						<CircularProgress />
					</div>
				</MountPage>
			);
		default:
			return (
				<MountPage>
					<h1>404</h1>
				</MountPage>
			);
	}
};

const app = initializeApp({
	host: "localhost",
	port: 8080,
	dbname: "",
	bootable: false,
});

app.ready(() => {
	progressBar.style.width = "100%";
	progressBar.style.backgroundColor = colors[colors.length - 1];
	progressBarContent.setAttribute("label", "Conectando ao servidor...");

	const progressElement = document.querySelector("body > #progress");
	if (progressElement) {
		progressElement.remove();
	}

	ReactDOM.render(
		<ThemeProvider theme={defaultTheme}>
			<App />
		</ThemeProvider>,
		document.getElementById("root"),
	);
});
