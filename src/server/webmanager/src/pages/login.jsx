const Login = () => {
	return (
		<MountPage isCard>
			<h1>login</h1>
			<button onClick={() => window.goToPage("home")}>Go to Home</button>
		</MountPage>
	);
};
