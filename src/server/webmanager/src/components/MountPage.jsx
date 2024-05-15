const MountPage = ({ title, header, children, isCard }) => {
	return (
		<div className="page">
			<div className="header">
				<div className="feature"></div>
				<div className="content">
					{title && <h1>{title}</h1>}
					{header}
				</div>
			</div>
			<div className={["body", isCard ? "card" : ""].join(" ")}>{children}</div>
		</div>
	);
};
