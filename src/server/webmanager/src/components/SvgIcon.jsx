const SvgIcon = ({ path, children, ...props }) => {
	return (
		<MaterialUI.SvgIcon {...props}>
			{typeof path === "string" && <path d={path} />}
			{children}
		</MaterialUI.SvgIcon>
	);
};
