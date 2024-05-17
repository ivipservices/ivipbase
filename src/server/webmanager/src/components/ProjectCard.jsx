const ProjectCard = (() => {
	const { mdiXml } = mdi;

	return ({ title, label, disabled = false, onClick, ...props }) => {
		return (
			<div
				className={["project-card", disabled ? "disabled" : ""].join(" ")}
				{...props}
				onClick={disabled ? undefined : onClick}
			>
				<h3>{title}</h3>
				<p>{label}</p>
				<div className="space"></div>
				<SvgIcon path={mdiXml} />
			</div>
		);
	};
})();
