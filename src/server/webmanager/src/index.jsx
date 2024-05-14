const Home = ({ goToPage }) => {
	return (
		<div>
			<h1>Início</h1>
			<button onClick={() => goToPage("about")}>Go to About</button>
		</div>
	);
};

const About = ({ goToPage }) => {
	return (
		<div>
			<h1>About</h1>
			<button onClick={() => goToPage("home")}>Go to Home</button>
		</div>
	);
};

const App = () => {
	const [page, goToPage] = useDataStorager("page", "home");

	switch (page) {
		case "home":
			return <Home goToPage={goToPage} />;
		case "about":
			return <About goToPage={goToPage} />;
		default:
			return <div>404</div>;
	}
};
