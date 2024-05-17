const About = () => {
	return (
		<MountPage isCard>
			<h1>About</h1>
			<button onClick={() => window.goToPage("home")}>Go to Home</button>
		</MountPage>
	);
};

window.goToPage = (page, state) => {
	MultiStorager.DataStorager.set("page", { page: page ?? "home", state: state ?? {} });
};

window.pageState = () => {
	const { state } = MultiStorager.DataStorager.get("page") ?? {};
	return state ?? {};
};

const App = (() => {
	const { useState, useEffect } = React;
	const { CircularProgress } = MaterialUI;

	return () => {
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
				}, 1000);
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
})();
