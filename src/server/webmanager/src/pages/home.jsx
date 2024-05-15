const Home = ({ goToPage }) => {
	const [projects, setProjects] = React.useState(null);

	React.useEffect(() => {
		const time = setTimeout(() => {
			setProjects([
				{ name: "db-root", description: "Project 1" },
				{ name: "db-1", description: "Project 2" },
				{ name: "db-2", description: "Project 3" },
				{ name: "db-3", description: "Project 4" },
				{ name: "db-4", description: "Project 5" },
			]);
		}, 2000);

		return () => clearTimeout(time);
	}, []);

	return (
		<MountPage title={"Projetos"}>
			{!projects && (
				<div className="loading">
					<MaterialUI.CircularProgress />
				</div>
			)}
			{Array.isArray(projects) && (
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						justifyContent: "center",
						alignItems: "center",
						flexWrap: "wrap",
					}}
				>
					{projects.map(({ name, description }, i) => {
						return (
							<ProjectCard
								key={i}
								title={name}
								label={description}
								style={{
									margin: 10,
								}}
								onClick={() => window.goToPage("login", { dbName: name })}
							/>
						);
					})}
					<div
						style={{
							opacity: 0,
							width: 290,
							height: 0,
							margin: 10,
						}}
					></div>
					<div
						style={{
							opacity: 0,
							width: 290,
							height: 0,
							margin: 10,
						}}
					></div>
					<div
						style={{
							opacity: 0,
							width: 290,
							height: 0,
							margin: 10,
						}}
					></div>
					<div
						style={{
							opacity: 0,
							width: 290,
							height: 0,
							margin: 10,
						}}
					></div>
				</div>
			)}
		</MountPage>
	);
};
