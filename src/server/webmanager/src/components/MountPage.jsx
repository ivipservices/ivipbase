const MountPage = (() => {
	const { mdiChevronLeftCircle } = mdi;

	return ({ title, header, toBack, children, isCard }) => {
		React.useEffect(() => {
			document.title = `Painel - ${title}` ?? "Painel de Banco de Dados";
		}, [title]);

		return (
			<div className="page">
				<div className="header">
					<div className="feature"></div>
					<div className="content">
						{title && (
							<h1>
								{typeof toBack === "function" && (
									<SvgIcon
										onClick={toBack}
										path={mdiChevronLeftCircle}
									/>
								)}
								<spna>{title}</spna>
							</h1>
						)}
						{header}
					</div>
				</div>
				<div className={["body", isCard ? "card" : ""].join(" ")}>{children}</div>
			</div>
		);
	};
})();
