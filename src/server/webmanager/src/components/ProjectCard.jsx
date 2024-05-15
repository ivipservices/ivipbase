const ProjectCard = ({ title, label, ...props }) => {
	return (
		<div
			className="project-card"
			{...props}
		>
			<h3>{title}</h3>
			<p>{label}</p>
			<div className="space"></div>
			<SvgIcon path={mdi.mdiXml} />
		</div>
	);
};
