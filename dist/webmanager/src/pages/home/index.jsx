import React, { useEffect } from "react";
import { getApp } from "ivipbase";
import { CircularProgress } from "@mui/material";
import MountPage from "../../components/MountPage.jsx";
import ProjectCard from "../../components/ProjectCard.jsx";
import { useDataStorager } from "../../utils/multi-storager.js";

export const Home = () => {
	const [projects, setProjects] = useDataStorager("projects", null);

	useEffect(() => {
		if (Array.isArray(projects) && projects.length > 0) {
			return;
		}

		const time = setTimeout(() => {
			const app = getApp();

			app.ready(() => {
				app.projects().then((list) => {
					setProjects([...list]);
				});
			}).catch((err) => {
				setProjects([
					{
						name: "Sem projetos",
						description: "Não há projetos disponíveis no momento.",
						disabled: true,
					},
				]);
			});
		}, 1000);

		return () => clearTimeout(time);
	}, [projects]);

	return (
		<MountPage title={"Projetos"}>
			{!projects && (
				<div className="loading">
					<CircularProgress />
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
					{projects.map(({ name, description, disabled = false }, i) => {
						return (
							<ProjectCard
								key={i}
								title={name}
								label={description}
								style={{
									margin: 10,
								}}
								onClick={() => window.goToPage("login", { dbName: name })}
								disabled={disabled}
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

export default Home;
