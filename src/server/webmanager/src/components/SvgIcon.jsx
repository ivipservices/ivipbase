const SvgIcon = (() => {
	const { SvgIcon } = MaterialUI;

	return ({ path, children, ...props }) => {
		return (
			<SvgIcon {...props}>
				{typeof path === "string" && <path d={path} />}
				{children}
			</SvgIcon>
		);
	};
})();
